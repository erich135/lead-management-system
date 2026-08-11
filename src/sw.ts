/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

/**
 * ARS Progressive Web App service worker.
 * Precaches the app shell, provides basic offline support, and keeps the
 * existing location-tracking heartbeat behaviour in the same registration
 * so it does not conflict with installability.
 */

clientsClaim();
self.skipWaiting();

/** Precache list — empty array in Vite PWA development (injectManifest). */
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

/**
 * SPA navigation fallback for client-side routes.
 * Guarded: createHandlerBoundToURL throws when index.html is not in the precache
 * (common during Vite PWA injectManifest development until navigateFallback is injected).
 */
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//, /^\/location-tracking-sw\.js$/],
    }),
  );
} catch (error) {
  console.warn('[ARS SW] Navigation fallback not registered:', error);
}

/** Cache Google Fonts stylesheets. */
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'ars-google-fonts-stylesheets',
  }),
);

/** Cache Google Fonts files. */
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'ars-google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

/** Cache static image assets. */
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'ars-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

/** Always use the network for API traffic (no private CRM cache). */
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly());

/* -------------------------------------------------------------------------- */
/* Location tracking (migrated from location-tracking-sw.js)                  */
/* -------------------------------------------------------------------------- */

const TRACKING_INTERVAL = 30000;
let trackingActive = false;
let authToken: string | null = null;
let apiBaseUrl = '';
let trackingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules the next background heartbeat while tracking is active.
 */
function scheduleNextPing(): void {
  if (!trackingActive) return;
  if (trackingTimer) clearTimeout(trackingTimer);

  trackingTimer = setTimeout(async () => {
    if (trackingActive) {
      await sendLocationPing();
      scheduleNextPing();
    }
  }, TRACKING_INTERVAL);
}

/**
 * Sends a lightweight heartbeat so the backend knows the rep session is alive.
 */
async function sendLocationPing(): Promise<void> {
  if (!authToken || !apiBaseUrl) return;

  try {
    const response = await fetch(`${apiBaseUrl}/api/location/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'service-worker',
      }),
    });

    if (!response.ok) {
      console.warn('[ARS SW] Heartbeat failed:', response.status);
    }
  } catch (error) {
    console.warn('[ARS SW] Heartbeat error:', error);
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const type = data.type as string | undefined;

  if (type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }

  switch (type) {
    case 'START_TRACKING':
      authToken = data.payload?.token ?? null;
      apiBaseUrl = data.payload?.apiBaseUrl || '';
      trackingActive = true;
      scheduleNextPing();
      break;
    case 'STOP_TRACKING':
      trackingActive = false;
      authToken = null;
      if (trackingTimer) {
        clearTimeout(trackingTimer);
        trackingTimer = null;
      }
      break;
    case 'PING':
      if (trackingActive) {
        void sendLocationPing();
      }
      break;
    default:
      break;
  }
});

self.addEventListener('push', (event) => {
  let data: Record<string, unknown> = {};
  try {
    data = event.data?.json?.() || {};
  } catch {
    data = { body: event.data?.text?.() || 'New notification' };
  }

  console.log('[ARS SW] push event received', {
    type: data.type,
    title: data.title,
    tag: data.tag,
    permission: Notification.permission,
  });

  // Legacy location-tracking reminder payload
  if (data.type === 'TRACKING_REMINDER') {
    event.waitUntil(
      self.registration.showNotification('Location Tracking', {
        body: 'Your location tracking has been paused. Tap to resume.',
        icon: '/icon-192.png',
        tag: 'tracking-reminder',
        requireInteraction: true,
        data: { action: 'resume-tracking', url: '/' },
      }),
    );
    return;
  }

  const title = typeof data.title === 'string' && data.title.trim() ? data.title : 'ARS Notification';
  const body =
    typeof data.body === 'string' && data.body.trim()
      ? data.body
      : 'You have a new update in ARS.';
  const rawUrl = typeof data.url === 'string' && data.url.trim() ? data.url : '/';
  const url = new URL(rawUrl, self.location.origin).href;
  const tag =
    typeof data.tag === 'string' && data.tag.trim()
      ? data.tag
      : typeof data.type === 'string'
        ? data.type
        : 'ars-notification';

  event.waitUntil(
    (async () => {
      console.log('[ARS SW] showing notification', { title, body, tag, url });
      await self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        renotify: true,
        requireInteraction: true,
        data: { url, type: data.type || 'system' },
      });
      console.log('[ARS SW] notification shown OK', { title, tag });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl =
    (event.notification.data && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : '/') || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (!('focus' in client)) continue;
        const focused = await client.focus();
        if (focused && 'navigate' in focused && typeof focused.navigate === 'function') {
          return focused.navigate(targetUrl);
        }
        // Fallback: post a message so the open tab can route itself.
        focused?.postMessage?.({ type: 'ARS_OPEN_URL', url: targetUrl });
        return focused;
      }

      return self.clients.openWindow(targetUrl);
    })(),
  );
});
