import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  NotificationPermissionPrompt,
  type NotificationPermissionPromptMode,
} from './NotificationPermissionPrompt';
import {
  clearPushPromptSessionDismiss,
  dismissPushPromptForSession,
  enablePushNotifications,
  getPushNotificationStatus,
  shouldShowPushPrompt,
  wasPushPromptDismissedThisSession,
} from '../lib/pushNotifications';

/**
 * After login:
 * - Always re-sync the push subscription when permission is already granted.
 * - Otherwise show Enable Notifications until the subscription is saved on the server.
 * Background (other-app) reminders only work after a successful Enable.
 */
export function PushNotificationBootstrap() {
  const { user, loading } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptMode, setPromptMode] = useState<NotificationPermissionPromptMode>('enable');
  const [busy, setBusy] = useState(false);

  /**
   * Decides whether the first-login prompt should appear, or silently re-subscribe.
   */
  const evaluatePrompt = useCallback(async () => {
    if (loading || !user) {
      setShowPrompt(false);
      return;
    }

    try {
      const status = await getPushNotificationStatus();

      console.log('[PushBootstrap] status after login', {
        permission:
          typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
        enabled: status.enabled,
        hasBrowserSubscription: status.hasBrowserSubscription,
        savedOnServer: status.savedOnServer,
        serviceWorker: 'serviceWorker' in navigator,
      });

      // Permission already granted — always ensure this user's subscription is on the server.
      if (status.permission === 'granted') {
        if (!status.enabled) {
          console.log('[PushBootstrap] re-syncing push subscription for logged-in user');
          await enablePushNotifications();
        }
        setShowPrompt(false);
        return;
      }

      if (status.enabled) {
        setShowPrompt(false);
        return;
      }

      const shouldShow = await shouldShowPushPrompt();
      if (!shouldShow) {
        setShowPrompt(false);
        return;
      }

      setPromptMode(status.permission === 'denied' ? 'blocked' : 'enable');
      setShowPrompt(true);
    } catch (error) {
      console.warn('[Push] Failed to evaluate notification prompt:', error);
      if (wasPushPromptDismissedThisSession()) {
        setShowPrompt(false);
        return;
      }
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        setPromptMode('enable');
        setShowPrompt(true);
      } else if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'denied'
      ) {
        setPromptMode('blocked');
        setShowPrompt(true);
      } else {
        setShowPrompt(false);
      }
    }
  }, [user?.id, loading]);

  useEffect(() => {
    if (!user) {
      clearPushPromptSessionDismiss();
      setShowPrompt(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void evaluatePrompt();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [evaluatePrompt, user]);

  /**
   * Periodically re-saves the subscription while the tab is open so reminders
   * keep working after SW updates / token refreshes.
   */
  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        return;
      }
      void enablePushNotifications().catch((error) => {
        console.warn('[PushBootstrap] periodic sync failed:', error);
      });
    }, 5 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, [user?.id]);

  /**
   * User clicked Enable — register SW, requestPermission, subscribe, save to MongoDB.
   */
  async function handleEnable(): Promise<void> {
    setBusy(true);
    try {
      const status = await enablePushNotifications();
      if (status.enabled) {
        setShowPrompt(false);
        window.alert(
          'Notifications enabled. You will get appointment reminders even when ARS is closed or you are in another app.',
        );
        return;
      }
      setPromptMode(
        typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'blocked'
          : 'enable',
      );
      setShowPrompt(true);
    } catch (error) {
      console.warn('[Push] Enable from prompt failed:', error);
      const denied =
        typeof Notification !== 'undefined' && Notification.permission === 'denied';
      if (denied) {
        setPromptMode('blocked');
        setShowPrompt(true);
      } else {
        window.alert(
          error instanceof Error
            ? error.message
            : 'Could not enable notifications. Open Profile › Settings to try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  /**
   * User dismissed the prompt for this session — can show again after logout/login.
   */
  function handleNotNow(): void {
    dismissPushPromptForSession();
    setShowPrompt(false);
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <NotificationPermissionPrompt
      mode={promptMode}
      busy={busy}
      onAllow={() => {
        void handleEnable();
      }}
      onNotNow={handleNotNow}
    />
  );
}
