export type ApiFailureKind = 'not_found' | 'authentication' | 'conflict' | 'validation' | 'transient' | 'malformed';
export type MachineResolutionStatus = 'RESOLVING' | 'RESOLVED' | 'RESOLVED_CANONICAL' | 'UNRESOLVED_TRANSIENT' | 'UNRESOLVED_INVALID' | 'REMOVED_BY_USER';
export interface MachineReference { _id: string; }
export interface MachineResolutionEntry<T extends MachineReference> {
  originalMachineId: string; status: MachineResolutionStatus; machine?: T; canonicalMachineId?: string;
  redirectedFromMachineId?: string; failureKind?: ApiFailureKind;
}
export interface MachineResolutionSnapshot<T extends MachineReference> {
  entries: MachineResolutionEntry<T>[]; machineIds: string[]; machines: T[]; unresolvedMachineIds: string[];
  invalidMachineIds: string[]; redirectedFromMachineIds: Record<string, string>;
}
export interface UploadAttemptFile { name: string; size: number; type: string; lastModified?: number; }
export type RSRUploadRouteType = 'direct_machine' | 'unified_machine' | 'job_document';
export interface RSRUploadAttemptInput { routeType: RSRUploadRouteType; file: UploadAttemptFile; jobId?: string; targetMachineIds: string[]; metadata: Record<string, unknown>; }
export interface RSRUploadAttempt { fingerprint: string; idempotencyKey: string; fileReference: UploadAttemptFile; operationId?: string; }

const resolved = <T extends MachineReference>(entry: MachineResolutionEntry<T>) => entry.status === 'RESOLVED' || entry.status === 'RESOLVED_CANONICAL';
const failureKinds: ApiFailureKind[] = ['not_found', 'authentication', 'conflict', 'validation', 'transient', 'malformed'];

export function classifyApiFailure(error: unknown): ApiFailureKind {
  const candidate = error as { kind?: unknown; name?: unknown; status?: unknown } | undefined;
  if (typeof candidate?.kind === 'string' && failureKinds.includes(candidate.kind as ApiFailureKind)) return candidate.kind as ApiFailureKind;
  if (candidate?.name === 'AbortError') return 'transient';
  if (candidate?.status === 404) return 'not_found';
  if (candidate?.status === 401 || candidate?.status === 403) return 'authentication';
  if (candidate?.status === 409) return 'conflict';
  return candidate?.status === 400 || candidate?.status === 422 ? 'validation' : 'transient';
}

export function machineResolutionStatusForFailure(error: unknown): MachineResolutionStatus {
  return classifyApiFailure(error) === 'not_found' ? 'UNRESOLVED_INVALID' : 'UNRESOLVED_TRANSIENT';
}

export function createMachineResolutionSnapshot<T extends MachineReference>(entries: MachineResolutionEntry<T>[]): MachineResolutionSnapshot<T> {
  const canonicalIds = new Set<string>(), machineIds: string[] = [], machines: T[] = [], unresolvedMachineIds: string[] = [], invalidMachineIds: string[] = [];
  const redirectedFromMachineIds: Record<string, string> = {};
  for (const entry of entries) {
    if (resolved(entry) && entry.machine && entry.canonicalMachineId) {
      if (!canonicalIds.has(entry.canonicalMachineId)) { canonicalIds.add(entry.canonicalMachineId); machineIds.push(entry.canonicalMachineId); machines.push(entry.machine); }
      if (entry.redirectedFromMachineId) redirectedFromMachineIds[entry.redirectedFromMachineId] = entry.canonicalMachineId;
    } else {
      unresolvedMachineIds.push(entry.originalMachineId);
      if (entry.status === 'UNRESOLVED_INVALID') invalidMachineIds.push(entry.originalMachineId);
    }
  }
  return { entries, machineIds, machines, unresolvedMachineIds, invalidMachineIds, redirectedFromMachineIds };
}

export function createResolvingMachineResolution<T extends MachineReference>(machineIds: string[]): MachineResolutionSnapshot<T> {
  return createMachineResolutionSnapshot(machineIds.map((originalMachineId) => ({ originalMachineId, status: 'RESOLVING' })));
}

export function resolutionBlocksSubmission<T extends MachineReference>(resolution: MachineResolutionSnapshot<T>): boolean {
  return resolution.entries.some((entry) => !resolved(entry));
}

export function resolutionBlocksMachineIds<T extends MachineReference>(machineIds: string[], resolution: MachineResolutionSnapshot<T>): boolean {
  const intendedIds = new Set(machineIds);
  return resolution.entries.some((entry) => intendedIds.has(entry.originalMachineId) && !resolved(entry));
}

export function machineResolutionMessage<T extends MachineReference>(resolution: MachineResolutionSnapshot<T>, intendedMachineIds?: string[]): string | null {
  const intendedIds = intendedMachineIds ? new Set(intendedMachineIds) : null;
  const entries = resolution.entries.filter((entry) => (!intendedIds || intendedIds.has(entry.originalMachineId)) && !resolved(entry));
  if (entries.length === 0) return null;
  if (entries.some((entry) => entry.status === 'RESOLVING')) return 'Machine associations are resolving; save or upload remains blocked.';
  return entries.some((entry) => entry.status === 'UNRESOLVED_INVALID')
    ? 'An invalid machine association is retained. Remove it explicitly before saving or uploading.'
    : 'Machine resolution failed temporarily. Existing associations are retained; retry before saving or uploading.';
}

export function entryForMachineReference<T extends MachineReference>(resolution: MachineResolutionSnapshot<T> | null, reference: T | string | null | undefined): MachineResolutionEntry<T> | undefined {
  const originalMachineId = typeof reference === 'string' ? reference : reference?._id;
  return resolution?.entries.find((entry) => entry.originalMachineId === originalMachineId);
}

/** Replace and deduplicate only confirmed canonical references; keep every failed original visible. */
export function preserveMachineReferences<T extends MachineReference>(references: Array<T | string | null | undefined>, resolution: MachineResolutionSnapshot<T>): Array<T | string> {
  const entries = new Map(resolution.entries.map((entry) => [entry.originalMachineId, entry])), canonicalIds = new Set<string>(), preserved: Array<T | string> = [];
  for (const reference of references) {
    const originalMachineId = typeof reference === 'string' ? reference : reference?._id;
    if (!originalMachineId) continue;
    const entry = entries.get(originalMachineId);
    if (entry?.machine && entry.canonicalMachineId && resolved(entry)) {
      if (!canonicalIds.has(entry.canonicalMachineId)) { canonicalIds.add(entry.canonicalMachineId); preserved.push(entry.machine); }
    } else preserved.push(reference);
  }
  return preserved;
}

export function preserveIntendedMachineIds<T extends MachineReference>(machineIds: string[], resolution: MachineResolutionSnapshot<T>): string[] {
  const entries = new Map(resolution.entries.map((entry) => [entry.originalMachineId, entry])), canonicalIds = new Set<string>(), retained: string[] = [];
  for (const originalMachineId of machineIds) {
    const entry = entries.get(originalMachineId);
    if (entry?.canonicalMachineId && resolved(entry)) {
      if (!canonicalIds.has(entry.canonicalMachineId)) { canonicalIds.add(entry.canonicalMachineId); retained.push(entry.canonicalMachineId); }
    } else retained.push(originalMachineId);
  }
  return retained;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, child]) => child !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
}

export function uploadAttemptFingerprint(input: RSRUploadAttemptInput): string {
  return JSON.stringify(canonicalize({ routeType: input.routeType, file: input.file, jobId: input.jobId, targetMachineIds: [...new Set(input.targetMachineIds)].sort(), metadata: input.metadata }));
}

function defaultIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `ars-rsr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createOrReuseRSRUploadAttempt(existing: RSRUploadAttempt | null | undefined, input: RSRUploadAttemptInput, makeKey: () => string = defaultIdempotencyKey): RSRUploadAttempt {
  const fingerprint = uploadAttemptFingerprint(input);
  return existing && existing.fingerprint === fingerprint && existing.fileReference === input.file ? existing : { fingerprint, idempotencyKey: makeKey(), fileReference: input.file };
}

export const retainRSRUploadOperation = (attempt: RSRUploadAttempt, operationId: string | undefined): RSRUploadAttempt => operationId ? { ...attempt, operationId } : attempt;
/** The backend rejects both headers, so the returned operation ID supersedes the idempotency key. */
export const rsrUploadAttemptHeaders = (attempt?: RSRUploadAttempt | null): Record<string, string> => !attempt ? {} : attempt.operationId ? { 'X-RSR-Upload-Operation-Id': attempt.operationId } : { 'Idempotency-Key': attempt.idempotencyKey };
export const clearCommittedRSRUploadAttempt = (attempt: RSRUploadAttempt, state: string | undefined): RSRUploadAttempt | null => state === 'COMMITTED' ? null : attempt;
