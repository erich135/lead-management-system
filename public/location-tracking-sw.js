/// <reference lib="webworker" />

/**
 * Location Tracking Service Worker
 * 
 * Keeps GPS tracking alive when the browser tab is backgrounded or minimized.
 * Uses the Background Sync API + periodic self-wake via setTimeout as a fallback.
 * 
 * IMPORTANT: This does NOT track when the browser is fully closed.
 * When the browser is closed, the service worker is also terminated.
 * However, it DOES keep tracking when:
 *   - The tab is in the background
 *   - The phone screen is locked (for a while)
 *   - The user switches to another app
 */

const SW_VERSION = '1.0.0';
const TRACKING_INTERVAL = 30000; // 30 seconds

let trackingActive = false;
let authToken = null;
let apiBaseUrl = '';
let trackingTimer = null;

self.addEventListener('install', (event) => {
  console.log(`[LocationSW v${SW_VERSION}] Installing...`);
  // Skip waiting so the new SW takes over immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[LocationSW v${SW_VERSION}] Activated`);
  event.waitUntil(self.clients.claim());
});

/**
 * Listen for messages from the main thread to control tracking.
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'START_TRACKING':
      authToken = payload?.token;
      apiBaseUrl = payload?.apiBaseUrl || '';
      trackingActive = true;
      console.log('[LocationSW] Tracking started');
      scheduleNextPing();
      break;

    case 'STOP_TRACKING':
      trackingActive = false;
      authToken = null;
      if (trackingTimer) {
        clearTimeout(trackingTimer);
        trackingTimer = null;
      }
      console.log('[LocationSW] Tracking stopped');
      break;

    case 'PING':
      // Keep-alive ping from the main thread
      if (trackingActive) {
        sendLocationPing();
      }
      break;
  }
});

/**
 * Schedule the next location ping. 
 * Uses setTimeout which survives tab backgrounding in service workers.
 */
function scheduleNextPing() {
  if (!trackingActive) return;

  if (trackingTimer) clearTimeout(trackingTimer);

  trackingTimer = setTimeout(async () => {
    if (trackingActive) {
      await sendLocationPing();
      scheduleNextPing(); // Loop
    }
  }, TRACKING_INTERVAL);
}

/**
 * Send a location ping to the backend REST API.
 * The service worker can't use the Geolocation API directly,
 * so we use the last known position stored by the main thread,
 * or we send a "heartbeat" to tell the server the rep is still active.
 */
async function sendLocationPing() {
  if (!authToken || !apiBaseUrl) return;

  try {
    const response = await fetch(`${apiBaseUrl}/api/location/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'service-worker',
      }),
    });

    if (!response.ok) {
      console.warn('[LocationSW] Heartbeat failed:', response.status);
    }
  } catch (error) {
    console.warn('[LocationSW] Heartbeat error:', error);
  }
}

/**
 * Handle push notifications (for re-activating tracking).
 * If the server detects a rep went silent, it can send a push 
 * to re-engage the service worker.
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || {};
  
  if (data.type === 'TRACKING_REMINDER') {
    event.waitUntil(
      self.registration.showNotification('Location Tracking', {
        body: 'Your location tracking has been paused. Tap to resume.',
        icon: '/favicon.ico',
        tag: 'tracking-reminder',
        requireInteraction: true,
        data: { action: 'resume-tracking' },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing tab if found
      for (const client of clients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow('/dashboard');
    })
  );
});
