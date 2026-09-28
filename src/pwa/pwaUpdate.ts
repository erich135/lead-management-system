import {
  ARS_APP_BUILD,
  ARS_CHUNK_FAILURE_EVENT,
  ARS_STORAGE_FAILURE_EVENT,
  ARS_UPDATE_READY_EVENT,
  UPDATE_CHECK_MS,
  beginControlledReload,
  clearReloadGuard,
  isChunkLoadError,
  isQuotaError,
  publishDiagnostics,
  shouldActivateFirstInstall,
  shouldWaitForUserUpdate,
} from './appBuild';

function resolveServiceWorkerUrl(): string {
  return import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw';
}

function resolveServiceWorkerOptions(): RegistrationOptions {
  return {
    scope: '/',
    type: import.meta.env.PROD ? 'classic' : 'module',
    updateViaCache: 'none',
  };
}

function requestServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
  void registration.update().catch((error: unknown) => {
    if (isQuotaError(error)) {
      reportStorageFailure(error);
    }
  });
}

function reportStorageFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Browser storage is full.';
  publishDiagnostics({ storageError: message, updateWaiting: false });
  window.dispatchEvent(new CustomEvent(ARS_STORAGE_FAILURE_EVENT));
}

function reportUpdateReady(availableBuild: string | null): void {
  publishDiagnostics({
    availableBuild,
    serviceWorkerBuild: availableBuild,
    updateWaiting: true,
    storageError: null,
  });
  window.dispatchEvent(
    new CustomEvent(ARS_UPDATE_READY_EVENT, { detail: { availableBuild } }),
  );
}

function requestWorkerBuild(worker: ServiceWorker): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = (event: MessageEvent) => {
      window.clearTimeout(timer);
      const build = event.data?.build;
      resolve(typeof build === 'string' && build.trim() ? build : null);
    };
    try {
      worker.postMessage({ type: 'ARS_REPORT_BUILD' }, [channel.port2]);
    } catch {
      window.clearTimeout(timer);
      resolve(null);
    }
  });
}

function reloadWhenControllerChanges(): void {
  if (!navigator.serviceWorker.controller) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    if (!beginControlledReload(window.sessionStorage)) return;
    reloading = true;
    window.location.reload();
  });
}

async function noteWaitingWorker(worker: ServiceWorker): Promise<void> {
  const build = await requestWorkerBuild(worker);
  reportUpdateReady(build);
}

function watchInstallingWorker(registration: ServiceWorkerRegistration): void {
  const installing = registration.installing;
  if (!installing) return;
  let reachedInstalled = false;
  installing.addEventListener('statechange', () => {
    if (installing.state === 'installed') reachedInstalled = true;
    const hasController = Boolean(navigator.serviceWorker.controller);
    if (shouldWaitForUserUpdate(import.meta.env.PROD, hasController, installing.state)) {
      const waiting = registration.waiting ?? installing;
      void noteWaitingWorker(waiting);
      return;
    }
    if (shouldActivateFirstInstall(hasController, installing.state) || !import.meta.env.PROD) {
      if (installing.state === 'installed') {
        installing.postMessage({ type: 'SKIP_WAITING' });
      }
      return;
    }
    if (installing.state === 'redundant' && !reachedInstalled) {
      reportStorageFailure(new Error('The new ARS version could not be stored.'));
    }
  });
}

export function installPwaRecoveryListeners(): void {
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type !== 'ARS_MIGRATION_RELOAD') return;
      const port = event.ports?.[0];
      if (window.__ARS_UNSAVED_WORK__ === true) {
        port?.postMessage({ type: 'ARS_MIGRATION_HOLD' });
        return;
      }
      port?.postMessage({ type: 'ARS_MIGRATION_CURRENT' });
    });
  }
  const onError = (event: Event) => {
    const reason =
      'reason' in event
        ? (event as PromiseRejectionEvent).reason
        : (event as ErrorEvent).error ?? (event as ErrorEvent).message;
    if (!isChunkLoadError(reason)) return;
    if ('preventDefault' in event) event.preventDefault();
    window.dispatchEvent(new CustomEvent(ARS_CHUNK_FAILURE_EVENT));
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);
}

export async function applyWaitingServiceWorker(options?: {
  clearWhenIdle?: boolean;
}): Promise<'activated' | 'cleared'> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.update().catch(() => undefined);
  }
  const waiting = registration?.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    return 'activated';
  }
  if (options?.clearWhenIdle || !navigator.serviceWorker.controller) {
    return clearArsCachesAndReload();
  }
  if (beginControlledReload(window.sessionStorage)) {
    window.location.reload();
  }
  return 'activated';
}

export async function clearArsCachesAndReload(): Promise<'cleared'> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  if (beginControlledReload(window.sessionStorage)) {
    window.location.reload();
  }
  return 'cleared';
}

/**
 * Registers the website service worker for caching, Home Screen install, and Web Push.
 * A newer production build stays waiting until the user chooses Update now.
 */
export async function registerArsServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  publishDiagnostics({ runningBuild: ARS_APP_BUILD });
  window.setTimeout(() => clearReloadGuard(window.sessionStorage), 15000);
  reloadWhenControllerChanges();

  const swUrl = resolveServiceWorkerUrl();
  try {
    const registration = await navigator.serviceWorker.register(
      swUrl,
      resolveServiceWorkerOptions(),
    );

    if (registration.waiting && navigator.serviceWorker.controller && import.meta.env.PROD) {
      void noteWaitingWorker(registration.waiting);
    }

    registration.addEventListener('updatefound', () => watchInstallingWorker(registration));
    if (registration.installing) watchInstallingWorker(registration);

    if (registration.active) {
      const activeBuild = await requestWorkerBuild(registration.active);
      publishDiagnostics({ serviceWorkerBuild: activeBuild });
    }

    requestServiceWorkerUpdate(registration);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestServiceWorkerUpdate(registration);
    });
    window.setInterval(() => {
      if (document.visibilityState === 'visible') requestServiceWorkerUpdate(registration);
    }, UPDATE_CHECK_MS);

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'ARS_BUILD_WAITING' && import.meta.env.PROD) {
        const build = typeof event.data.build === 'string' ? event.data.build : null;
        if (registration.waiting && navigator.serviceWorker.controller) {
          reportUpdateReady(build);
        }
      }
      if (event.data?.type === 'ARS_STORAGE_PRESSURE') {
        reportStorageFailure(new Error('Quota exceeded'));
      }
    });

    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn(`[PWA] Service worker registration failed for ${swUrl}:`, error);
    if (isQuotaError(error)) reportStorageFailure(error);
    return null;
  }
}
