import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Clock,
  FileText,
  List,
  Loader2,
  Save,
  StickyNote,
  X,
} from 'lucide-react';
import { createSalesRequest, listSalesRequests, submitSalesRequest, updateAppointment, updateSalesRequest, getPublishedPlannerForm } from '../../lib/api';
import type { SalesRequest, SalesRequestType, PlannerFormPublished } from '../../lib/api';
import type { PlannerAppointment } from './DiaryDayAppointmentCard';
import { DiaryCompletedDot } from './DiaryCompletedDot';
import {
  buildVisitRecord,
  clearVisitSession,
  createVisitItemId,
  createVisitSession,
  formatElapsedTime,
  formatVisitClockTime,
  insertBulletPoint,
  loadVisitSession,
  parseStoredVisitRecord,
  resolveVisitBookingDate,
  saveVisitSession,
  sessionFromStoredRecord,
  VISIT_BOOKING_SHORTCUTS,
  VISIT_COMPLETION_OPTIONS,
  type VisitBookingShortcut,
  type VisitCompletionAction,
  type VisitPhoto,
  type VisitSession,
  type VisitDynamicFormState,
} from './visitUtils';
import {
  appointmentTypeToPlannerFormType,
  appointmentTypeToSalesRequestType,
  getAppointmentLeadId,
  isLoanRentalAppointmentType,
  isNewServiceLevelAppointmentType,
  isRfcSheetAppointmentType,
  normalizeDiaryAppointmentType,
} from './diaryUtils';
import DiaryRfcForm from './DiaryRfcForm';
import DiaryLoanRentalForm from './DiaryLoanRentalForm';
import DiaryNewServiceLevelForm from './DiaryNewServiceLevelForm';
import {
  DynamicPlannerFormRenderer,
  createEmptyDynamicFormValues,
  getMissingRequiredDynamicFields,
} from './DynamicPlannerFormRenderer';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { reverseGeocode } from '../../utils/geocoding';
import type { VisitGpsVerification } from '../../types';
import { enqueueOfflineVisitSync } from '../../mobile-rep/useOfflineVisitSync';
import VisitLocationPermissionModal from './VisitLocationPermissionModal';
import {
  createEmptyRfcForm,
  getRfcFormProgress,
  normalizeRfcForm,
  prefillRfcForm,
  type RfcFormData,
} from './rfcFormUtils';
import {
  createEmptyLoanRentalForm,
  getLoanRentalFormProgress,
  normalizeLoanRentalForm,
  prefillLoanRentalForm,
  type LoanRentalFormData,
} from './loanRentalFormUtils';
import {
  createEmptyNewServiceLevelForm,
  getNewServiceLevelFormProgress,
  normalizeNewServiceLevelForm,
  prefillNewServiceLevelForm,
  type NewServiceLevelFormData,
} from './newServiceLevelFormUtils';

const AUTO_SAVE_DELAY_MS = 1500;

/** Tabs shown inside an active visit. Sheet tabs are type-specific. */
type VisitWorkspaceTab = 'rfc' | 'loan_rental' | 'new_service_level' | 'notes';

interface DiaryVisitWorkspaceProps {
  appointment: PlannerAppointment | null;
  onClose: () => void;
  onFinished: () => Promise<void>;
  onCompletionAction?: (
    action: VisitCompletionAction,
    appointment: PlannerAppointment,
    booking?: { shortcut: VisitBookingShortcut; suggestedDate?: string },
  ) => void;
}

interface VisitCompletionDialogProps {
  durationLabel: string;
  isProcessing: boolean;
  /** When true, the visit was submitted for admin approval rather than archived. */
  submittedForApproval?: boolean;
  onFinishClose: () => void;
  onBookVisit: (shortcut: VisitBookingShortcut, suggestedDate?: string) => void;
}

/**
 * Post-visit dialog with finish or book-next-visit shortcuts.
 */
const VisitCompletionDialog: React.FC<VisitCompletionDialogProps> = ({
  durationLabel,
  isProcessing,
  submittedForApproval = false,
  onFinishClose,
  onBookVisit,
}) => {
  const [showBookingShortcuts, setShowBookingShortcuts] = useState(false);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <DiaryCompletedDot size="md" className="!h-3 !w-3" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            {submittedForApproval ? 'Submitted for Approval' : 'Visit Completed Successfully'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Duration {durationLabel}</p>
          <p className="mt-2 text-xs text-emerald-700">
            {submittedForApproval
              ? 'Status is Pending Approval. Nothing is created until an admin approves. This submission is locked until then.'
              : 'Saved to History — open History anytime to review notes and photos.'}
          </p>
          {!showBookingShortcuts && (
            <p className="mt-4 text-sm font-medium text-slate-700">What would you like to do?</p>
          )}
        </div>

        {!showBookingShortcuts ? (
          <div className="mt-4 space-y-2">
            {VISIT_COMPLETION_OPTIONS.map((option) => (
              <button
                key={option.action}
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  option.action === 'finish_close'
                    ? onFinishClose()
                    : setShowBookingShortcuts(true)
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
              >
                <span className="text-lg">{option.emoji}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-3 text-center text-sm font-medium text-slate-700">When should the next visit be?</p>
            <div className="grid grid-cols-2 gap-2">
              {VISIT_BOOKING_SHORTCUTS.map((option) => (
                <button
                  key={option.shortcut}
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    onBookVisit(option.shortcut, resolveVisitBookingDate(option.shortcut))
                  }
                  className="rounded-2xl border border-slate-200 px-3 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setShowBookingShortcuts(false)}
              className="mt-3 w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Builds visit record context from the active appointment and optional live GPS proof.
 */
function buildVisitContext(
  appointment: PlannerAppointment,
  inProgress: boolean,
  outcome?: string,
  visitGpsVerification?: VisitGpsVerification | null,
) {
  const hasVerifiedCoords =
    Boolean(visitGpsVerification?.verified) &&
    Number.isFinite(Number(visitGpsVerification?.latitude)) &&
    Number.isFinite(Number(visitGpsVerification?.longitude));

  return {
    location: appointment.location,
    geoLocation: appointment.geoLocation,
    attendanceLocation: hasVerifiedCoords
      ? {
          type: 'Point' as const,
          coordinates: [
            Number(visitGpsVerification!.longitude),
            Number(visitGpsVerification!.latitude),
          ] as [number, number],
        }
      : appointment.attendanceLocation,
    attendanceMethod: hasVerifiedCoords
      ? 'gps_verification'
      : appointment.attendanceMethod,
    attendanceAccuracy:
      visitGpsVerification?.accuracyMeters ?? appointment.attendanceAccuracy,
    visitGpsVerification: visitGpsVerification || appointment.visitGpsVerification,
    outcome,
    inProgress,
  };
}

/**
 * Builds the RFC sheet for an appointment, keeping anything already captured
 * and prefilling the customer block from the linked CRM record.
 */
function resolveRfcFormForAppointment(
  appointment: PlannerAppointment,
  existing?: RfcFormData | null,
): RfcFormData {
  const rep = appointment.assignedRep;
  const repDetails =
    rep && typeof rep === 'object' ? (rep as { name?: string; code?: string }) : undefined;

  return prefillRfcForm(existing ? normalizeRfcForm(existing) : createEmptyRfcForm(), {
    companyName: appointment.salesLead?.companyName,
    contactPerson: appointment.salesLead?.contactPerson,
    contactPhone: appointment.salesLead?.contactPhone,
    contactEmail: appointment.salesLead?.contactEmail,
    contactAddress: appointment.salesLead?.contactAddress,
    location: appointment.location,
    repCode: repDetails?.code,
    repName: repDetails?.name,
  });
}

/**
 * Builds the Loan & Rental sheet for an appointment, keeping anything already
 * captured and prefilling customer details from the linked CRM record.
 */
function resolveLoanRentalFormForAppointment(
  appointment: PlannerAppointment,
  existing?: LoanRentalFormData | null,
): LoanRentalFormData {
  const rep = appointment.assignedRep;
  const repDetails =
    rep && typeof rep === 'object' ? (rep as { name?: string; code?: string }) : undefined;

  return prefillLoanRentalForm(
    existing ? normalizeLoanRentalForm(existing) : createEmptyLoanRentalForm(),
    {
      companyName: appointment.salesLead?.companyName,
      contactPerson: appointment.salesLead?.contactPerson,
      contactPhone: appointment.salesLead?.contactPhone,
      contactEmail: appointment.salesLead?.contactEmail,
      repCode: repDetails?.code,
      repName: repDetails?.name,
    },
  );
}

/**
 * Builds the New Service Level sheet for an appointment, keeping anything
 * already captured and prefilling customer details from the CRM record.
 */
function resolveNewServiceLevelFormForAppointment(
  appointment: PlannerAppointment,
  existing?: NewServiceLevelFormData | null,
): NewServiceLevelFormData {
  const rep = appointment.assignedRep;
  const repDetails =
    rep && typeof rep === 'object' ? (rep as { name?: string; code?: string }) : undefined;

  return prefillNewServiceLevelForm(
    existing ? normalizeNewServiceLevelForm(existing) : createEmptyNewServiceLevelForm(),
    {
      companyName: appointment.salesLead?.companyName,
      contactPerson: appointment.salesLead?.contactPerson,
      contactPhone: appointment.salesLead?.contactPhone,
      contactEmail: appointment.salesLead?.contactEmail,
      repCode: repDetails?.code,
      repName: repDetails?.name,
    },
  );
}

/**
 * Resolves sheet type + form payload from the active visit session.
 */
function resolveSheetPayloadFromSession(session: VisitSession, appointment: PlannerAppointment): {
  requestType: SalesRequestType;
  formData: Record<string, unknown>;
} | null {
  if (session.dynamicForm) {
    const requestType = appointmentTypeToSalesRequestType(appointment.appointmentType);
    if (!requestType) return null;
    return {
      requestType,
      formData: {
        formTemplateType: session.dynamicForm.formTemplateType,
        formTemplateVersion: session.dynamicForm.formTemplateVersion,
        formSchemaSnapshot: session.dynamicForm.formSchemaSnapshot,
        values: session.dynamicForm.values,
      },
    };
  }

  if (isRfcSheetAppointmentType(appointment.appointmentType) && session.rfcForm) {
    return {
      requestType: 'rfc',
      formData: session.rfcForm as unknown as Record<string, unknown>,
    };
  }
  if (isLoanRentalAppointmentType(appointment.appointmentType) && session.loanRentalForm) {
    return {
      requestType: appointmentTypeToSalesRequestType(appointment.appointmentType) || 'loan_rental',
      formData: session.loanRentalForm as unknown as Record<string, unknown>,
    };
  }
  if (
    isNewServiceLevelAppointmentType(appointment.appointmentType) &&
    session.newServiceLevelForm
  ) {
    return {
      requestType: 'rfc_new_service_level',
      formData: session.newServiceLevelForm as unknown as Record<string, unknown>,
    };
  }
  return null;
}

/**
 * Builds a visit dynamic form state from a published Super Admin template.
 */
function buildDynamicFormState(
  published: PlannerFormPublished & { type?: string },
  existingValues?: VisitDynamicFormState['values'],
): VisitDynamicFormState {
  const type = (published.type || 'rfc') as VisitDynamicFormState['formTemplateType'];
  return {
    formTemplateType: type,
    formTemplateVersion: published.version,
    formSchemaSnapshot: published,
    values: existingValues || createEmptyDynamicFormValues(published.fields || []),
  };
}

/**
 * Minimal field visit workspace: timer, notes, photos, auto-save, and finish flow.
 * RFC, Loan Rental and New Service Level appointments open their sheets first.
 */
const DiaryVisitWorkspace: React.FC<DiaryVisitWorkspaceProps> = ({
  appointment,
  onClose,
  onFinished,
  onCompletionAction,
}) => {
  const { user } = useAuth();
  const { getCurrentPosition, isSupported: isGeolocationSupported, permissionState } =
    useGeolocation({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });
  const [session, setSession] = useState<VisitSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [savedDurationLabel, setSavedDurationLabel] = useState('');
  const [visitFrozenAt, setVisitFrozenAt] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<VisitWorkspaceTab>('notes');
  const [showDynamicValidation, setShowDynamicValidation] = useState(false);
  const [visitGpsVerification, setVisitGpsVerification] =
    useState<VisitGpsVerification | null>(null);
  const visitGpsRef = useRef<VisitGpsVerification | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptLoading, setLocationPromptLoading] = useState(false);
  /** When true, the rep chose to continue without enabling location for this visit. */
  const [locationDeclined, setLocationDeclined] = useState(false);
  const locationPromptShownRef = useRef<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<VisitSession | null>(null);
  const appointmentRef = useRef(appointment);
  const elapsedMsRef = useRef(0);

  appointmentRef.current = appointment;
  sessionRef.current = session;
  visitGpsRef.current = visitGpsVerification;

  useEffect(() => {
    if (!appointment) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [appointment]);

  useEffect(() => {
    if (!appointment) {
      return;
    }

    const localSession = loadVisitSession(appointment._id) || createVisitSession(appointment._id);
    const storedRecord = parseStoredVisitRecord(appointment.feedback);
    let restoredSession = localSession;

    // Pending approval / rejected visits must stay editable until explicit submit (or after reject).
    const isCompletedVisit =
      appointment.status === 'completed' ||
      (Boolean(appointment.attended) &&
        appointment.status !== 'pending_approval' &&
        appointment.status !== 'rejected' &&
        appointment.status !== 'in_progress');

    if (
      storedRecord &&
      (appointment.status === 'in_progress' ||
        appointment.status === 'rejected' ||
        isCompletedVisit)
    ) {
      const serverSession = sessionFromStoredRecord(appointment._id, storedRecord);
      restoredSession = {
        ...localSession,
        startedAt: serverSession.startedAt,
        notes: serverSession.notes.length >= localSession.notes.length
          ? serverSession.notes
          : localSession.notes,
        photos:
          serverSession.photos.length >= localSession.photos.length
            ? serverSession.photos
            : localSession.photos,
        rfcForm: localSession.rfcForm ?? serverSession.rfcForm,
        rfcCompletedAt: localSession.rfcCompletedAt ?? serverSession.rfcCompletedAt,
        loanRentalForm: localSession.loanRentalForm ?? serverSession.loanRentalForm,
        loanRentalCompletedAt:
          localSession.loanRentalCompletedAt ?? serverSession.loanRentalCompletedAt,
        newServiceLevelForm:
          localSession.newServiceLevelForm ?? serverSession.newServiceLevelForm,
        newServiceLevelCompletedAt:
          localSession.newServiceLevelCompletedAt ?? serverSession.newServiceLevelCompletedAt,
        dynamicForm: localSession.dynamicForm ?? serverSession.dynamicForm,
      };
    }

    const isRfcVisit = isRfcSheetAppointmentType(appointment.appointmentType);
    const isLoanRentalVisit = isLoanRentalAppointmentType(appointment.appointmentType);
    const isNewServiceLevelVisit = isNewServiceLevelAppointmentType(appointment.appointmentType);
    const plannerFormType = appointmentTypeToPlannerFormType(appointment.appointmentType);
    setSession({
      ...restoredSession,
      rfcForm: undefined,
      loanRentalForm: undefined,
      newServiceLevelForm: undefined,
      dynamicForm: restoredSession.dynamicForm,
    });
    setActiveTab(
      (isRfcVisit || isLoanRentalVisit || isNewServiceLevelVisit) && !isCompletedVisit
        ? isRfcVisit
          ? 'rfc'
          : isLoanRentalVisit
            ? 'loan_rental'
            : 'new_service_level'
        : 'notes',
    );

    setError(null);
    setShowCompletionDialog(false);
    setVisitFrozenAt(
      isCompletedVisit && storedRecord
        ? new Date(storedRecord.endedAt).getTime()
        : null,
    );
    setSavedDurationLabel('');
    setLastSavedAt(null);
    setVisitGpsVerification(null);
    visitGpsRef.current = null;
    setLocationDeclined(false);
    setShowLocationPrompt(false);
    setLocationPromptLoading(false);

    /**
     * Always load the latest published Super Admin form for in-progress visits,
     * so Save/Publish changes appear when the rep presses Start.
     */
    let cancelled = false;
    void (async () => {
      try {
        if (plannerFormType && !isCompletedVisit) {
          const published = await getPublishedPlannerForm(plannerFormType);
          if (!cancelled) {
            setSession((current) => {
              if (!current) return current;
              // Do not overwrite a sheet the rep already finished in this visit.
              if (current.dynamicForm?.completedAt) return current;

              const previousValues = current.dynamicForm?.values || {};
              const previousFields = current.dynamicForm?.formSchemaSnapshot?.fields || [];
              const nextValues = createEmptyDynamicFormValues(published.fields || []);

              for (const field of published.fields || []) {
                if (previousValues[field.id] != null && previousValues[field.id] !== '') {
                  nextValues[field.id] = previousValues[field.id];
                  continue;
                }
                const byKey = previousFields.find((row) => row.key === field.key);
                if (byKey && previousValues[byKey.id] != null && previousValues[byKey.id] !== '') {
                  nextValues[field.id] = previousValues[byKey.id];
                }
              }

              const next: VisitSession = {
                ...current,
                dynamicForm: {
                  formTemplateType: plannerFormType,
                  formTemplateVersion: published.version,
                  formSchemaSnapshot: { ...published, type: plannerFormType },
                  values: nextValues,
                },
                rfcForm: undefined,
                loanRentalForm: undefined,
                newServiceLevelForm: undefined,
              };
              saveVisitSession(next);
              return next;
            });
          }
        }

        const { requests } = await listSalesRequests({
          appointment: appointment._id,
          limit: 20,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        if (cancelled) return;
        const editable = requests.find(
          (item) => item.status === 'draft' || item.status === 'declined',
        );
        if (!editable?._id) return;

        setSession((current) => {
          if (!current) return current;
          const formData = editable.formData || {};
          const hasDynamic =
            Boolean(formData.formSchemaSnapshot) &&
            Boolean(formData.values) &&
            typeof formData.values === 'object';

          // Prefer latest published schema; keep draft answers when keys match.
          const next: VisitSession = {
            ...current,
            salesRequestId: editable._id,
            notes: current.notes || editable.visitNotes || '',
            dynamicForm:
              current.dynamicForm ||
              (hasDynamic
                ? {
                    formTemplateType:
                      (formData.formTemplateType as VisitDynamicFormState['formTemplateType']) ||
                      plannerFormType ||
                      'rfc',
                    formTemplateVersion: Number(formData.formTemplateVersion) || 1,
                    formSchemaSnapshot: formData.formSchemaSnapshot as PlannerFormPublished,
                    values: formData.values as VisitDynamicFormState['values'],
                    completedAt: undefined,
                  }
                : current.dynamicForm),
          };
          saveVisitSession(next);
          return next;
        });
      } catch {
        if (plannerFormType) {
          setSession((current) => {
            if (!current || current.dynamicForm) return current;
            if (isRfcVisit) {
              return {
                ...current,
                rfcForm: resolveRfcFormForAppointment(appointment, current.rfcForm),
              };
            }
            if (isLoanRentalVisit) {
              return {
                ...current,
                loanRentalForm: resolveLoanRentalFormForAppointment(
                  appointment,
                  current.loanRentalForm,
                ),
              };
            }
            if (isNewServiceLevelVisit) {
              return {
                ...current,
                newServiceLevelForm: resolveNewServiceLevelFormForAppointment(
                  appointment,
                  current.newServiceLevelForm,
                ),
              };
            }
            return current;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointment]);

  /**
   * When the visit form opens, prompt for location if it is not already granted.
   */
  useEffect(() => {
    if (!appointment?._id) return;

    const isCompletedVisit =
      appointment.status === 'completed' ||
      (Boolean(appointment.attended) &&
        appointment.status !== 'pending_approval' &&
        appointment.status !== 'rejected' &&
        appointment.status !== 'in_progress');

    if (isCompletedVisit) return;
    if (locationPromptShownRef.current === appointment._id) return;
    locationPromptShownRef.current = appointment._id;

    let cancelled = false;

    void (async () => {
      if (!isGeolocationSupported) {
        if (!cancelled) {
          setLocationDeclined(true);
          setShowLocationPrompt(true);
        }
        return;
      }

      try {
        if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
          const result = await navigator.permissions.query({
            name: 'geolocation' as PermissionName,
          });
          if (cancelled) return;
          if (result.state === 'granted') {
            setLocationDeclined(false);
            setShowLocationPrompt(false);
            return;
          }
        }
      } catch {
        // Fall through to prompt when Permissions API is unavailable.
      }

      if (!cancelled) {
        setShowLocationPrompt(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointment, isGeolocationSupported]);

  /**
   * Requests browser location permission from the open-form prompt.
   */
  async function handleEnableVisitLocation(): Promise<void> {
    setLocationPromptLoading(true);
    try {
      const position = await getCurrentPosition();
      if (position) {
        setLocationDeclined(false);
        setShowLocationPrompt(false);
        return;
      }
      setLocationDeclined(true);
    } finally {
      setLocationPromptLoading(false);
    }
  }

  /**
   * Lets the rep continue filling the form without location; decline is recorded on submit.
   */
  function handleContinueWithoutVisitLocation(): void {
    setLocationDeclined(true);
    setShowLocationPrompt(false);
  }

  useEffect(() => {
    if (!appointment || !session) {
      return;
    }

    saveVisitSession(session);
  }, [appointment, session]);

  useEffect(() => {
    if (!appointment || !session || showCompletionDialog) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [appointment, session, showCompletionDialog]);

  const elapsedMs = useMemo(() => {
    if (!session) {
      return 0;
    }

    const endTime = visitFrozenAt ?? now;
    return endTime - new Date(session.startedAt).getTime();
  }, [now, session, visitFrozenAt]);

  elapsedMsRef.current = elapsedMs;

  const elapsedLabel = useMemo(() => formatElapsedTime(elapsedMs), [elapsedMs]);

  /**
 * Persists notes and photos to the server while in progress, or marks complete / pending approval on finish.
 */
  const persistVisitProgress = useCallback(async (
    markComplete: boolean,
    sessionOverride?: VisitSession,
    options?: { submitForApproval?: boolean },
  ): Promise<void> => {
    const currentAppointment = appointmentRef.current;
    const currentSession = sessionOverride ?? sessionRef.current;

    if (!currentAppointment || !currentSession) {
      return;
    }

    const leadId = getAppointmentLeadId(currentAppointment);
    if (!leadId) {
      throw new Error('Unable to resolve the linked customer for this appointment.');
    }

    const isEditingCompletedVisit =
      currentAppointment.status === 'completed' || Boolean(currentAppointment.attended);
    const existingRecord = parseStoredVisitRecord(currentAppointment.feedback);
    const endedAt =
      isEditingCompletedVisit && existingRecord
        ? existingRecord.endedAt
        : new Date().toISOString();
    const durationSeconds =
      isEditingCompletedVisit && existingRecord
        ? existingRecord.durationSeconds
        : Math.max(1, Math.floor(elapsedMsRef.current / 1000));
    const submitForApproval = Boolean(options?.submitForApproval);
    const gpsProof = visitGpsRef.current;
    const visitRecord = buildVisitRecord(
      currentSession,
      endedAt,
      durationSeconds,
      buildVisitContext(
        currentAppointment,
        !markComplete && !isEditingCompletedVisit,
        markComplete
          ? submitForApproval
            ? 'Submitted for approval'
            : 'Visit completed'
          : isEditingCompletedVisit
            ? 'Visit completed'
            : undefined,
        gpsProof,
      ),
    );

    if (markComplete) {
      await updateAppointment(leadId, currentAppointment._id, {
        attended: true,
        status: submitForApproval ? 'pending_approval' : 'completed',
        attendedAt: endedAt,
        outcome: submitForApproval ? 'Submitted for approval' : 'Visit completed',
        notes: currentSession.notes || currentAppointment.notes,
        feedback: JSON.stringify(visitRecord),
        ...(gpsProof
          ? {
              visitGpsVerification: gpsProof,
              ...(gpsProof.verified &&
              Number.isFinite(Number(gpsProof.latitude)) &&
              Number.isFinite(Number(gpsProof.longitude))
                ? {
                    attendanceLocation: {
                      type: 'Point' as const,
                      coordinates: [
                        Number(gpsProof.longitude),
                        Number(gpsProof.latitude),
                      ] as [number, number],
                    },
                    attendanceAccuracy: gpsProof.accuracyMeters,
                    attendanceMethod: 'gps_verification' as const,
                  }
                : {}),
            }
          : {}),
        internalNotes: [
          currentAppointment.internalNotes,
          `Visit duration: ${visitRecord.durationLabel}`,
          submitForApproval ? 'Awaiting admin approval' : undefined,
        ]
          .filter(Boolean)
          .join('\n'),
      });
      return;
    }

    if (isEditingCompletedVisit) {
      await updateAppointment(leadId, currentAppointment._id, {
        attended: true,
        status: 'completed',
        notes: currentSession.notes || currentAppointment.notes,
        feedback: JSON.stringify(visitRecord),
      });
      return;
    }

    if (
      currentAppointment.status !== 'in_progress' &&
      currentAppointment.status !== 'completed' &&
      currentAppointment.status !== 'cancelled'
    ) {
      await updateAppointment(leadId, currentAppointment._id, { status: 'in_progress' });
    }

    await updateAppointment(leadId, currentAppointment._id, {
      status: 'in_progress',
      notes: currentSession.notes || currentAppointment.notes,
      feedback: JSON.stringify(visitRecord),
    });
  }, []);

  /**
   * Creates or updates a draft sales request for the active sheet visit.
   * Does not submit or lock — locking only happens on Submit for Approval.
   */
  const upsertDraftSalesRequest = useCallback(async (
    sessionOverride?: VisitSession,
  ): Promise<SalesRequest> => {
    const currentAppointment = appointmentRef.current;
    const currentSession = sessionOverride ?? sessionRef.current;

    if (!currentAppointment || !currentSession) {
      throw new Error('Visit session is not ready.');
    }

    const leadId = getAppointmentLeadId(currentAppointment);
    if (!leadId) {
      throw new Error('Unable to resolve the linked customer for this appointment.');
    }

    const sheet = resolveSheetPayloadFromSession(currentSession, currentAppointment);
    if (!sheet) {
      throw new Error('Unable to resolve the form data for this visit.');
    }

    const visitPhotos = currentSession.photos.map((photo) => ({
      id: photo.id,
      dataUrl: photo.dataUrl,
      caption: photo.caption || '',
    }));

    let requestId = currentSession.salesRequestId;
    if (!requestId) {
      const { requests } = await listSalesRequests({
        appointment: currentAppointment._id,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      const editable = requests.find(
        (item) => item.status === 'draft' || item.status === 'declined',
      );
      requestId = editable?._id;
    }

    const saved = requestId
      ? await updateSalesRequest(requestId, {
          formData: sheet.formData,
          salesLead: leadId,
          appointment: currentAppointment._id,
          visitNotes: currentSession.notes || undefined,
          visitPhotos,
        })
      : await createSalesRequest({
          requestType: sheet.requestType,
          formData: sheet.formData,
          salesLead: leadId,
          appointment: currentAppointment._id,
          visitNotes: currentSession.notes || undefined,
          visitPhotos,
        });

    const nextSession: VisitSession = {
      ...currentSession,
      salesRequestId: saved._id,
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    saveVisitSession(nextSession);
    return saved;
  }, []);

  useEffect(() => {
    if (!session || !appointment || showCompletionDialog) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        await persistVisitProgress(false);
        setLastSavedAt(new Date());
      } catch (saveError: any) {
        console.error('Visit auto-save failed:', saveError);
        // Keep the local draft and queue a sync for when connectivity returns.
        const currentAppointment = appointmentRef.current;
        const currentSession = sessionRef.current;
        const leadId = currentAppointment ? getAppointmentLeadId(currentAppointment) : null;
        if (currentAppointment && currentSession && leadId && !navigator.onLine) {
          const visitRecord = buildVisitRecord(
            currentSession,
            new Date().toISOString(),
            Math.max(1, Math.floor(elapsedMsRef.current / 1000)),
            buildVisitContext(currentAppointment, true),
          );
          enqueueOfflineVisitSync({
            appointmentId: currentAppointment._id,
            leadId,
            payload: {
              status: 'in_progress',
              notes: currentSession.notes || currentAppointment.notes,
              feedback: JSON.stringify(visitRecord),
            },
          });
        }
      } finally {
        setIsAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    session,
    session?.notes,
    session?.photos,
    session?.rfcForm,
    session?.rfcCompletedAt,
    session?.loanRentalForm,
    session?.loanRentalCompletedAt,
    session?.newServiceLevelForm,
    session?.newServiceLevelCompletedAt,
    session?.dynamicForm,
    appointment,
    showCompletionDialog,
    persistVisitProgress,
  ]);

  useEffect(() => {
    /**
     * Retries an in-progress persist when the device comes back online.
     */
    function handleOnline(): void {
      if (!sessionRef.current || !appointmentRef.current || showCompletionDialog) return;
      void persistVisitProgress(false)
        .then(() => setLastSavedAt(new Date()))
        .catch(() => undefined);
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [persistVisitProgress, showCompletionDialog]);

  if (!appointment || !session) {
    return null;
  }

  const leadId = getAppointmentLeadId(appointment);
  const isEditingCompletedVisit =
    appointment.status === 'completed' || Boolean(appointment.attended);
  const plannerFormType = appointmentTypeToPlannerFormType(appointment.appointmentType);
  const hasDynamicForm = Boolean(session.dynamicForm);
  const isRfcVisit =
    isRfcSheetAppointmentType(appointment.appointmentType) &&
    (hasDynamicForm || Boolean(session.rfcForm));
  const isLoanRentalVisit =
    isLoanRentalAppointmentType(appointment.appointmentType) &&
    (hasDynamicForm || Boolean(session.loanRentalForm));
  const isNewServiceLevelVisit =
    isNewServiceLevelAppointmentType(appointment.appointmentType) &&
    (hasDynamicForm || Boolean(session.newServiceLevelForm));
  const hasSheetForm = isRfcVisit || isLoanRentalVisit || isNewServiceLevelVisit;
  const rfcProgress = session.rfcForm ? getRfcFormProgress(session.rfcForm) : null;
  const loanRentalProgress = session.loanRentalForm
    ? getLoanRentalFormProgress(session.loanRentalForm)
    : null;
  const newServiceLevelProgress = session.newServiceLevelForm
    ? getNewServiceLevelFormProgress(session.newServiceLevelForm)
    : null;
  const sheetCompleted = session.dynamicForm
    ? Boolean(session.dynamicForm.completedAt)
    : isRfcVisit
      ? Boolean(session.rfcCompletedAt)
      : isLoanRentalVisit
        ? Boolean(session.loanRentalCompletedAt)
        : isNewServiceLevelVisit
          ? Boolean(session.newServiceLevelCompletedAt)
          : true;

  /**
   * Updates one field on the active visit session.
   */
  function updateSession(changes: Partial<VisitSession>): void {
    setSession((current) => (current ? { ...current, ...changes } : current));
  }

  /**
   * Completes the Super Admin dynamic form, then moves the rep to notes.
   */
  async function handleFinishDynamicForm(): Promise<void> {
    if (!session.dynamicForm) {
      return;
    }

    const missing = getMissingRequiredDynamicFields(
      session.dynamicForm.formSchemaSnapshot.fields || [],
      session.dynamicForm.values,
    );
    if (missing.length > 0) {
      setShowDynamicValidation(true);
      setError(`Please complete required fields: ${missing.join(', ')}`);
      return;
    }

    const completedSession: VisitSession = {
      ...session,
      dynamicForm: {
        ...session.dynamicForm,
        completedAt: new Date().toISOString(),
      },
    };

    setIsSaving(true);
    setError(null);
    setShowDynamicValidation(false);
    setSession(completedSession);
    sessionRef.current = completedSession;
    saveVisitSession(completedSession);

    try {
      await persistVisitProgress(false, completedSession);
      await upsertDraftSalesRequest(completedSession);
      setLastSavedAt(new Date());
      setActiveTab('notes');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save the form');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Completes and immediately saves the RFC sheet, then moves the rep to the
   * discussion notes without ending the active customer visit.
   * Incomplete fields stay empty as captured — Finish is never blocked.
   */
  async function handleFinishRfc(): Promise<void> {
    if (session.dynamicForm) {
      await handleFinishDynamicForm();
      return;
    }
    if (!session.rfcForm) {
      return;
    }

    const completedSession: VisitSession = {
      ...session,
      rfcCompletedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError(null);
    setSession(completedSession);
    sessionRef.current = completedSession;
    saveVisitSession(completedSession);

    try {
      await persistVisitProgress(false, completedSession);
      // Persist an editable draft — do not lock until Submit for Approval.
      await upsertDraftSalesRequest(completedSession);
      setLastSavedAt(new Date());
      setActiveTab('notes');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save the RFC sheet');
      setActiveTab('rfc');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Completes and immediately saves the Loan & Rental sheet, then moves the
   * rep to discussion notes without ending the active customer visit.
   * Incomplete fields stay empty as captured — Finish is never blocked.
   */
  async function handleFinishLoanRental(): Promise<void> {
    if (session.dynamicForm) {
      await handleFinishDynamicForm();
      return;
    }
    if (!session.loanRentalForm) {
      return;
    }

    const completedSession: VisitSession = {
      ...session,
      loanRentalCompletedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError(null);
    setSession(completedSession);
    sessionRef.current = completedSession;
    saveVisitSession(completedSession);

    try {
      await persistVisitProgress(false, completedSession);
      await upsertDraftSalesRequest(completedSession);
      setLastSavedAt(new Date());
      setActiveTab('notes');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save the Loan & Rental sheet');
      setActiveTab('loan_rental');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Completes and immediately saves the New Service Level sheet, then moves
   * the rep to discussion notes without ending the active customer visit.
   * Incomplete fields stay empty as captured — Finish is never blocked.
   */
  async function handleFinishNewServiceLevel(): Promise<void> {
    if (session.dynamicForm) {
      await handleFinishDynamicForm();
      return;
    }
    if (!session.newServiceLevelForm) {
      return;
    }

    const completedSession: VisitSession = {
      ...session,
      newServiceLevelCompletedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError(null);
    setSession(completedSession);
    sessionRef.current = completedSession;
    saveVisitSession(completedSession);

    try {
      await persistVisitProgress(false, completedSession);
      await upsertDraftSalesRequest(completedSession);
      setLastSavedAt(new Date());
      setActiveTab('notes');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save the New Service Level sheet');
      setActiveTab('new_service_level');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Reads a selected file as a data URL.
   */
  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Adds one or more captured photos to the visit session.
   */
  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    try {
      const newPhotos: VisitPhoto[] = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        newPhotos.push({
          id: createVisitItemId('photo'),
          dataUrl,
          caption: '',
        });
      }

      setSession((current) =>
        current
          ? {
              ...current,
              photos: [...current.photos, ...newPhotos],
            }
          : current,
      );
    } catch {
      setError('Unable to add photo.');
    } finally {
      event.target.value = '';
    }
  }

  /**
   * Updates the caption for one visit photo.
   */
  function updatePhotoCaption(photoId: string, caption: string): void {
    setSession((current) =>
      current
        ? {
            ...current,
            photos: current.photos.map((photo) =>
              photo.id === photoId ? { ...photo, caption } : photo,
            ),
          }
        : current,
    );
  }

  /**
   * Removes one photo from the visit session.
   */
  function removePhoto(photoId: string): void {
    setSession((current) =>
      current
        ? {
            ...current,
            photos: current.photos.filter((photo) => photo.id !== photoId),
          }
        : current,
    );
  }

  /**
   * Inserts a bullet point into the visit notes field.
   */
  function handleInsertBullet(): void {
    const nextNotes = insertBulletPoint(session.notes, notesRef.current);
    updateSession({ notes: nextNotes });
    window.requestAnimationFrame(() => notesRef.current?.focus());
  }

  /**
   * Captures live GPS when available, otherwise records an explicit decline for admin review.
   * Submission is never blocked when location is unavailable.
   */
  async function captureVisitLocationAutomatically(): Promise<VisitGpsVerification> {
    if (!user?.id) {
      throw new Error('You must be signed in to finish this visit.');
    }

    /**
     * Builds the admin-visible decline payload when GPS cannot be captured.
     */
    function buildDeclinedProof(reason: string, status: string): VisitGpsVerification {
      return {
        verified: false,
        declinedByUser: true,
        permissionStatus: status,
        declineReason: reason,
        capturedAt: new Date().toISOString(),
        capturedBy: user!.id,
        appointmentId: appointment?._id,
      };
    }

    if (!isGeolocationSupported) {
      return buildDeclinedProof(
        'GPS is not supported on this device or browser.',
        'unsupported',
      );
    }

    if (locationDeclined) {
      return buildDeclinedProof(
        'Representative continued without enabling location.',
        permissionState === 'denied' ? 'denied' : 'declined',
      );
    }

    const position = await getCurrentPosition();
    if (!position) {
      return buildDeclinedProof(
        'Location was not enabled or could not be captured at submission.',
        permissionState === 'denied' ? 'denied' : 'unavailable',
      );
    }

    let address: string | undefined;
    try {
      const geo = await reverseGeocode(position.latitude, position.longitude);
      address = geo?.displayName;
    } catch {
      // Address is optional — coordinates alone satisfy verification.
    }

    return {
      verified: true,
      declinedByUser: false,
      permissionStatus: 'granted',
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: Math.round(position.accuracy),
      capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
      capturedBy: user.id,
      appointmentId: appointment?._id,
      address,
    };
  }

  /**
   * Starts finish/submit: captures GPS when possible, otherwise records decline and continues.
   */
  async function handleRequestFinishVisit(): Promise<void> {
    if (!leadId) {
      setError('Unable to resolve the linked customer for this appointment.');
      return;
    }

    if (hasSheetForm && !sheetCompleted) {
      setError('Complete the required form before submitting for approval.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const gpsProof = await captureVisitLocationAutomatically();
      await handleFinishVisit(gpsProof);
    } catch (finishError: unknown) {
      const message =
        finishError instanceof Error && finishError.message.trim()
          ? finishError.message
          : 'Failed to finish visit';
      setError(message);
      setIsSaving(false);
    }
  }

  /**
   * Persists GPS proof (or decline) first, then saves visit data and submits for approval when required.
   */
  async function handleFinishVisit(gpsProof: VisitGpsVerification): Promise<void> {
    if (!leadId) {
      setError('Unable to resolve the linked customer for this appointment.');
      return;
    }

    setVisitGpsVerification(gpsProof);
    visitGpsRef.current = gpsProof;
    setIsSaving(true);
    setError(null);

    try {
      const hasVerifiedCoords =
        gpsProof.verified &&
        Number.isFinite(Number(gpsProof.latitude)) &&
        Number.isFinite(Number(gpsProof.longitude));

      await updateAppointment(leadId, appointment._id, {
        visitGpsVerification: gpsProof,
        ...(hasVerifiedCoords
          ? {
              attendanceLocation: {
                type: 'Point' as const,
                coordinates: [Number(gpsProof.longitude), Number(gpsProof.latitude)] as [
                  number,
                  number,
                ],
              },
              attendanceAccuracy: gpsProof.accuracyMeters,
              attendanceMethod: 'gps_verification' as const,
            }
          : {}),
      });

      if (hasSheetForm) {
        if (!sheetCompleted) {
          throw new Error('Complete the required form before submitting for approval.');
        }

        const activeSession = sessionRef.current ?? session;
        const draft = await upsertDraftSalesRequest(activeSession);
        await submitSalesRequest(draft._id, { visitGpsVerification: gpsProof });
        await persistVisitProgress(true, undefined, { submitForApproval: true });
      } else {
        await persistVisitProgress(true);
      }

      clearVisitSession(appointment._id);
      setVisitFrozenAt(Date.now());
      setSavedDurationLabel(formatElapsedTime(elapsedMs));
      setShowCompletionDialog(true);
      await onFinished();
    } catch (finishError: any) {
      setError(finishError.message || 'Failed to finish visit');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Saves edits made to a completed History record without reopening its
   * appointment status, then refreshes the History list and closes the editor.
   */
  async function handleSaveCompletedVisit(): Promise<void> {
    setIsSaving(true);
    setError(null);

    try {
      await persistVisitProgress(false);
      setLastSavedAt(new Date());
      await onFinished();
      onClose();
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save visit changes');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Auto-saves progress and closes the workspace without marking the visit complete.
   */
  async function handleCloseWorkspace(): Promise<void> {
    try {
      await persistVisitProgress(false);
    } catch (closeError) {
      console.error('Failed to save visit before close:', closeError);
    } finally {
      onClose();
    }
  }

  /**
   * Closes the visit workspace after the rep chooses Finish & Close.
   */
  async function handleFinishClose(): Promise<void> {
    setIsProcessingAction(true);

    try {
      onCompletionAction?.('finish_close', appointment);
      onClose();
    } finally {
      setIsProcessingAction(false);
    }
  }

  /**
   * Opens the new appointment flow with a quick booking date shortcut.
   */
  async function handleBookNextVisit(
    shortcut: VisitBookingShortcut,
    suggestedDate?: string,
  ): Promise<void> {
    setIsProcessingAction(true);

    try {
      onCompletionAction?.('book_next_visit', appointment, { shortcut, suggestedDate });
      onClose();
    } finally {
      setIsProcessingAction(false);
    }
  }

  /**
   * Full-viewport overlay (portaled to body) so the visit form covers the entire
   * app shell — diary tabs, sidebar, and mobile nav — after Start Visit.
   */
  return createPortal(
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-slate-100">
      <div className="sticky top-0 z-10 shrink-0 bg-slate-900 px-4 py-4 text-white shadow-lg sm:px-6">
        <div className="flex w-full items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {showCompletionDialog
                ? 'Visit Complete'
                : isEditingCompletedVisit
                  ? 'Editing History Record'
                  : 'Visit in Progress'}
            </div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-3xl font-bold tabular-nums leading-none">{elapsedLabel}</div>
              <div className="pb-0.5 text-xs text-slate-300">
                Started {formatVisitClockTime(session.startedAt)}
              </div>
            </div>
            {!showCompletionDialog && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                {isAutoSaving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </>
                ) : lastSavedAt ? (
                  <>
                    <Save className="h-3 w-3 text-emerald-400" />
                    Auto-saved {formatVisitClockTime(lastSavedAt.toISOString())}
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Notes and photos save automatically
                  </>
                )}
              </p>
            )}
          </div>
          {!showCompletionDialog && (
            <button
              type="button"
              onClick={() => void handleCloseWorkspace()}
              disabled={isSaving}
              className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Close visit workspace"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        {error && (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {hasSheetForm && (
          <div className="mb-3 flex gap-1 rounded-2xl bg-white p-1 shadow-sm">
            {isRfcVisit && (
              <button
                type="button"
                onClick={() => setActiveTab('rfc')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activeTab === 'rfc'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-4 w-4" />
                RFC Sheet
                {rfcProgress && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      activeTab === 'rfc' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {session.rfcCompletedAt
                      ? 'Saved'
                      : `${rfcProgress.filled}/${rfcProgress.total}`}
                  </span>
                )}
              </button>
            )}
            {isLoanRentalVisit && (
              <button
                type="button"
                onClick={() => setActiveTab('loan_rental')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activeTab === 'loan_rental'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-4 w-4" />
                Loan &amp; Rental
                {loanRentalProgress && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      activeTab === 'loan_rental'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {session.loanRentalCompletedAt
                      ? 'Saved'
                      : `${loanRentalProgress.filled}/${loanRentalProgress.total}`}
                  </span>
                )}
              </button>
            )}
            {isNewServiceLevelVisit && (
              <button
                type="button"
                onClick={() => setActiveTab('new_service_level')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activeTab === 'new_service_level'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-4 w-4" />
                New Service Level
                {newServiceLevelProgress && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      activeTab === 'new_service_level'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {session.newServiceLevelCompletedAt
                      ? 'Saved'
                      : `${newServiceLevelProgress.filled}/${newServiceLevelProgress.total}`}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activeTab === 'notes'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <StickyNote className="h-4 w-4" />
              Notes & Photos
            </button>
          </div>
        )}

        {isRfcVisit && activeTab === 'rfc' && (session.dynamicForm || session.rfcForm) && (
          <>
            {session.dynamicForm ? (
              <DynamicPlannerFormRenderer
                schema={session.dynamicForm.formSchemaSnapshot}
                values={session.dynamicForm.values}
                showValidation={showDynamicValidation}
                disabled={showCompletionDialog}
                onChange={(nextValues) =>
                  updateSession({
                    dynamicForm: {
                      ...session.dynamicForm!,
                      values: nextValues,
                      completedAt: undefined,
                    },
                  })
                }
              />
            ) : session.rfcForm ? (
              <DiaryRfcForm
                value={session.rfcForm}
                onChange={(nextForm) =>
                  updateSession({
                    rfcForm: nextForm,
                    rfcCompletedAt: undefined,
                  })
                }
                disabled={showCompletionDialog}
              />
            ) : null}
            {!showCompletionDialog && (
              <div className="sticky bottom-0 z-10 mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleFinishRfc()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Finish RFC & Continue to Notes
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  Saves as a draft. Keep editing until you choose Submit for Approval.
                </p>
              </div>
            )}
          </>
        )}

        {isLoanRentalVisit &&
          activeTab === 'loan_rental' &&
          (session.dynamicForm || session.loanRentalForm) && (
          <>
            {session.dynamicForm ? (
              <DynamicPlannerFormRenderer
                schema={session.dynamicForm.formSchemaSnapshot}
                values={session.dynamicForm.values}
                showValidation={showDynamicValidation}
                disabled={showCompletionDialog}
                onChange={(nextValues) =>
                  updateSession({
                    dynamicForm: {
                      ...session.dynamicForm!,
                      values: nextValues,
                      completedAt: undefined,
                    },
                  })
                }
              />
            ) : session.loanRentalForm ? (
              <DiaryLoanRentalForm
                value={session.loanRentalForm}
                onChange={(nextForm) =>
                  updateSession({
                    loanRentalForm: nextForm,
                    loanRentalCompletedAt: undefined,
                  })
                }
                disabled={showCompletionDialog}
              />
            ) : null}
            {!showCompletionDialog && (
              <div className="sticky bottom-0 z-10 mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleFinishLoanRental()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Finish{' '}
                  {normalizeDiaryAppointmentType(appointment.appointmentType) === 'rental'
                    ? 'Rental'
                    : 'Loan'}{' '}
                  & Continue to Notes
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  Saves as a draft. Keep editing until you choose Submit for Approval.
                </p>
              </div>
            )}
          </>
        )}

        {isNewServiceLevelVisit &&
          activeTab === 'new_service_level' &&
          (session.dynamicForm || session.newServiceLevelForm) && (
            <>
              {session.dynamicForm ? (
                <DynamicPlannerFormRenderer
                  schema={session.dynamicForm.formSchemaSnapshot}
                  values={session.dynamicForm.values}
                  showValidation={showDynamicValidation}
                  disabled={showCompletionDialog}
                  onChange={(nextValues) =>
                    updateSession({
                      dynamicForm: {
                        ...session.dynamicForm!,
                        values: nextValues,
                        completedAt: undefined,
                      },
                    })
                  }
                />
              ) : session.newServiceLevelForm ? (
                <DiaryNewServiceLevelForm
                  value={session.newServiceLevelForm}
                  onChange={(nextForm) =>
                    updateSession({
                      newServiceLevelForm: nextForm,
                      newServiceLevelCompletedAt: undefined,
                    })
                  }
                  disabled={showCompletionDialog}
                />
              ) : null}
              {!showCompletionDialog && (
                <div className="sticky bottom-0 z-10 mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)]">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleFinishNewServiceLevel()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Finish Service Level & Continue to Notes
                  </button>
                  <p className="mt-2 text-center text-[11px] text-slate-500">
                    Saves as a draft. Keep editing until you choose Submit for Approval.
                  </p>
                </div>
              )}
            </>
          )}

        <div
          className={`space-y-3 ${
            (isRfcVisit && activeTab === 'rfc') ||
            (isLoanRentalVisit && activeTab === 'loan_rental') ||
            (isNewServiceLevelVisit && activeTab === 'new_service_level')
              ? 'hidden'
              : ''
          }`}
        >
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <StickyNote className="h-4 w-4 text-emerald-600" />
                Notes
              </div>
              <button
                type="button"
                onClick={handleInsertBullet}
                disabled={showCompletionDialog}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                <List className="h-3.5 w-3.5" />
                Bullet
              </button>
            </div>
            <textarea
              ref={notesRef}
              value={session.notes}
              onChange={(event) => updateSession({ notes: event.target.value })}
              disabled={showCompletionDialog}
              rows={10}
              placeholder="• Customer request&#10;• Site condition&#10;• Next step"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50"
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Camera className="h-4 w-4 text-emerald-600" />
                Photos
              </div>
              {!showCompletionDialog && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Add
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelected}
            />
            {session.photos.length === 0 ? (
              <button
                type="button"
                disabled={showCompletionDialog}
                onClick={() => photoInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-10 text-sm text-slate-500 disabled:opacity-50"
              >
                <Camera className="h-5 w-5" />
                Tap to add photos
              </button>
            ) : (
              <div className="space-y-3">
                {session.photos.map((photo) => (
                  <div key={photo.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <img src={photo.dataUrl} alt={photo.caption || 'Visit photo'} className="h-36 w-full object-cover" />
                    <div className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(event) => updatePhotoCaption(photo.id, event.target.value)}
                        disabled={showCompletionDialog}
                        placeholder="Caption e.g. Front Gate"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-50"
                      />
                      {!showCompletionDialog && (
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {!showCompletionDialog &&
        !(
          (isRfcVisit && activeTab === 'rfc') ||
          (isLoanRentalVisit && activeTab === 'loan_rental') ||
          (isNewServiceLevelVisit && activeTab === 'new_service_level')
        ) && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:px-6">
          {hasSheetForm && !sheetCompleted && (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              {isRfcVisit
                ? 'Return to the RFC Sheet and select “Finish RFC & Continue to Notes” before finishing this visit.'
                : isLoanRentalVisit
                  ? 'Return to Loan & Rental and select “Finish Loan & Rental & Continue to Notes” before finishing this visit.'
                  : 'Return to New Service Level and select “Finish Service Level & Continue to Notes” before finishing this visit.'}
            </div>
          )}
          <div className="w-full">
            <button
              type="button"
              disabled={isSaving || (hasSheetForm && !sheetCompleted)}
              onClick={() =>
                void (isEditingCompletedVisit
                  ? handleSaveCompletedVisit()
                  : handleRequestFinishVisit())
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <DiaryCompletedDot size="sm" className="!bg-white" />}
              {isEditingCompletedVisit
                ? 'Save Changes & Return to History'
                : isSaving
                  ? locationDeclined
                    ? 'Submitting…'
                    : 'Capturing location…'
                  : hasSheetForm
                    ? 'Submit for Approval'
                    : 'Finish Visit'}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Duration {elapsedLabel} ·{' '}
            {isEditingCompletedVisit
              ? 'Changes remain available in History'
              : hasSheetForm
                ? locationDeclined
                  ? 'Location not enabled — admin will see that GPS was declined'
                  : 'Attaches your location on submit, then locks until admin review'
                : locationDeclined
                  ? 'Location not enabled — admin will see that GPS was declined'
                  : 'Attaches your location on submit · review anytime in History'}
          </div>
        </div>
      )}

      <VisitLocationPermissionModal
        visible={showLocationPrompt}
        loading={locationPromptLoading}
        onEnable={() => void handleEnableVisitLocation()}
        onContinueWithout={handleContinueWithoutVisitLocation}
      />

      {showCompletionDialog && (
        <VisitCompletionDialog
          durationLabel={savedDurationLabel}
          isProcessing={isProcessingAction}
          submittedForApproval={hasSheetForm}
          onFinishClose={handleFinishClose}
          onBookVisit={handleBookNextVisit}
        />
      )}
    </div>,
    document.body,
  );
};

export default DiaryVisitWorkspace;
