import { getAuthToken } from './api';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';
import { registerArsServiceWorker } from '../pwa';

/** Set only after notifications are successfully enabled (SW + permission + subscription saved). */
const PUSH_ONBOARDED_KEY = 'ars-push-onboarded-v1';

/** "Not now" for the current browser tab/session — cleared on logout / new session. */
const PUSH_DISMISS_SESSION_KEY = 'ars-push-prompt-dismissed-session';

/** Legacy keys that blocked the prompt even when notifications were never enabled. */
const PUSH_PROMPT_LEGACY_KEYS = ['ars-push-prompt-v2', 'ars-push-prompt-v1'];

export type PushPermissionState = NotificationPermission | 'unsupported';

export interface PushNotificationStatus {
  supported: boolean;
  permission: PushPermissionState;
  hasBrowserSubscription: boolean;
  savedOnServer: boolean;
  enabled: boolean;
  /** True after a successful enable on this device (do not auto-prompt again). */
  onboarded: boolean;
  /** @deprecated Prefer onboarded — kept for settings UI compatibility. */
  promptAsked: boolean;
}

/**
 * Converts a URL-safe base64 VAPID key into a Uint8Array for PushManager.subscribe.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Clears legacy "prompt asked" flags that prevented onboarding before a successful enable.
 */
function clearLegacyPromptFlags(): void {
  try {
    for (const key of PUSH_PROMPT_LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Returns whether the browser supports service worker push subscriptions.
 */
/**
 * True when the page can use Service Workers / Web Push.
 * Phones on plain HTTP LAN (e.g. http://192.168.x.x) are not a secure context —
 * only localhost or HTTPS (ngrok / production) work for background push.
 */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Returns whether notifications were successfully enabled on this device.
 */
export function wasPushOnboarded(): boolean {
  clearLegacyPromptFlags();
  try {
    return localStorage.getItem(PUSH_ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Marks notifications as successfully enabled so the auto prompt does not return.
 */
export function markPushOnboarded(): void {
  try {
    localStorage.setItem(PUSH_ONBOARDED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * @deprecated Use markPushOnboarded — only call after a successful enable.
 */
export function markPushPromptAsked(): void {
  markPushOnboarded();
}

/**
 * Returns whether the user dismissed the prompt with Not now in this tab.
 */
export function wasPushPromptDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(PUSH_DISMISS_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Soft-dismisses the onboarding prompt until the next browser session / logout.
 */
export function dismissPushPromptForSession(): void {
  try {
    sessionStorage.setItem(PUSH_DISMISS_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Clears the session dismiss so a fresh login can show the prompt again.
 */
export function clearPushPromptSessionDismiss(): void {
  try {
    sessionStorage.removeItem(PUSH_DISMISS_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Builds authenticated JSON fetch headers.
 */
function authHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetches the server VAPID public key.
 */
async function fetchVapidPublicKey(): Promise<string> {
  const response = await fetch(`${resolveApiBaseUrl()}/api/push/vapid-public-key`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to load push configuration from the server');
  }

  const json = await response.json();
  const publicKey = json?.data?.publicKey;
  if (!publicKey || typeof publicKey !== 'string') {
    throw new Error('Push is not configured on the server (missing VAPID keys)');
  }
  return publicKey;
}

/**
 * Saves the browser PushSubscription on the backend for the signed-in user.
 */
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const response = await fetch(`${resolveApiBaseUrl()}/api/push/subscribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.error?.message || 'Failed to save push subscription');
  }
}

/**
 * Ensures a service worker registration is available for push.
 * Always (re)registers the correct Vite PWA SW URL before permission / subscribe.
 */
export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser.');
  }

  const registered = await registerArsServiceWorker();
  if (!registered) {
    throw new Error(
      'Service Worker could not be registered. Use http://localhost (or HTTPS) and reload the page.',
    );
  }

  // Wait until an active worker is controlling or at least installed.
  const ready = await navigator.serviceWorker.ready;
  return ready.active ? ready : registered;
}

/**
 * Reads browser + server push status for the current user/device.
 */
export async function getPushNotificationStatus(): Promise<PushNotificationStatus> {
  clearLegacyPromptFlags();
  const onboarded = wasPushOnboarded();

  if (!isWebPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      hasBrowserSubscription: false,
      savedOnServer: false,
      enabled: false,
      onboarded,
      promptAsked: onboarded,
    };
  }

  const permission = Notification.permission;
  let hasBrowserSubscription = false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      hasBrowserSubscription = Boolean(subscription);
    }
  } catch {
    hasBrowserSubscription = false;
  }

  let savedOnServer = false;
  if (getAuthToken()) {
    try {
      const response = await fetch(`${resolveApiBaseUrl()}/api/push/status`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const json = await response.json();
        savedOnServer = Boolean(json?.data?.subscribed);
      }
    } catch {
      savedOnServer = false;
    }
  }

  const enabled =
    permission === 'granted' && hasBrowserSubscription && savedOnServer;

  // Only treat as onboarded when the subscription is actually saved for push delivery.
  if (enabled && !onboarded) {
    markPushOnboarded();
  }

  // If we previously marked onboarded but the server has no subscription, clear it
  // so the Enable prompt / silent re-subscribe can run again.
  if (onboarded && permission === 'granted' && !savedOnServer) {
    try {
      localStorage.removeItem('ars-push-onboarded-v1');
    } catch {
      /* ignore */
    }
  }

  return {
    supported: true,
    permission,
    hasBrowserSubscription,
    savedOnServer,
    enabled,
    onboarded: enabled,
    promptAsked: enabled,
  };
}

/**
 * Whether the first-login Enable Notifications dialog should be shown.
 * Shows when permission is still default or previously denied, until successfully enabled.
 */
export async function shouldShowPushPrompt(): Promise<boolean> {
  if (!isWebPushSupported() || !getAuthToken()) {
    return false;
  }

  if (wasPushPromptDismissedThisSession()) {
    return false;
  }

  const status = await getPushNotificationStatus();
  if (status.enabled) {
    return false;
  }

  // Already allowed — bootstrap will silently subscribe; no dialog needed.
  if (status.permission === 'granted') {
    return false;
  }

  // default → Enable dialog; denied → browser-settings instructions dialog
  return status.permission === 'default' || status.permission === 'denied';
}

/**
 * Registers the Service Worker, asks browser permission, subscribes, and saves to MongoDB.
 *
 * @returns Push status after the enable attempt
 */
export async function enablePushNotifications(): Promise<PushNotificationStatus> {
  if (!isWebPushSupported()) {
    throw new Error('This browser does not support push notifications.');
  }
  if (!getAuthToken()) {
    throw new Error('You must be signed in to enable notifications.');
  }

  // Requirement: register the Service Worker before requesting permission.
  const registration = await ensureServiceWorkerRegistration();

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked in the browser. Enable them in site settings, then try again.'
        : 'Notification permission was not granted.',
    );
  }

  const publicKey = await fetchVapidPublicKey();
  let subscription = await registration.pushManager.getSubscription();

  // Always (re)subscribe so this logged-in user owns the endpoint on the server.
  if (subscription) {
    try {
      await subscription.unsubscribe();
    } catch {
      /* continue and create a fresh subscription */
    }
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  console.log('[Push] browser subscription ready', {
    endpoint: subscription.endpoint.slice(0, 64),
  });

  await saveSubscription(subscription);
  console.log('[Push] subscription saved to server');

  // Only skip future auto-prompts after a successful enable.
  markPushOnboarded();
  const status = await getPushNotificationStatus();
  if (!status.savedOnServer) {
    throw new Error(
      'Notification permission was granted, but the subscription was not saved. Try Enable Notifications again.',
    );
  }
  return status;
}

/**
 * Asks the server to send an immediate test push to this user's saved subscriptions.
 */
export async function sendTestPushNotification(): Promise<{ delivered: number; message: string }> {
  const status = await getPushNotificationStatus();
  if (!status.enabled && Notification.permission === 'granted') {
    await enablePushNotifications();
  }

  const response = await fetch(`${resolveApiBaseUrl()}/api/push/test`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error?.message || 'Failed to send test notification');
  }

  return {
    delivered: Number(json?.data?.delivered || 0),
    message: String(json?.data?.message || 'Test notification sent'),
  };
}

/**
 * @deprecated Use enablePushNotifications / shouldShowPushPrompt instead.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  try {
    if (!(await shouldShowPushPrompt()) && Notification.permission === 'granted') {
      const status = await enablePushNotifications();
      return status.enabled;
    }
    return false;
  } catch {
    return false;
  }
}
