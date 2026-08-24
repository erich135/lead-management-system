import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  PlayCircle,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { updateAppointment } from '../../lib/api';
import { SmartDateInput } from '../SmartDateInput';
import type { PlannerAppointment } from './DiaryDayAppointmentCard';
import { DiaryCompletedDot } from './DiaryCompletedDot';
import {
  buildRescheduleNotificationMessage,
  formatAppointmentStatusLabel,
  formatAppointmentTime,
  formatDateForInput,
  getAppointmentLeadId,
  getAppointmentTypeBadgeLabel,
  getReminderLabel,
  getTypeIndicatorEmoji,
  toTimeInputValue,
  toWhatsAppNumber,
} from './diaryUtils';
import { loadVisitSession } from './visitUtils';
import { getVisitStartActionLabel } from './visitFormSelection';
import { resolveAppointmentMapCoordinates } from './DiaryAppointmentLocationPanel';

type DetailView = 'details' | 'reschedule' | 'notify';

interface DiaryAppointmentDetailModalProps {
  appointment: PlannerAppointment | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onEdit: (appointment: PlannerAppointment) => void;
  onStartVisit: (appointment: PlannerAppointment) => void;
  onOpenCustomerProfile?: (leadId: string) => void;
}

/**
 * Original rep popup: Start Visit / Cancel as primary actions (white design).
 */
const DiaryAppointmentDetailModal: React.FC<DiaryAppointmentDetailModalProps> = ({
  appointment,
  onClose,
  onUpdated,
  onEdit,
  onStartVisit,
  onOpenCustomerProfile,
}) => {
  const [view, setView] = useState<DetailView>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [savedReschedule, setSavedReschedule] = useState<{ date: string; time: string } | null>(
    null,
  );
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appointment) return;
    setView('details');
    setError(null);
    setShowMoreMenu(false);
    setSavedReschedule(null);
    setRescheduleDate(formatDateForInput(new Date(appointment.appointmentDate)));
    setRescheduleTime(toTimeInputValue(appointment.appointmentTime));
  }, [appointment]);

  useEffect(() => {
    if (!showMoreMenu) return;
    function handleOutsideClick(event: MouseEvent): void {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMoreMenu]);

  if (!appointment) {
    return null;
  }

  const leadId = getAppointmentLeadId(appointment);
  const reminder = getReminderLabel(appointment.appointmentDate);
  const phone = appointment.salesLead?.contactPhone;
  const email = appointment.salesLead?.contactEmail;
  const whatsAppNumber = toWhatsAppNumber(phone);
  const mapCoordinates = resolveAppointmentMapCoordinates(appointment);
  const mapsHref = mapCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${mapCoordinates[1]},${mapCoordinates[0]}`
    : appointment.location || appointment.salesLead?.contactAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          appointment.location || appointment.salesLead?.contactAddress || '',
        )}`
      : null;
  const typeEmoji = getTypeIndicatorEmoji(appointment.appointmentType, appointment.status);
  const isPendingApproval = appointment.status === 'pending_approval';
  const isRejected = appointment.status === 'rejected';
  const isClosed =
    appointment.status === 'completed' ||
    appointment.status === 'cancelled' ||
    isPendingApproval;
  const isCompleted = appointment.status === 'completed';
  const hasActiveVisit =
    Boolean(loadVisitSession(appointment._id)) || appointment.status === 'in_progress';
  const address = appointment.location || appointment.salesLead?.contactAddress || '';

  /**
   * Opens a WhatsApp chat with the customer's contact number.
   */
  function handleWhatsApp(): void {
    if (!whatsAppNumber) return;
    window.open(`https://wa.me/${whatsAppNumber}`, '_blank');
  }

  /**
   * Opens Maps for the appointment location.
   */
  function handleOpenMaps(): void {
    if (!mapsHref) return;
    window.open(mapsHref, '_blank');
  }

  /**
   * Marks the job complete and archives it out of the planner into History.
   */
  async function handleCompleteJob(): Promise<void> {
    if (!leadId) {
      setError('Unable to resolve the linked customer for this appointment.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateAppointment(leadId, appointment._id, {
        attended: true,
        attendedAt: new Date().toISOString(),
        status: 'completed' as any,
        outcome: 'Completed from appointment details',
      });
      await onUpdated();
      onClose();
    } catch (updateError: any) {
      setError(updateError.message || 'Failed to complete job');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Cancels the appointment after confirmation.
   */
  async function handleCancelAppointment(): Promise<void> {
    if (!leadId) {
      setError('Unable to resolve the linked customer for this appointment.');
      return;
    }
    if (!window.confirm('Cancel this appointment?')) return;

    setIsSaving(true);
    setError(null);
    try {
      await updateAppointment(leadId, appointment._id, { status: 'cancelled' });
      await onUpdated();
      onClose();
    } catch (updateError: any) {
      setError(updateError.message || 'Failed to cancel appointment');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Saves a quick reschedule.
   */
  async function handleRescheduleSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!leadId) {
      setError('Unable to resolve the linked customer for this appointment.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateAppointment(leadId, appointment._id, {
        appointmentDate: rescheduleDate,
        appointmentTime: rescheduleTime,
      });
      await onUpdated();
      setSavedReschedule({ date: rescheduleDate, time: rescheduleTime });
      setView('notify');
    } catch (updateError: any) {
      setError(updateError.message || 'Failed to reschedule appointment');
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Emails a reschedule notification draft.
   */
  function handleSendEmailNotification(): void {
    if (!email) return;
    const message = buildRescheduleNotificationMessage(
      appointment.salesLead?.companyName || 'your company',
      savedReschedule?.date || rescheduleDate,
      savedReschedule?.time || rescheduleTime,
      appointment.salesLead?.contactPerson,
    );
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      'Appointment Rescheduled',
    )}&body=${encodeURIComponent(message)}`;
    onClose();
  }

  /**
   * WhatsApps a reschedule notification draft.
   */
  function handleSendWhatsAppNotification(): void {
    if (!whatsAppNumber) return;
    const message = buildRescheduleNotificationMessage(
      appointment.salesLead?.companyName || 'your company',
      savedReschedule?.date || rescheduleDate,
      savedReschedule?.time || rescheduleTime,
      appointment.salesLead?.contactPerson,
    );
    window.open(
      `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`,
      '_blank',
    );
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[min(92dvh,100%)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <DiaryCompletedDot size="sm" />
              ) : (
                <span className="text-base leading-none" aria-hidden>
                  {typeEmoji}
                </span>
              )}
              <h2 className="truncate text-xl font-bold text-gray-900">
                {appointment.salesLead?.companyName || 'Appointment'}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{appointment.salesLead?.leadNumber}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu((current) => !current)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                  {!isClosed && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onEdit(appointment);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Appointment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setView('reschedule');
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      >
                        <CalendarClock className="h-4 w-4" />
                        Reschedule
                      </button>
                    </>
                  )}
                  {leadId && onOpenCustomerProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenCustomerProfile(leadId);
                        onClose();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Customer Profile
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {view === 'details' && (
            <>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-lg font-bold leading-snug text-gray-900">
                  {appointment.salesLead?.companyName || 'Client'}
                </p>
                <div className="mt-2 mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">
                    {getAppointmentTypeBadgeLabel(appointment.appointmentType)}
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                    {formatAppointmentStatusLabel(appointment.status)}
                  </span>
                </div>
                {appointment.salesLead?.contactPerson && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-600">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    {appointment.salesLead.contactPerson}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-ars-primary" />
                  {new Date(appointment.appointmentDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  at {formatAppointmentTime(appointment.appointmentTime)}
                </div>
                {address ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span>{address}</span>
                  </div>
                ) : null}
                {phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {phone}
                  </div>
                ) : null}
                {appointment.notes ? (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap">
                    {appointment.notes}
                  </p>
                ) : null}
                <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${reminder.className}`}>
                  {reminder.label}
                </span>
              </div>

              {isPendingApproval && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Pending Approval — this submission is locked until an admin approves or rejects it.
                </div>
              )}

              {isRejected && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  Rejected — correct the information and submit again for approval.
                  {appointment.outcome ? (
                    <span className="mt-1 block text-xs">{appointment.outcome}</span>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isPendingApproval}
                  onClick={() => onEdit(appointment)}
                  className="inline-flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4 text-ars-primary" />
                  Edit Appointment
                </button>
                {whatsAppNumber && (
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="inline-flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                )}
              </div>

              {!isClosed && (
                <div className="space-y-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartVisit(appointment);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <PlayCircle className="h-5 w-5" />
                    {getVisitStartActionLabel({
                      appointmentStatus: appointment.status,
                      hasVisitSession: Boolean(loadVisitSession(appointment._id)),
                    })}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleCompleteJob()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Complete Job
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleCancelAppointment()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Appointment
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'reschedule' && (
            <form onSubmit={handleRescheduleSave} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Quick Reschedule</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Update the date and time without recreating the appointment.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">New Date</label>
                  <SmartDateInput
                    required
                    value={rescheduleDate}
                    onChange={(event) => setRescheduleDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ars-primary focus:ring-2 focus:ring-ars-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">New Time</label>
                  <input
                    required
                    type="time"
                    value={rescheduleTime}
                    onChange={(event) => setRescheduleTime(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ars-primary focus:ring-2 focus:ring-ars-primary/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setView('details')}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                  Save New Time
                </button>
              </div>
            </form>
          )}

          {view === 'notify' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Appointment rescheduled successfully.
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Would you also like to notify the customer?
                </h3>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={!email}
                  onClick={handleSendEmailNotification}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </button>
                <button
                  type="button"
                  disabled={!whatsAppNumber}
                  onClick={handleSendWhatsAppNotification}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send WhatsApp
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600"
                >
                  Don&apos;t Notify
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DiaryAppointmentDetailModal;
