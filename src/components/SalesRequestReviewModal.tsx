import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Save,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveSalesRequest,
  declineSalesRequest,
  getSalesRequest,
  reviewUpdateSalesRequest,
  type Job,
  type SalesRequest,
} from '../lib/api';
import {
  SALES_REQUEST_STATUS_LABELS,
  SALES_REQUEST_TYPE_LABELS,
} from '../constants/salesRequestPermissions';
import DiaryRfcForm from './diary/DiaryRfcForm';
import DiaryLoanRentalForm from './diary/DiaryLoanRentalForm';
import DiaryNewServiceLevelForm from './diary/DiaryNewServiceLevelForm';
import type { RfcFormData } from './diary/rfcFormUtils';
import type { LoanRentalFormData } from './diary/loanRentalFormUtils';
import type { NewServiceLevelFormData } from './diary/newServiceLevelFormUtils';
import { normalizeFormForRequestType } from '../utils/salesRequestValidation';
import SalesRequestAttachmentsPanel from './SalesRequestAttachmentsPanel';
import { formatAppointmentStatusLabel } from './diary/diaryUtils';
import { useAuth } from '../contexts/AuthContext';

interface SalesRequestReviewModalProps {
  requestId: string;
  /** When true, Approve / Reject actions are shown for pending requests. */
  canDecide: boolean;
  onClose: () => void;
  /**
   * Notifies the parent that a decision has completed.
   * Approval returns an additional created Job.
   */
  onDecisionComplete: (payload: {
    request: SalesRequest;
    job?: Job;
  }) => void;
}

/**
 * Extracts a readable error message from API / unknown thrown values.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

/**
 * Formats a date for display in the review panel.
 */
function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Resolves a populated user reference to a display name.
 */
function userName(
  user?: string | { firstName?: string; lastName?: string; email?: string },
): string {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.email || '—';
}

/**
 * Resolves a sales-lead object or id into display fields for the admin review.
 */
function resolveLead(detail: SalesRequest): {
  company: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  leadNumber: string;
} {
  const lead = detail.salesLead;
  if (lead && typeof lead === 'object') {
    return {
      company: lead.companyName || detail.customerCompanyName || '—',
      contact: lead.contactPerson || detail.customerContactPerson || '—',
      phone: lead.contactPhone || '—',
      email: lead.contactEmail || '—',
      address: [lead.contactAddress, lead.city].filter(Boolean).join(', ') || '—',
      leadNumber: lead.leadNumber || '—',
    };
  }
  return {
    company: detail.customerCompanyName || '—',
    contact: detail.customerContactPerson || '—',
    phone: '—',
    email: '—',
    address: '—',
    leadNumber: '—',
  };
}

/**
 * Full-screen modal for admin review of a submitted sales request.
 * Read-only by default; Super Admin / reviewers enter edit mode via Edit.
 */
const SalesRequestReviewModal: React.FC<SalesRequestReviewModalProps> = ({
  requestId,
  canDecide,
  onClose,
  onDecisionComplete,
}) => {
  const { isSuperAdmin } = useAuth();
  const [detail, setDetail] = useState<SalesRequest | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [visitNotes, setVisitNotes] = useState('');
  const originalFormDataRef = useRef<Record<string, unknown>>({});
  const originalVisitNotesRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  /**
   * Applies a loaded sales request into local read-only / edit state.
   */
  function applyLoadedRequest(loaded: SalesRequest): void {
    setDetail(loaded);
    const normalized = normalizeFormForRequestType(
      loaded.requestType,
      loaded.formData ?? {},
    );
    originalFormDataRef.current = normalized;
    originalVisitNotesRef.current = loaded.visitNotes || '';
    setFormData(normalized);
    setVisitNotes(loaded.visitNotes || '');
  }

  /**
   * Loads the full request and hydrates the form in read-only mode.
   */
  const loadRequest = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getSalesRequest(requestId);
      applyLoadedRequest(loaded);
      setIsEditing(false);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load request'));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const isPending = detail?.status === 'pending';
  /** Super Admin (and reviewers with decide rights) can enter edit mode on pending requests. */
  const canEnterEditMode = Boolean((isSuperAdmin || canDecide) && isPending && !acting);
  const fieldsEditable = Boolean(isEditing && !acting && !saving);
  const customer = detail ? resolveLead(detail) : null;
  const appointment = detail?.appointmentDetails;
  const visitGps =
    appointment?.visitGpsVerification?.verified &&
    Number.isFinite(Number(appointment.visitGpsVerification.latitude)) &&
    Number.isFinite(Number(appointment.visitGpsVerification.longitude))
      ? appointment.visitGpsVerification
      : null;
  const photos = detail?.visitPhotos?.filter((photo) => Boolean(photo.dataUrl)) || [];

  /**
   * Enters edit mode so request details and attachments can be changed.
   */
  function handleStartEdit(): void {
    setSuccessHint(null);
    setError(null);
    setIsEditing(true);
  }

  /**
   * Cancels edit mode and restores the last saved values.
   */
  function handleCancelEdit(): void {
    setFormData(originalFormDataRef.current);
    setVisitNotes(originalVisitNotesRef.current);
    setError(null);
    setIsEditing(false);
    void loadRequest();
  }

  /**
   * Persists form and visit-note edits, then returns to read-only mode.
   */
  async function handleSaveEdit(): Promise<void> {
    if (!detail?._id || !isPending) return;

    setSaving(true);
    setError(null);
    setSuccessHint(null);
    try {
      const saved = await reviewUpdateSalesRequest(detail._id, {
        formData,
        visitNotes,
      });
      applyLoadedRequest(saved);
      setIsEditing(false);
      setSuccessHint('Changes saved. Request is read-only again.');
    } catch (saveError: unknown) {
      console.error('Review save failed:', saveError);
      setError(getErrorMessage(saveError, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Approves the pending request using the last saved form data.
   */
  async function handleApprove(): Promise<void> {
    if (!detail?._id) {
      setError('Request is still loading. Please wait and try Approve again.');
      return;
    }
    if (isEditing) {
      setError('Save or Cancel your edits before approving.');
      return;
    }
    if (!isPending) {
      setError(
        `Only Pending Approval requests can be approved (current status: ${detail.status}).`,
      );
      return;
    }
    if (!canDecide) {
      setError('You do not have permission to approve requests.');
      return;
    }

    setActing(true);
    setError(null);
    try {
      const result = await approveSalesRequest(detail._id, {
        formData: originalFormDataRef.current,
      });

      if (!result?.request) {
        throw new Error(
          'Approve succeeded but the server did not return the updated request. Please refresh and check the Requests list.',
        );
      }
      if (!result?.job?._id) {
        throw new Error(
          'Approve succeeded but no Job was returned. The request may not be linked correctly — please refresh and check Jobs.',
        );
      }

      onDecisionComplete({
        request: result.request,
        job: result.job,
      });
    } catch (approveError: unknown) {
      console.error('Approve failed:', approveError);
      setError(getErrorMessage(approveError, 'Failed to approve request'));
    } finally {
      setActing(false);
    }
  }

  /**
   * Rejects the pending request using the last saved form data.
   */
  async function handleReject(): Promise<void> {
    if (!detail?._id || !isPending || !canDecide) return;
    if (isEditing) {
      setError('Save or Cancel your edits before rejecting.');
      return;
    }

    const reason = window.prompt(
      'Optional: enter a reason for rejecting this submission (Cancel to abort):',
    );
    if (reason === null) return;

    setActing(true);
    setError(null);
    try {
      const rejected = await declineSalesRequest(detail._id, {
        formData: originalFormDataRef.current,
        declineReason: reason.trim() || undefined,
      });
      onDecisionComplete({ request: rejected });
    } catch (rejectError: unknown) {
      console.error('Reject failed:', rejectError);
      setError(getErrorMessage(rejectError, 'Failed to reject request'));
    } finally {
      setActing(false);
    }
  }

  /**
   * Reloads attachment metadata after add / replace / remove in edit mode.
   */
  async function handleAttachmentsChanged(): Promise<void> {
    try {
      const loaded = await getSalesRequest(requestId);
      setDetail(loaded);
    } catch (reloadError: unknown) {
      setError(getErrorMessage(reloadError, 'Failed to refresh attachments'));
    }
  }

  /**
   * Renders the full request form for the loaded request type.
   */
  function renderForm(): React.ReactNode {
    if (!detail) return null;

    if (detail.requestType === 'rfc') {
      return (
        <DiaryRfcForm
          value={formData as unknown as RfcFormData}
          onChange={(next) => setFormData(next as unknown as Record<string, unknown>)}
          disabled={!fieldsEditable}
        />
      );
    }

    if (detail.requestType === 'loan_rental') {
      return (
        <DiaryLoanRentalForm
          value={formData as unknown as LoanRentalFormData}
          onChange={(next) => setFormData(next as unknown as Record<string, unknown>)}
          disabled={!fieldsEditable}
        />
      );
    }

    return (
      <DiaryNewServiceLevelForm
        value={formData as unknown as NewServiceLevelFormData}
        onChange={(next) => setFormData(next as unknown as Record<string, unknown>)}
        disabled={!fieldsEditable}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col rounded-t-2xl bg-gray-50 shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              {detail?.requestNumber || 'Rep Approvals'}
            </h2>
            {detail && (
              <p className="truncate text-xs text-gray-500">
                {SALES_REQUEST_TYPE_LABELS[detail.requestType]} ·{' '}
                {SALES_REQUEST_STATUS_LABELS[detail.status]}
                {isEditing ? ' · Editing' : ' · Read-only'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEnterEditMode && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                disabled={loading || acting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0969a9]/30 bg-[#0969a9]/5 px-3 py-2 text-sm font-semibold text-[#0969a9] hover:bg-[#0969a9]/10 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={acting || saving}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#0969a9]" />
            </div>
          ) : error && !detail ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="whitespace-pre-wrap break-words">{error}</p>
                </div>
              )}

              {successHint && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{successHint}</p>
                </div>
              )}

              {isEditing && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Edit mode is on. Update fields or attachments, then Save. Cancel discards unsaved
                  form changes. Approve and Reject are available after you leave edit mode.
                </p>
              )}

              {customer && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-800">
                    Customer Information
                  </h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Company</dt>
                      <dd className="font-medium text-slate-900">{customer.company}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Contact</dt>
                      <dd className="font-medium text-slate-900">{customer.contact}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Phone</dt>
                      <dd>{customer.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Email</dt>
                      <dd>{customer.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Lead #</dt>
                      <dd>{customer.leadNumber}</dd>
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <dt className="text-xs font-semibold uppercase text-slate-500">
                        Customer address (on file)
                      </dt>
                      <dd className="mt-0.5 text-slate-800">{customer.address}</dd>
                    </div>
                  </dl>
                </section>
              )}

              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                  Submission Info
                </h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Submitted</dt>
                    <dd>{formatDate(detail.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Submitted by</dt>
                    <dd>{userName(detail.submittedBy || detail.createdBy)}</dd>
                  </div>
                  {(detail.approvedAt || (detail.status === 'approved' && detail.reviewedAt)) && (
                    <>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-gray-500">Approved</dt>
                        <dd>{formatDate(detail.approvedAt || detail.reviewedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-gray-500">Approved by</dt>
                        <dd>{userName(detail.approvedBy || detail.reviewedBy)}</dd>
                      </div>
                    </>
                  )}
                  {(detail.declinedAt || (detail.status === 'declined' && detail.reviewedAt)) && (
                    <>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-gray-500">Rejected</dt>
                        <dd>{formatDate(detail.declinedAt || detail.reviewedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-gray-500">Rejected by</dt>
                        <dd>{userName(detail.declinedBy || detail.reviewedBy)}</dd>
                      </div>
                      {detail.declineReason && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase text-gray-500">
                            Rejection reason
                          </dt>
                          <dd>{detail.declineReason}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </section>

              {appointment && (
                <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-indigo-900">
                    Appointment Details
                  </h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-indigo-700/80">Date</dt>
                      <dd>
                        {appointment.appointmentDate
                          ? new Date(appointment.appointmentDate).toLocaleDateString()
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-indigo-700/80">Time</dt>
                      <dd>{appointment.appointmentTime || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-indigo-700/80">Type</dt>
                      <dd>{appointment.appointmentType || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-indigo-700/80">Status</dt>
                      <dd>{formatAppointmentStatusLabel(appointment.status)}</dd>
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-indigo-200 bg-white px-3 py-2">
                      <dt className="text-xs font-semibold uppercase text-indigo-700/80">
                        Scheduled appointment address
                      </dt>
                      <dd className="mt-0.5 text-indigo-950">{appointment.location || '—'}</dd>
                    </div>
                    {appointment.notes && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase text-indigo-700/80">
                          Appointment notes
                        </dt>
                        <dd className="whitespace-pre-wrap">{appointment.notes}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {visitGps && (
                <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                  <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-emerald-900">
                    Visit Location (GPS)
                  </h3>
                  <p className="mb-3 text-xs text-emerald-800">
                    Where the rep was when they submitted — not the customer address on file.
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase text-emerald-800/80">Status</dt>
                      <dd className="font-semibold text-emerald-800">GPS Verified</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-emerald-800/80">Latitude</dt>
                      <dd>{visitGps.latitude.toFixed(6)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-emerald-800/80">
                        Longitude
                      </dt>
                      <dd>{visitGps.longitude.toFixed(6)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-emerald-800/80">Accuracy</dt>
                      <dd>{Math.round(visitGps.accuracyMeters)} metres</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-emerald-800/80">
                        Timestamp
                      </dt>
                      <dd>{formatDate(visitGps.capturedAt)}</dd>
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <dt className="text-xs font-semibold uppercase text-emerald-800/80">
                        GPS detected address
                      </dt>
                      <dd className="mt-0.5 text-emerald-950">
                        {visitGps.address ||
                          `${visitGps.latitude.toFixed(6)}, ${visitGps.longitude.toFixed(6)}`}
                      </dd>
                    </div>
                    {visitGps.outsideExpectedLocation && (
                      <div className="sm:col-span-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                        Outside expected location
                        {typeof visitGps.distanceFromExpectedMeters === 'number'
                          ? ` (${visitGps.distanceFromExpectedMeters} m from scheduled pin)`
                          : ''}
                      </div>
                    )}
                  </dl>
                  <a
                    href={`https://www.google.com/maps?q=${visitGps.latitude},${visitGps.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/50"
                  >
                    View GPS on Google Maps
                  </a>
                </section>
              )}

              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                  Representative Attachments
                </h3>
                <SalesRequestAttachmentsPanel
                  request={detail}
                  showRepEmptyMessage
                  editable={fieldsEditable}
                  onChanged={handleAttachmentsChanged}
                />
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                  Visit Notes & Photos
                </h3>
                {fieldsEditable ? (
                  <textarea
                    value={visitNotes}
                    onChange={(event) => setVisitNotes(event.target.value)}
                    rows={4}
                    className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                    placeholder="Visit notes"
                  />
                ) : (
                  <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700">
                    {visitNotes.trim() || 'No visit notes submitted.'}
                  </p>
                )}
                {photos.length === 0 ? (
                  <p className="text-sm text-gray-500">No photos uploaded.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {photos.map((photo, index) => (
                      <figure
                        key={photo.id || `photo-${index}`}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || `Visit photo ${index + 1}`}
                          className="h-36 w-full object-cover"
                        />
                        {photo.caption ? (
                          <figcaption className="truncate px-2 py-1 text-[11px] text-gray-600">
                            {photo.caption}
                          </figcaption>
                        ) : null}
                      </figure>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Completed Form
                </h3>
                {renderForm()}
              </section>
            </div>
          ) : null}
        </div>

        {detail && !loading && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveEdit();
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0969a9] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </>
            ) : (
              canDecide &&
              isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void handleReject();
                    }}
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleApprove();
                    }}
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                </>
              )
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

export default SalesRequestReviewModal;
