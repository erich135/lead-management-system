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
 * updateViaCache: 'none' bypasses HTTP cache for the worker script so a
 * year-long immutable Cache-Control on *.js cannot freeze an old SW.
 */
function resolveServiceWorkerOptions(): RegistrationOptions {
  return {
    scope: '/',
    type: import.meta.env.PROD ? 'classic' : 'module',
    updateViaCache: 'none',
  };
}

const UPDATE_CHECK_MS = 60 * 1000;

/**
 * Asks the browser to fetch a fresh service worker script.
 */
function requestServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
  void registration.update().catch(() => undefined);
}

/**
 * Reloads once when a newly activated worker takes over an already-controlled page.
 * First-time installs do not reload (no existing controller).
 */
function reloadWhenControllerChanges(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
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
  reloadWhenControllerChanges();

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

    requestServiceWorkerUpdate(registration);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        requestServiceWorkerUpdate(registration);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', () => requestServiceWorkerUpdate(registration));
    window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        requestServiceWorkerUpdate(registration);
      }
    }, UPDATE_CHECK_MS);

    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn(`[PWA] Service worker registration failed for ${swUrl}:`, error);
    return null;
  }
}
