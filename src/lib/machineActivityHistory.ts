export const MACHINE_HISTORY_SECTIONS = [
  'jobs',
  'rsrs',
  'readings',
  'activities',
  'notes',
  'attachments',
  'relatedDocuments',
] as const;

export type MachineHistorySection = (typeof MACHINE_HISTORY_SECTIONS)[number];

export interface MachineHistoryRecordWithStableId {
  id: string;
}

export interface MachineHistoryIdentity {
  _id?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  assetNumber?: string;
}

export function buildCanonicalMachineHistoryEndpoint(
  machineId: string,
  section: MachineHistorySection,
  page: number,
  limit: number,
): string {
  const query = new URLSearchParams({ section, page: String(page), limit: String(limit) });
  return `/api/machines/${encodeURIComponent(machineId)}/canonical-history?${query.toString()}`;
}

export function mergeMachineHistoryPages<T extends MachineHistoryRecordWithStableId>(
  existing: T[],
  incoming: T[],
  replace: boolean,
): T[] {
  const merged = replace ? [] : [...existing];
  const seen = new Set(merged.map((record) => record.id));
  for (const record of incoming) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      merged.push(record);
    }
  }
  return merged;
}

export function isCurrentMachineHistoryRequest(requestGeneration: number, currentGeneration: number): boolean {
  return requestGeneration === currentGeneration;
}

export function canonicalHistoryMachineId(requestedMachineId: string, confirmedCanonicalMachineId?: string): string {
  return confirmedCanonicalMachineId || requestedMachineId;
}

export function machineIdentityLabel(identity: MachineHistoryIdentity): string {
  const name = [identity.make, identity.model].filter(Boolean).join(' ').trim();
  const reference = identity.assetNumber || identity.serialNumber;
  if (name && reference) return `${name} (${reference})`;
  return name || reference || 'another machine in this canonical group';
}

export function machineHistoryProvenanceText(
  machineIds: string[] | undefined,
  groupIdentities: MachineHistoryIdentity[],
): string | null {
  if (!machineIds?.length) return null;
  const identities = groupIdentities.filter((identity) => identity._id && machineIds.includes(identity._id));
  if (!identities.length) return 'Originally recorded against another machine in this canonical group.';
  return `Originally recorded against ${identities.map(machineIdentityLabel).join(', ')}.`;
}
