import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing, Loader2, RefreshCw } from 'lucide-react';
import {
  enablePushNotifications,
  getPushNotificationStatus,
  sendTestPushNotification,
  type PushNotificationStatus,
} from '../lib/pushNotifications';

/**
 * Profile > Settings panel for browser push notification status and actions.
 */
export function NotificationSettingsPanel(): React.ReactElement {
  const [status, setStatus] = useState<PushNotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reloads browser + server notification status.
   */
  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getPushNotificationStatus();
      setStatus(next);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load notification status',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  /**
   * Enables notifications (SW + permission + subscribe + Mongo save).
   */
  async function handleEnable(): Promise<void> {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const next = await enablePushNotifications();
      setStatus(next);
      setMessage(
        next.enabled
          ? 'Notifications enabled. You will receive push alerts on this device.'
          : 'Could not fully enable notifications on this device.',
      );
    } catch (enableError: unknown) {
      setError(
        enableError instanceof Error ? enableError.message : 'Failed to enable notifications',
      );
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Sends an immediate server-side test push to this user.
   */
  async function handleTest(): Promise<void> {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await sendTestPushNotification();
      setMessage(
        result.delivered > 0
          ? `Test notification sent (${result.delivered} device${result.delivered === 1 ? '' : 's'}).`
          : result.message,
      );
      await refreshStatus();
    } catch (testError: unknown) {
      setError(
        testError instanceof Error ? testError.message : 'Failed to send test notification',
      );
    } finally {
      setBusy(false);
    }
  }

  const enabled = Boolean(status?.enabled);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Notifications</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Push alerts on this device — including when you are in another app.
            Status must show Enabled ✅. Use Send Test Notification to verify.
            On your phone: Install ARS App → Enable Notifications there too.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshStatus()}
          disabled={loading || busy}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          aria-label="Refresh notification status"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
        {loading && !status ? (
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {enabled ? 'Enabled ✅' : 'Disabled ❌'}
          </p>
        )}
        {status && !status.supported && (
          <p className="mt-1 text-xs text-amber-700">
            {typeof window !== 'undefined' && !window.isSecureContext
              ? 'Phone push needs HTTPS. On the PC run: ngrok http 5174 — then open the https://….ngrok-free.app link on your phone, log in, and Enable Notifications there. Plain http://192.168… cannot enable background push.'
              : 'This browser does not support Web Push.'}
          </p>
        )}
        {status?.permission === 'denied' && (
          <p className="mt-1 text-xs text-red-600">
            Permission is blocked in the browser. Open site settings and allow notifications,
            then click Enable Notifications.
          </p>
        )}
      </div>

      {message && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy || enabled}
          onClick={() => void handleEnable()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0969a9] px-4 text-sm font-bold text-white hover:bg-[#075a91] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {enabled ? 'Notifications Enabled' : 'Enable Notifications'}
        </button>

        <button
          type="button"
          disabled={busy || !enabled}
          onClick={() => void handleTest()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#0969a9]/30 bg-white px-4 text-sm font-semibold text-[#0969a9] hover:bg-[#0969a9]/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Send Test Notification
        </button>
      </div>
    </section>
  );
}
