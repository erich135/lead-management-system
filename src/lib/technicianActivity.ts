export interface AppDeviceObservation {
  _id: string; user: string; installationId: string; nativeVersion: string | null; nativeBuild: number | null;
  deviceModel: string | null; manufacturer: string | null; androidVersion: string | null;
  otaUpdateId: string | null; otaRuntimeVersion: string | null; otaChannel: string | null;
  firstReceivedAt: string; lastReceivedAt: string;
}
export interface TechnicianActivityRow {
  id: string; name: string; active: boolean; accountIds: string[];
  lastLoginAt: string | null; lastAppLoginAt: string | null; lastAuditAt: string | null;
  assigned: number; started: number; outstanding: number; submitted: number;
  lastSubmission: { at: string; reportNumber?: string } | null;
  lastWorkEvent: { receivedAt: string; deviceTime: string; action: string; subjectType: string } | null;
  deliveryAssigned: number; deliveryCompleted: number; lastDeliveryAt: string | null;
  legacyDeliveryCount: number; lastLegacyDeliveryReceivedAt: string | null;
  devices: AppDeviceObservation[];
}
export interface TechnicianActivityResult {
  generatedAt: string; technicians: TechnicianActivityRow[]; unmappedDevices: AppDeviceObservation[];
}
/** Freshness describes the observation, never current connectivity or an installation claim. */
export function observationFreshness(receivedAt: string | null | undefined, referenceAt: string): string {
  const received = receivedAt ? Date.parse(receivedAt) : NaN;
  const reference = Date.parse(referenceAt);
  if (!Number.isFinite(received) || !Number.isFinite(reference)) return 'Unknown observation time';
  return reference - received > 24 * 60 * 60 * 1000 ? 'Stale observation (over 24 hours)' : 'Reported within 24 hours';
}
export function activityDate(value?: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return 'Unknown';
  return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export type VersionState = 'current' | 'outdated' | 'unknown';
export type ActivitySort = 'name-asc' | 'name-desc' | 'activity-desc' | 'activity-asc' | 'outstanding-desc' | 'outstanding-asc';
export interface RecordedActivity { at: string; source: string; detail?: string }
const DAY = 24 * 60 * 60 * 1000;

function observedTime(value: string | null | undefined, referenceAt: string): number | null {
  const time = value ? Date.parse(value) : NaN;
  const reference = Date.parse(referenceAt);
  return Number.isFinite(time) && Number.isFinite(reference) && time <= reference ? time : null;
}

/** Use server receipt times for delayed work uploads, with the source named explicitly. */
export function recordedActivities(row: TechnicianActivityRow, referenceAt: string): RecordedActivity[] {
  const candidates: Array<RecordedActivity | null> = [
    row.lastLoginAt ? { at: row.lastLoginAt, source: 'Account login' } : null,
    row.lastAppLoginAt ? { at: row.lastAppLoginAt, source: 'App login' } : null,
    row.lastWorkEvent ? { at: row.lastWorkEvent.receivedAt, source: 'Work event received', detail: `${row.lastWorkEvent.action === 'start' ? 'Started' : 'Finished'} · ${row.lastWorkEvent.subjectType === 'job_assignment' ? 'Job Card' : 'Inspection'}` } : null,
    row.lastSubmission ? { at: row.lastSubmission.at, source: 'Job Card accepted', detail: row.lastSubmission.reportNumber } : null,
    row.lastDeliveryAt ? { at: row.lastDeliveryAt, source: 'Delivery completed' } : null,
    row.lastLegacyDeliveryReceivedAt ? { at: row.lastLegacyDeliveryReceivedAt, source: 'Legacy delivery received' } : null,
  ];
  return candidates.filter((a): a is RecordedActivity => !!a && observedTime(a.at, referenceAt) !== null)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function deviceVersionKnown(device: AppDeviceObservation, referenceAt: string): boolean {
  return Number.isSafeInteger(device.nativeBuild) && (device.nativeBuild ?? 0) > 0 &&
    !!device.nativeVersion?.trim() && observedTime(device.lastReceivedAt, referenceAt) !== null;
}

/** Any known older device wins over a newer phone; missing device information never means current. */
export function technicianVersion(row: TechnicianActivityRow, targetBuild: number | null, referenceAt: string) {
  const known = row.devices.filter(d => deviceVersionKnown(d, referenceAt));
  const older = targetBuild ? known.filter(d => d.nativeBuild! < targetBuild) : [];
  const unknown = row.devices.length - known.length;
  const state: VersionState = older.length ? 'outdated' : targetBuild && known.length && !unknown ? 'current' : 'unknown';
  const versions = [...new Set(known.map(d => `${d.nativeVersion} (${d.nativeBuild})`))];
  return { state, known, older, unknown, versions };
}

export function reportingContact(row: TechnicianActivityRow, referenceAt: string) {
  const dates = row.devices.map(d => d.lastReceivedAt).filter(d => observedTime(d, referenceAt) !== null)
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  const at = dates[0] || null;
  const status = !at ? 'No report' : Date.parse(referenceAt) - Date.parse(at) > DAY ? 'Stale' : 'Recently contacted';
  return { at, status };
}

export function technicianSummary(rows: TechnicianActivityRow[], targetBuild: number | null, referenceAt: string) {
  const active = rows.filter(t => t.active);
  const isRecent = (t: TechnicianActivityRow) => {
    const last = recordedActivities(t, referenceAt)[0];
    return !!last && Date.parse(referenceAt) - Date.parse(last.at) <= 7 * DAY;
  };
  return { active: active.length, inactive: rows.length - active.length,
    recentlyActive: active.filter(isRecent).length,
    needUpdate: active.filter(t => technicianVersion(t, targetBuild, referenceAt).state === 'outdated').length,
    unknown: active.filter(t => { const report = technicianVersion(t, targetBuild, referenceAt); return !report.known.length || report.unknown > 0; }).length };
}

export function filterTechnicians(rows: TechnicianActivityRow[], options: {
  query: string; active: 'all' | 'active' | 'inactive'; version: 'all' | VersionState;
  sort: ActivitySort; targetBuild: number | null; referenceAt: string;
}) {
  const normal = (v: string) => v.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = rows.filter(t => normal(t.name).includes(normal(options.query.trim())) &&
    (options.active === 'all' || t.active === (options.active === 'active')) &&
    (options.version === 'all' || technicianVersion(t, options.targetBuild, options.referenceAt).state === options.version));
  return filtered.sort((a,b) => {
    const byName = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    if (options.sort.startsWith('name')) return options.sort === 'name-asc' ? byName : -byName;
    if (options.sort.startsWith('outstanding')) return (options.sort === 'outstanding-desc' ? b.outstanding - a.outstanding : a.outstanding - b.outstanding) || byName;
    const at = recordedActivities(a, options.referenceAt)[0], bt = recordedActivities(b, options.referenceAt)[0];
    if (!at || !bt) return at ? -1 : bt ? 1 : byName; // Unknown activity always stays last.
    return (options.sort === 'activity-desc' ? Date.parse(bt.at) - Date.parse(at.at) : Date.parse(at.at) - Date.parse(bt.at)) || byName;
  });
}
