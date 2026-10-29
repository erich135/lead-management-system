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
