export const ARS_APP_BUILD: string =
  typeof __ARS_APP_BUILD__ === 'string' && __ARS_APP_BUILD__.trim()
    ? __ARS_APP_BUILD__.trim()
    : 'dev';

export const UPDATE_CHECK_MS = 45 * 60 * 1000;

/** Bump only when another silent takeover is required. Later builds must keep this value. */
export const UPDATE_PROTOCOL = '1';

export const MIGRATION_GRACE_MS = 2000;
export const MIGRATION_LIMIT_MS = 60_000;

export type MigrationClientReply = 'hold' | 'current' | 'none';

/**
 * The first protocol-aware worker must activate itself. Installed copies of ARS
 * do not contain the update screen, and a worker that is already waiting when
 * the app opens is never claimed by today's page.
 */
export function shouldAutoActivateForMigration(storedProtocol: string | null): boolean {
  return storedProtocol !== UPDATE_PROTOCOL;
}

/**
 * Old pages reload themselves when the controller changes. Give that reload,
 * and the browser's unsaved-work warning, a moment before the worker navigates
 * a tab that stayed open.
 */
export function migrationClientAction(
  reply: MigrationClientReply,
  elapsedMs: number,
  pageIsActive: boolean,
): 'wait' | 'stop' | 'reload' {
  if (reply === 'hold' || reply === 'current') return 'stop';
  if (elapsedMs < MIGRATION_GRACE_MS) return 'wait';
  if (!pageIsActive || elapsedMs >= MIGRATION_LIMIT_MS) return 'reload';
  return 'wait';
}

export const ARS_UPDATE_READY_EVENT = 'ars:update-ready';
export const ARS_CHUNK_FAILURE_EVENT = 'ars:chunk-failure';
export const ARS_STORAGE_FAILURE_EVENT = 'ars:storage-failure';

export const RELOAD_GUARD_KEY = 'ars-sw-reload';

export interface ArsDiagnostics {
  runningBuild: string;
  availableBuild: string | null;
  serviceWorkerBuild: string | null;
  updateWaiting: boolean;
  storageError: string | null;
}

const CHUNK_LOAD =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = errorText(error);
  return CHUNK_LOAD.test(message);
}

export function isQuotaError(error: unknown): boolean {
  const name = errorName(error);
  if (name === 'QuotaExceededError') return true;
  return /QuotaExceededError|quota exceeded/i.test(errorText(error));
}

export function shouldWaitForUserUpdate(
  isProduction: boolean,
  hasController: boolean,
  workerState: string,
): boolean {
  return isProduction && hasController && workerState === 'installed';
}

export function shouldActivateFirstInstall(hasController: boolean, workerState: string): boolean {
  return !hasController && workerState === 'installed';
}

export function obsoleteCacheNames(keys: readonly string[], current: readonly string[]): string[] {
  const keep = new Set(current);
  return keys.filter((key) => !keep.has(key));
}

export function beginControlledReload(storage: Pick<Storage, 'getItem' | 'setItem'>): boolean {
  if (storage.getItem(RELOAD_GUARD_KEY) === '1') return false;
  storage.setItem(RELOAD_GUARD_KEY, '1');
  return true;
}

export function clearReloadGuard(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(RELOAD_GUARD_KEY);
}

export function emptyDiagnostics(runningBuild = ARS_APP_BUILD): ArsDiagnostics {
  return {
    runningBuild,
    availableBuild: null,
    serviceWorkerBuild: null,
    updateWaiting: false,
    storageError: null,
  };
}

export function publishDiagnostics(patch: Partial<ArsDiagnostics>): ArsDiagnostics {
  const current =
    typeof window !== 'undefined' && window.__ARS_DIAGNOSTICS__
      ? window.__ARS_DIAGNOSTICS__
      : emptyDiagnostics();
  const next: ArsDiagnostics = { ...current, ...patch, runningBuild: ARS_APP_BUILD };
  if (typeof window !== 'undefined') {
    window.__ARS_DIAGNOSTICS__ = next;
  }
  return next;
}

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: unknown }).name ?? '');
  }
  return '';
}
