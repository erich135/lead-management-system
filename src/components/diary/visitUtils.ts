/**
 * Visit workspace helpers for field sales appointment check-ins.
 */

import { addDays, formatDateForInput } from './diaryUtils';
import { normalizeLoanRentalForm, type LoanRentalFormData } from './loanRentalFormUtils';
import {
  normalizeNewServiceLevelForm,
  type NewServiceLevelFormData,
} from './newServiceLevelFormUtils';
import { normalizeRfcForm, type RfcFormData } from './rfcFormUtils';
import type { PlannerFormPublished, PlannerFormType } from '../../lib/api';
import {
  isVisitSystemPlannerFormType,
  type VisitSystemPlannerFormType,
} from './visitFormSelection';
import type { DynamicFormValues } from './DynamicPlannerFormRenderer';

export type VisitCompletionAction = 'finish_close' | 'book_next_visit';

export type VisitBookingShortcut = 'tomorrow' | 'next_week' | 'two_weeks' | 'custom';

export const VISIT_COMPLETION_OPTIONS: Array<{
  action: VisitCompletionAction;
  label: string;
  emoji: string;
}> = [
  { action: 'finish_close', label: 'Finish & Close', emoji: '🟢' },
  { action: 'book_next_visit', label: 'Book Next Visit', emoji: '📅' },
];

export const VISIT_BOOKING_SHORTCUTS: Array<{
  shortcut: VisitBookingShortcut;
  label: string;
}> = [
  { shortcut: 'tomorrow', label: 'Tomorrow' },
  { shortcut: 'next_week', label: 'Next Week' },
  { shortcut: 'two_weeks', label: 'In 2 Weeks' },
  { shortcut: 'custom', label: 'Choose Custom Date' },
];

/**
 * Resolves a quick booking shortcut to a pre-filled appointment date.
 */
export function resolveVisitBookingDate(shortcut: VisitBookingShortcut): string | undefined {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  switch (shortcut) {
    case 'tomorrow':
      return formatDateForInput(addDays(base, 1));
    case 'next_week':
      return formatDateForInput(addDays(base, 7));
    case 'two_weeks':
      return formatDateForInput(addDays(base, 14));
    case 'custom':
      return undefined;
    default:
      return undefined;
  }
}

export interface VisitPhoto {
  id: string;
  dataUrl: string;
  caption: string;
}

export interface VisitGpsConfirmation {
  available: boolean;
  coordinates?: [number, number];
  latitude?: number;
  longitude?: number;
  method?: string;
  accuracyMeters?: number;
  label?: string;
  address?: string;
  capturedAt?: string;
  capturedBy?: string;
  appointmentId?: string;
  /** Prepared for future geofencing — not enforced on complete today. */
  outsideExpectedLocation?: boolean;
  distanceFromExpectedMeters?: number;
}

export interface StoredVisitRecord {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  durationLabel: string;
  durationMinutes: number;
  notes: string;
  photos: VisitPhoto[];
  photoCount: number;
  location?: string;
  pinnedGeoLocation?: { type: 'Point'; coordinates: [number, number] };
  gpsConfirmation?: VisitGpsConfirmation;
  outcome?: string;
  /** True while the rep is still capturing notes/photos during the visit. */
  inProgress?: boolean;
  /** Completed RFC sheet, only present on RFC appointment types. */
  rfcForm?: RfcFormData;
  /** Timestamp confirming the rep finished the RFC step before continuing notes. */
  rfcCompletedAt?: string;
  /** Completed Loan & Rental request sheet, only present on loan_rental types. */
  loanRentalForm?: LoanRentalFormData;
  /** Timestamp confirming the Loan & Rental step was finished before notes. */
  loanRentalCompletedAt?: string;
  /** Completed New Service Level sheet, only present on rfc_new_service_level. */
  newServiceLevelForm?: NewServiceLevelFormData;
  /** Timestamp confirming the New Service Level step was finished before notes. */
  newServiceLevelCompletedAt?: string;
  /** Dynamic Super Admin form payload (preferred over legacy sheet fields). */
  dynamicForm?: VisitDynamicFormState;
  /** Published form chosen on a generic Visit; survives local + server restore. */
  selectedPlannerFormType?: VisitSystemPlannerFormType;
}

/**
 * Dynamic planner form values captured during a visit (schema snapshot + answers).
 */
export interface VisitDynamicFormState {
  formTemplateType: PlannerFormType;
  formTemplateVersion: number;
  formSchemaSnapshot: PlannerFormPublished;
  values: DynamicFormValues;
  completedAt?: string;
}

export interface VisitSession {
  appointmentId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  notes: string;
  photos: VisitPhoto[];
  /** Captured RFC sheet, only used when the appointment type is RFC. */
  rfcForm?: RfcFormData;
  /** Timestamp confirming the RFC form was explicitly saved and completed. */
  rfcCompletedAt?: string;
  /** Captured Loan & Rental sheet, only used for loan_rental appointments. */
  loanRentalForm?: LoanRentalFormData;
  /** Timestamp confirming the Loan & Rental form was explicitly saved. */
  loanRentalCompletedAt?: string;
  /** Captured New Service Level sheet for rfc_new_service_level appointments. */
  newServiceLevelForm?: NewServiceLevelFormData;
  /** Timestamp confirming the New Service Level form was explicitly saved. */
  newServiceLevelCompletedAt?: string;
  /** Preferred dynamic form from Super Admin Form Editor. */
  dynamicForm?: VisitDynamicFormState;
  /**
   * Linked draft/declined sales request ID created while the visit is still editable.
   * Submission for approval happens separately and locks the appointment.
   */
  salesRequestId?: string;
  /** Published form chosen after Start Visit on a generic Visit appointment. */
  selectedPlannerFormType?: VisitSystemPlannerFormType;
}

/**
 * Builds the localStorage key for an in-progress visit session.
 */
function visitSessionKey(appointmentId: string): string {
  return `ars-visit-session-v2-${appointmentId}`;
}

/**
 * Normalizes a legacy or partial session object into the current shape.
 */
function normalizeVisitSession(raw: Partial<VisitSession> & { appointmentId: string }): VisitSession {
  const legacyPhotos = Array.isArray(raw.photos)
    ? raw.photos.map((photo, index) =>
        typeof photo === 'string'
          ? { id: `legacy-${index}`, dataUrl: photo, caption: '' }
          : photo,
      )
    : [];

  return {
    appointmentId: raw.appointmentId,
    startedAt: raw.startedAt || new Date().toISOString(),
    endedAt: raw.endedAt,
    durationSeconds: raw.durationSeconds,
    notes: raw.notes || '',
    photos: legacyPhotos,
    rfcForm: raw.rfcForm ? normalizeRfcForm(raw.rfcForm) : undefined,
    rfcCompletedAt: raw.rfcCompletedAt,
    loanRentalForm: raw.loanRentalForm ? normalizeLoanRentalForm(raw.loanRentalForm) : undefined,
    loanRentalCompletedAt: raw.loanRentalCompletedAt,
    newServiceLevelForm: raw.newServiceLevelForm
      ? normalizeNewServiceLevelForm(raw.newServiceLevelForm)
      : undefined,
    newServiceLevelCompletedAt: raw.newServiceLevelCompletedAt,
    dynamicForm:
      raw.dynamicForm &&
      typeof raw.dynamicForm === 'object' &&
      raw.dynamicForm.formSchemaSnapshot &&
      raw.dynamicForm.values
        ? (raw.dynamicForm as VisitDynamicFormState)
        : undefined,
    salesRequestId: typeof raw.salesRequestId === 'string' ? raw.salesRequestId : undefined,
    selectedPlannerFormType: isVisitSystemPlannerFormType(raw.selectedPlannerFormType)
      ? raw.selectedPlannerFormType
      : isVisitSystemPlannerFormType(raw.dynamicForm?.formTemplateType)
        ? raw.dynamicForm.formTemplateType
        : undefined,
  };
}

/**
 * Loads a persisted visit session for the given appointment.
 */
export function loadVisitSession(appointmentId: string): VisitSession | null {
  try {
    const raw = localStorage.getItem(visitSessionKey(appointmentId));
    if (!raw) {
      return null;
    }

    return normalizeVisitSession(JSON.parse(raw) as VisitSession);
  } catch {
    return null;
  }
}

/**
 * Persists the current visit session to localStorage.
 */
export function saveVisitSession(session: VisitSession): void {
  localStorage.setItem(visitSessionKey(session.appointmentId), JSON.stringify(session));
}

/**
 * Removes a persisted visit session after the visit is finished.
 */
export function clearVisitSession(appointmentId: string): void {
  localStorage.removeItem(visitSessionKey(appointmentId));
}

/**
 * Creates a new visit session with default empty state.
 */
export function createVisitSession(appointmentId: string): VisitSession {
  return normalizeVisitSession({
    appointmentId,
    startedAt: new Date().toISOString(),
    notes: '',
    photos: [],
  });
}

/**
 * Rehydrates an in-progress visit session from a saved appointment feedback record.
 */
export function sessionFromStoredRecord(
  appointmentId: string,
  record: StoredVisitRecord,
): VisitSession {
  return normalizeVisitSession({
    appointmentId,
    startedAt: record.startedAt,
    notes: record.notes,
    photos: record.photos,
    rfcForm: record.rfcForm,
    rfcCompletedAt: record.rfcCompletedAt,
    loanRentalForm: record.loanRentalForm,
    loanRentalCompletedAt: record.loanRentalCompletedAt,
    newServiceLevelForm: record.newServiceLevelForm,
    newServiceLevelCompletedAt: record.newServiceLevelCompletedAt,
    dynamicForm: record.dynamicForm,
    selectedPlannerFormType: record.selectedPlannerFormType,
  });
}

/**
 * Formats elapsed milliseconds as HH:MM:SS for the visit timer display.
 */
export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Formats an ISO timestamp for compact field display.
 */
export function formatVisitClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats an ISO timestamp for visit history date headings.
 */
export function formatVisitHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats visit duration as a human-readable minute count for history display.
 */
export function formatVisitDurationMinutes(durationSeconds: number): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

interface BuildVisitRecordContext {
  location?: string;
  geoLocation?: { coordinates?: number[] };
  attendanceLocation?: { coordinates?: number[] };
  attendanceMethod?: string;
  attendanceAccuracy?: number;
  visitGpsVerification?: {
    verified?: boolean;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    address?: string;
    capturedAt?: string;
    capturedBy?: string;
    appointmentId?: string;
    outsideExpectedLocation?: boolean;
    distanceFromExpectedMeters?: number;
  };
  outcome?: string;
  inProgress?: boolean;
}

/**
 * Builds GPS confirmation metadata for a completed visit record.
 */
function buildGpsConfirmation(context?: BuildVisitRecordContext): VisitGpsConfirmation {
  const gps = context?.visitGpsVerification;
  if (
    gps?.verified &&
    Number.isFinite(Number(gps.latitude)) &&
    Number.isFinite(Number(gps.longitude))
  ) {
    const latitude = Number(gps.latitude);
    const longitude = Number(gps.longitude);
    return {
      available: true,
      coordinates: [longitude, latitude],
      latitude,
      longitude,
      method: context?.attendanceMethod || 'gps_verification',
      accuracyMeters: gps.accuracyMeters ?? context?.attendanceAccuracy,
      label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      address: gps.address,
      capturedAt: gps.capturedAt,
      capturedBy: gps.capturedBy,
      appointmentId: gps.appointmentId,
      outsideExpectedLocation: gps.outsideExpectedLocation,
      distanceFromExpectedMeters: gps.distanceFromExpectedMeters,
    };
  }

  const attendanceCoords = context?.attendanceLocation?.coordinates;
  const appointmentCoords = context?.geoLocation?.coordinates;
  const coordinates =
    attendanceCoords?.length === 2
      ? ([Number(attendanceCoords[0]), Number(attendanceCoords[1])] as [number, number])
      : appointmentCoords?.length === 2
        ? ([Number(appointmentCoords[0]), Number(appointmentCoords[1])] as [number, number])
        : undefined;

  if (!coordinates) {
    return { available: false };
  }

  return {
    available: true,
    coordinates,
    longitude: coordinates[0],
    latitude: coordinates[1],
    method: context?.attendanceMethod,
    accuracyMeters: context?.attendanceAccuracy,
    label: `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
  };
}

/**
 * Builds the structured visit record saved permanently with the appointment.
 */
export function buildVisitRecord(
  session: VisitSession,
  endedAt: string,
  durationSeconds: number,
  context?: BuildVisitRecordContext,
): StoredVisitRecord {
  return {
    startedAt: session.startedAt,
    endedAt,
    durationSeconds,
    durationLabel: formatElapsedTime(durationSeconds * 1000),
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    notes: session.notes,
    photos: session.photos,
    photoCount: session.photos.length,
    location: context?.location,
    pinnedGeoLocation: context?.geoLocation?.coordinates?.length === 2
      ? {
          type: 'Point',
          coordinates: [
            Number(context.geoLocation.coordinates[0]),
            Number(context.geoLocation.coordinates[1]),
          ] as [number, number],
        }
      : undefined,
    gpsConfirmation: buildGpsConfirmation(context),
    outcome: context?.inProgress ? undefined : context?.outcome,
    inProgress: context?.inProgress,
    rfcForm: session.rfcForm,
    rfcCompletedAt: session.rfcCompletedAt,
    loanRentalForm: session.loanRentalForm,
    loanRentalCompletedAt: session.loanRentalCompletedAt,
    newServiceLevelForm: session.newServiceLevelForm,
    newServiceLevelCompletedAt: session.newServiceLevelCompletedAt,
    dynamicForm: session.dynamicForm,
    selectedPlannerFormType: session.selectedPlannerFormType,
  };
}

/**
 * Parses a persisted visit record from appointment feedback JSON.
 */
export function parseStoredVisitRecord(feedback?: string | null): StoredVisitRecord | null {
  if (!feedback?.trim()) {
    return null;
  }

  try {
    const raw = JSON.parse(feedback) as Partial<StoredVisitRecord>;
    if (!raw.startedAt || !raw.endedAt) {
      return null;
    }

    const durationSeconds = raw.durationSeconds || 0;
    const photos = Array.isArray(raw.photos)
      ? raw.photos.map((photo, index) =>
          typeof photo === 'string'
            ? { id: `legacy-${index}`, dataUrl: photo, caption: '' }
            : photo,
        )
      : [];

    return {
      startedAt: raw.startedAt,
      endedAt: raw.endedAt,
      durationSeconds,
      durationLabel: raw.durationLabel || formatElapsedTime(durationSeconds * 1000),
      durationMinutes: raw.durationMinutes || Math.max(1, Math.round(durationSeconds / 60)),
      notes: raw.notes || '',
      photos,
      photoCount: raw.photoCount ?? photos.length,
      location: raw.location,
      pinnedGeoLocation: raw.pinnedGeoLocation,
      gpsConfirmation: raw.gpsConfirmation,
      outcome: raw.outcome,
      inProgress: raw.inProgress,
      rfcForm: raw.rfcForm ? normalizeRfcForm(raw.rfcForm) : undefined,
      rfcCompletedAt: raw.rfcCompletedAt,
      loanRentalForm: raw.loanRentalForm
        ? normalizeLoanRentalForm(raw.loanRentalForm)
        : undefined,
      loanRentalCompletedAt: raw.loanRentalCompletedAt,
      newServiceLevelForm: raw.newServiceLevelForm
        ? normalizeNewServiceLevelForm(raw.newServiceLevelForm)
        : undefined,
      newServiceLevelCompletedAt: raw.newServiceLevelCompletedAt,
      dynamicForm:
        raw.dynamicForm &&
        typeof raw.dynamicForm === 'object' &&
        raw.dynamicForm.formSchemaSnapshot &&
        raw.dynamicForm.values
          ? raw.dynamicForm
          : undefined,
      selectedPlannerFormType: isVisitSystemPlannerFormType(raw.selectedPlannerFormType)
        ? raw.selectedPlannerFormType
        : isVisitSystemPlannerFormType(raw.dynamicForm?.formTemplateType)
          ? raw.dynamicForm.formTemplateType
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Generates a compact unique id for visit media items.
 */
export function createVisitItemId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Inserts a bullet point at the cursor or appends one to visit notes.
 */
export function insertBulletPoint(notes: string, textarea?: HTMLTextAreaElement | null): string {
  const bullet = '• ';
  if (!textarea) {
    return notes ? `${notes}\n${bullet}` : bullet;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = notes.slice(0, start);
  const after = notes.slice(end);
  const prefix = before.endsWith('\n') || before.length === 0 ? '' : '\n';
  return `${before}${prefix}${bullet}${after}`;
}
