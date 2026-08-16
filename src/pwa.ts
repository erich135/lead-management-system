/**
 * Resolves the service worker script URL for the current Vite mode.
 * vite-plugin-pwa (injectManifest + devOptions) serves the worker at
 * `/dev-sw.js?dev-sw` in development and `/sw.js` in production.
 */
function resolveServiceWorkerUrl(): string {
  return import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw';
}

/**
 * Registration options required by vite-plugin-pwa in each environment.
 */
function resolveServiceWorkerOptions(): RegistrationOptions {
  return {
    scope: '/',
    type: import.meta.env.PROD ? 'classic' : 'module',
  };
}

/**
 * Registers the website service worker for caching, Home Screen install, and Web Push.
 * Must succeed on localhost during `vite` dev so push notifications can be tested.
 */
export async function registerArsServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const swUrl = resolveServiceWorkerUrl();

  try {
    const registration = await navigator.serviceWorker.register(
      swUrl,
      resolveServiceWorkerOptions(),
    );

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          installing.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn(`[PWA] Service worker registration failed for ${swUrl}:`, error);
    return null;
  }
}
