import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-react';
import { getAppointments, getVisitHistory } from '../../lib/api';
import type { Appointment } from '../../types';
import type { PlannerAppointment } from './DiaryDayAppointmentCard';
import { CompletedVisitTypeLabel } from './DiaryCompletedDot';
import {
  appointmentMatchesFilter,
  formatAppointmentTime,
  formatAppointmentType,
  getAppointmentLeadId,
  isRfcAppointmentType,
  normalizeDiaryAppointmentType,
  startOfDay,
  type DiaryFilter,
} from './diaryUtils';
import {
  formatVisitDurationMinutes,
  parseStoredVisitRecord,
} from './visitUtils';
import { summarizeRfcForm, type RfcFormData } from './rfcFormUtils';
import {
  summarizeLoanRentalForm,
  type LoanRentalFormData,
} from './loanRentalFormUtils';
import {
  summarizeNewServiceLevelForm,
  type NewServiceLevelFormData,
} from './newServiceLevelFormUtils';
import VisitHistoryTimeline from './VisitHistoryTimeline';
import DiaryAppointmentLocationPanel, {
  resolveAppointmentMapCoordinates,
} from './DiaryAppointmentLocationPanel';

type HistoryTypeFilter = 'all' | 'site_visit' | 'rfc' | 'loan_rental' | 'rfc_new_service_level';

interface DiaryHistoryViewProps {
  refreshKey?: number;
  onOpenCustomerProfile?: (leadId: string) => void;
  /** Reopens a completed visit so notes, photos and RFC details can be updated. */
  onResumeVisit?: (appointment: PlannerAppointment) => void;
  /** Returns the rep to the weekly planner from the History tab. */
  onExit?: () => void;
}

/**
 * Resolves the display name for the assigned sales rep.
 */
function getRepDisplayName(appointment: PlannerAppointment): string {
  const rep = appointment.assignedRep;
  if (rep && typeof rep === 'object' && 'name' in rep && rep.name) {
    return String(rep.name);
  }
  if (rep && typeof rep === 'object' && 'code' in rep && rep.code) {
    return String(rep.code);
  }
  return 'Unassigned';
}

/**
 * Builds a short preview of visit notes for history cards.
 */
function getNotesPreview(appointment: PlannerAppointment): string | null {
  const record = parseStoredVisitRecord(appointment.feedback);
  const notes = (record?.notes || appointment.notes || '').trim();
  if (!notes) {
    return null;
  }

  const singleLine = notes.replace(/\s+/g, ' ');
  return singleLine.length > 120 ? `${singleLine.slice(0, 117)}…` : singleLine;
}

/**
 * Returns photo count from structured visit feedback or zero.
 */
function getPhotoCount(appointment: PlannerAppointment): number {
  const record = parseStoredVisitRecord(appointment.feedback);
  return record?.photoCount ?? record?.photos?.length ?? 0;
}

/**
 * Returns visit duration label when available.
 */
function getDurationLabel(appointment: PlannerAppointment): string | null {
  const record = parseStoredVisitRecord(appointment.feedback);
  if (!record || record.durationSeconds <= 0) {
    return null;
  }

  return formatVisitDurationMinutes(record.durationSeconds);
}

/**
 * Returns whether the visit was an RFC or produced RFC-related outcome.
 */
function hasRfqSignal(appointment: PlannerAppointment): boolean {
  if (isRfcAppointmentType(appointment.appointmentType)) {
    return true;
  }

  return /rfc|rfq|quote|quotation/i.test(appointment.outcome || '');
}

/**
 * Returns the RFC sheet captured during the visit, when one exists.
 */
function getRfcForm(appointment: PlannerAppointment): RfcFormData | null {
  return parseStoredVisitRecord(appointment.feedback)?.rfcForm ?? null;
}

/**
 * Returns the Loan & Rental sheet captured during the visit, when one exists.
 */
function getLoanRentalForm(appointment: PlannerAppointment): LoanRentalFormData | null {
  return parseStoredVisitRecord(appointment.feedback)?.loanRentalForm ?? null;
}

/**
 * Returns the New Service Level sheet captured during the visit, when one exists.
 */
function getNewServiceLevelForm(
  appointment: PlannerAppointment,
): NewServiceLevelFormData | null {
  return parseStoredVisitRecord(appointment.feedback)?.newServiceLevelForm ?? null;
}

/**
 * Read-only rendering of a completed RFC sheet inside the visit record.
 */
const RfcFormRecord: React.FC<{ form: RfcFormData }> = ({ form }) => {
  const sections = summarizeRfcForm(form);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <FileText className="h-4 w-4 text-orange-600" />
        RFC Sheet · Internal Request For Costing
      </p>
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-orange-100 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {section.title}
            </p>
            <dl className="space-y-1.5">
              {section.rows.map((row) => (
                <div key={row.label} className="flex flex-wrap gap-x-2 text-xs">
                  <dt className="min-w-[140px] flex-shrink-0 text-slate-500">{row.label}</dt>
                  <dd className="min-w-0 flex-1 whitespace-pre-line font-medium text-slate-800">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {form.acknowledgement.signatureDataUrl && (
        <div className="mt-3 rounded-lg border border-orange-100 bg-white p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Customer Signature
          </p>
          <img
            src={form.acknowledgement.signatureDataUrl}
            alt="Customer signature"
            className="h-28 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Read-only rendering of a completed Loan & Rental sheet inside the visit record.
 */
const LoanRentalFormRecord: React.FC<{ form: LoanRentalFormData }> = ({ form }) => {
  const sections = summarizeLoanRentalForm(form);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <FileText className="h-4 w-4 text-sky-600" />
        Loan &amp; Rental Request · OS007-35
      </p>
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-sky-100 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {section.title}
            </p>
            <dl className="space-y-1.5">
              {section.rows.map((row) => (
                <div key={row.label} className="flex flex-wrap gap-x-2 text-xs">
                  <dt className="min-w-[140px] flex-shrink-0 text-slate-500">{row.label}</dt>
                  <dd className="min-w-0 flex-1 whitespace-pre-line font-medium text-slate-800">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {form.office.signatureDataUrl && (
        <div className="mt-3 rounded-lg border border-sky-100 bg-white p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Signature
          </p>
          <img
            src={form.office.signatureDataUrl}
            alt="Loan and rental signature"
            className="h-28 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Read-only rendering of a completed New Service Level sheet in History.
 */
const NewServiceLevelFormRecord: React.FC<{ form: NewServiceLevelFormData }> = ({ form }) => {
  const sections = summarizeNewServiceLevelForm(form);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <FileText className="h-4 w-4 text-violet-600" />
        New Service Level Agreement · OS007-47
      </p>
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-violet-100 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {section.title}
            </p>
            <dl className="space-y-1.5">
              {section.rows.map((row) => (
                <div key={row.label} className="flex flex-wrap gap-x-2 text-xs">
                  <dt className="min-w-[140px] flex-shrink-0 text-slate-500">{row.label}</dt>
                  <dd className="min-w-0 flex-1 whitespace-pre-line font-medium text-slate-800">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {form.signatureDataUrl && (
        <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Customer Signature
          </p>
          <img
            src={form.signatureDataUrl}
            alt="Customer signature"
            className="h-28 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Returns whether a later follow-up appointment exists for the same customer.
 */
function hasFollowUpBooked(appointment: PlannerAppointment): boolean {
  if (appointment.nextFollowUpDate) {
    return true;
  }

  return Boolean(appointment.nextFollowUpNotes?.trim());
}

/**
 * Maps a lead appointment into the planner appointment shape.
 */
function toPlannerAppointment(appointment: Appointment, leadId: string): PlannerAppointment {
  return {
    ...appointment,
    salesLead:
      typeof appointment.salesLead === 'object' && appointment.salesLead
        ? (appointment.salesLead as PlannerAppointment['salesLead'])
        : { _id: leadId },
  };
}

/**
 * Formats a history card date as "29 Jul 2026".
 */
function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Full-screen style detail panel for a completed history visit.
 */
const DiaryHistoryDetailModal: React.FC<{
  appointment: PlannerAppointment;
  followUps: PlannerAppointment[];
  onClose: () => void;
  onOpenCustomerProfile?: (leadId: string) => void;
  onResumeVisit?: (appointment: PlannerAppointment) => void;
}> = ({ appointment, followUps, onClose, onOpenCustomerProfile, onResumeVisit }) => {
  const leadId = getAppointmentLeadId(appointment);
  const isRfq = hasRfqSignal(appointment);
  const rfcForm = getRfcForm(appointment);
  const loanRentalForm = getLoanRentalForm(appointment);
  const newServiceLevelForm = getNewServiceLevelForm(appointment);
  const hasPinnedLocation = Boolean(
    resolveAppointmentMapCoordinates(appointment) || appointment.location?.trim(),
  );

  useEffect(() => {
    /**
     * Closes the visit record when the rep presses Escape.
     */
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl mobile-fit-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-visit-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div className="min-w-0 flex-1 pr-2">
            <h2 id="history-visit-title" className="truncate text-lg font-bold text-ars-heading">
              {appointment.salesLead?.companyName || 'Visit Record'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatAppointmentType(appointment.appointmentType)} ·{' '}
              {formatHistoryDate(getVisitHistoryDate(appointment).toISOString())}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close visit record"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {hasPinnedLocation && (
            <DiaryAppointmentLocationPanel appointment={appointment} readOnly />
          )}

          <VisitHistoryTimeline appointment={appointment} showLocationDetails={false} />

          {rfcForm && <RfcFormRecord form={rfcForm} />}
          {loanRentalForm && <LoanRentalFormRecord form={loanRentalForm} />}
          {newServiceLevelForm && <NewServiceLevelFormRecord form={newServiceLevelForm} />}

          {isRfq && !rfcForm && !newServiceLevelForm && (
            <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2.5 text-sm text-slate-700">
              <p className="mb-1 font-medium text-slate-800">
                <span aria-hidden className="mr-1.5">
                  📄
                </span>
                RFC Details
              </p>
              <p className="text-xs leading-5 text-slate-600">
                {appointment.outcome && !/^visit completed$/i.test(appointment.outcome.trim())
                  ? appointment.outcome
                  : 'RFC captured during this visit.'}
              </p>
            </div>
          )}

          {followUps.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="mb-2 text-sm font-medium text-slate-800">
                <span aria-hidden className="mr-1.5">
                  📅
                </span>
                Follow-up Appointments
              </p>
              <ul className="space-y-2">
                {followUps.map((followUp) => (
                  <li
                    key={followUp._id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                  >
                    <span>{formatAppointmentType(followUp.appointmentType)}</span>
                    <span>
                      {formatHistoryDate(followUp.appointmentDate)} ·{' '}
                      {formatAppointmentTime(followUp.appointmentTime)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {leadId && onOpenCustomerProfile && (
            <button
              type="button"
              onClick={() => {
                onOpenCustomerProfile(leadId);
                onClose();
              }}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Open Customer Profile
            </button>
          )}

          {onResumeVisit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onResumeVisit(appointment);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <FileText className="h-4 w-4" />
              Open Notes &amp; Visit Details
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200"
          >
            Back to History
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Resolves the date shown on a history card (when the visit was finished).
 */
function getVisitHistoryDate(appointment: PlannerAppointment): Date {
  if (appointment.attendedAt) {
    return new Date(appointment.attendedAt);
  }

  return new Date(appointment.appointmentDate);
}

/**
 * Resolves the timestamp used to order history entries.
 */
function getVisitHistoryTimestamp(appointment: PlannerAppointment): number {
  return getVisitHistoryDate(appointment).getTime();
}

/**
 * Returns the best available location label for a completed visit card.
 */
function getVisitLocationLabel(appointment: PlannerAppointment): string | null {
  const record = parseStoredVisitRecord(appointment.feedback);
  const label = (record?.location || appointment.location || '').trim();
  return label || null;
}

/**
 * Diary History tab listing all completed Site Visits and RFQs for the rep.
 */
const DiaryHistoryView: React.FC<DiaryHistoryViewProps> = ({
  refreshKey = 0,
  onOpenCustomerProfile,
  onResumeVisit,
  onExit,
}) => {
  const [appointments, setAppointments] = useState<PlannerAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<PlannerAppointment | null>(null);
  const [selectedFollowUps, setSelectedFollowUps] = useState<PlannerAppointment[]>([]);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads completed visits across a wide date window for the history feed.
     */
    async function loadHistory(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getVisitHistory({ limit: 500 });

        if (cancelled) {
          return;
        }

        setAppointments((data || []) as PlannerAppointment[]);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError.message || 'Failed to load visit history');
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads later appointments for the selected visit's customer.
     */
    async function loadFollowUps(): Promise<void> {
      if (!selectedVisit) {
        setSelectedFollowUps([]);
        return;
      }

      const leadId = getAppointmentLeadId(selectedVisit);
      if (!leadId) {
        setSelectedFollowUps([]);
        return;
      }

      try {
        const appointments = await getAppointments(leadId);
        if (cancelled) {
          return;
        }

        const visitDate = new Date(selectedVisit.appointmentDate).getTime();
        const followUps = (appointments || [])
          .filter(
            (candidate) =>
              candidate._id !== selectedVisit._id &&
              candidate.status !== 'cancelled' &&
              new Date(candidate.appointmentDate).getTime() > visitDate,
          )
          .sort(
            (left, right) =>
              new Date(left.appointmentDate).getTime() - new Date(right.appointmentDate).getTime(),
          )
          .map((candidate) => toPlannerAppointment(candidate, leadId));

        setSelectedFollowUps(followUps);
      } catch {
        if (!cancelled) {
          setSelectedFollowUps([]);
        }
      }
    }

    void loadFollowUps();

    return () => {
      cancelled = true;
    };
  }, [selectedVisit]);

  const completedVisits = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.status === 'completed' || Boolean(appointment.attended),
      )
      .filter((appointment) => appointment.status !== 'cancelled')
      .sort((left, right) => getVisitHistoryTimestamp(right) - getVisitHistoryTimestamp(left));
  }, [appointments]);

  const filteredVisits = useMemo(() => {
    return completedVisits.filter((appointment) => {
      if (typeFilter !== 'all' && !appointmentMatchesFilter(appointment, typeFilter as DiaryFilter)) {
        return false;
      }

      if (dateFilter) {
        const filterDay = startOfDay(new Date(dateFilter));
        const visitDay = startOfDay(getVisitHistoryDate(appointment));
        if (visitDay.getTime() !== filterDay.getTime()) {
          return false;
        }
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.toLowerCase();
      const lead = appointment.salesLead;
      const visitRecord = parseStoredVisitRecord(appointment.feedback);
      const haystack = [
        lead?.companyName,
        lead?.leadNumber,
        lead?.contactPerson,
        appointment.location,
        visitRecord?.location,
        appointment.notes,
        visitRecord?.notes,
        visitRecord?.rfcForm?.customer.companyName,
        visitRecord?.rfcForm?.customer.pastelAccountNumber,
        visitRecord?.rfcForm?.sectionB.serialNumber,
        visitRecord?.rfcForm?.sectionB.model,
        visitRecord?.rfcForm?.additionalComments,
        visitRecord?.loanRentalForm?.customer.customer,
        visitRecord?.loanRentalForm?.customer.jobQuoteRefNumber,
        visitRecord?.loanRentalForm?.request.durationOfRental,
        visitRecord?.loanRentalForm?.site.additionalComments,
        visitRecord?.newServiceLevelForm?.customer,
        visitRecord?.newServiceLevelForm?.durationOfContract,
        visitRecord?.newServiceLevelForm?.additionalComments,
        appointment.outcome,
        formatAppointmentType(appointment.appointmentType),
        getRepDisplayName(appointment),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [completedVisits, dateFilter, search, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Completed Visits</h3>
          <p className="text-xs text-gray-500">
            Tap a visit or use View Record to see map, notes and photos.
          </p>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Close history and return to planner"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer or notes..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-ars-primary focus:ring-2 focus:ring-ars-primary"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ars-primary focus:ring-2 focus:ring-ars-primary"
          aria-label="Filter by date"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'site_visit', label: 'Site Visit' },
              { value: 'rfc', label: 'RFC' },
              { value: 'loan_rental', label: 'Loan Rental' },
              { value: 'rfc_new_service_level', label: 'RFC New Service Level' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTypeFilter(option.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                typeFilter === option.value
                  ? 'bg-ars-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visit history…
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <span className="mx-auto inline-block h-3 w-3 rounded-full bg-gray-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-gray-700">No past visits yet</p>
          <p className="mt-1 text-xs text-gray-500">
            When you finish a Site Visit or RFQ, it will appear here so you can review what was said.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {filteredVisits.length} completed visit{filteredVisits.length === 1 ? '' : 's'}
          </p>
          {filteredVisits.map((visit) => {
            const photoCount = getPhotoCount(visit);
            const duration = getDurationLabel(visit);
            const notesPreview = getNotesPreview(visit);
            const rfqCreated = hasRfqSignal(visit);
            const followUpBooked = hasFollowUpBooked(visit);
            const locationLabel = getVisitLocationLabel(visit);
            const hasMapPin = Boolean(resolveAppointmentMapCoordinates(visit));

            return (
              <div
                key={visit._id}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {visit.salesLead?.companyName || 'Unknown customer'}
                      </h3>
                      <CompletedVisitTypeLabel
                        appointmentType={visit.appointmentType}
                        className="text-[10px]"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatHistoryDate(getVisitHistoryDate(visit).toISOString())}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatAppointmentTime(visit.appointmentTime)}
                      </span>
                      {duration && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-600" />
                          {duration}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {getRepDisplayName(visit)}
                      </span>
                      {locationLabel && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                          <span className="truncate">{locationLabel}</span>
                        </span>
                      )}
                    </div>

                    {notesPreview && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">
                        {notesPreview}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {hasMapPin && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                          <MapPin className="h-3 w-3" />
                          Location pinned
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                        <Camera className="h-3 w-3" />
                        {photoCount} photo{photoCount === 1 ? '' : 's'}
                      </span>
                      {rfqCreated && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-[11px] text-orange-700">
                          <FileText className="h-3 w-3" />
                          RFC created
                        </span>
                      )}
                      {followUpBooked && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
                          <Calendar className="h-3 w-3" />
                          Follow-up booked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVisit(visit)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <Eye className="h-4 w-4" />
                  View Visit Record
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedVisit && (
        <DiaryHistoryDetailModal
          appointment={selectedVisit}
          followUps={selectedFollowUps}
          onClose={() => setSelectedVisit(null)}
          onOpenCustomerProfile={onOpenCustomerProfile}
          onResumeVisit={onResumeVisit}
        />
      )}
    </div>
  );
};

export default DiaryHistoryView;
