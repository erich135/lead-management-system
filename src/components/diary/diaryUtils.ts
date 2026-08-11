/**
 * Shared diary helpers for the sales weekly planner.
 */

export type DiaryAppointmentType =
  | 'site_visit'
  | 'rfc'
  | 'loan_rental'
  | 'rfc_new_service_level';

export const DIARY_APPOINTMENT_TYPE_OPTIONS = [
  { value: 'site_visit', label: 'Site Visit', icon: '🔧', shortLabel: 'Visit' },
  { value: 'rfc', label: 'RFC', icon: '📄', shortLabel: 'RFC' },
  { value: 'loan_rental', label: 'Loan Rental', icon: '🚛', shortLabel: 'Loan' },
  { value: 'rfc_new_service_level', label: 'New Service Level', icon: '🛠️', shortLabel: 'SLA' },
] as const;

/** @deprecated Use DIARY_APPOINTMENT_TYPE_OPTIONS */
export const APPOINTMENT_TYPE_OPTIONS = DIARY_APPOINTMENT_TYPE_OPTIONS;

export const STATUS_OPTIONS = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'rfq', label: 'RFQ' },
  { value: 'quote', label: 'Quote' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'urgent', label: 'Urgent' },
] as const;

const BOOKING_PREFS_KEY = 'ars-diary-booking-prefs';

export interface DiaryBookingPrefs {
  appointmentType?: DiaryAppointmentType;
  appointmentTime?: string;
}

/**
 * Loads remembered booking defaults for fast repeat scheduling.
 */
export function loadDiaryBookingPrefs(): DiaryBookingPrefs {
  try {
    const raw = localStorage.getItem(BOOKING_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DiaryBookingPrefs;
    return {
      appointmentType: parsed.appointmentType
        ? normalizeDiaryAppointmentType(parsed.appointmentType)
        : undefined,
      appointmentTime: typeof parsed.appointmentTime === 'string' ? parsed.appointmentTime : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Persists booking defaults after a successful create.
 */
export function saveDiaryBookingPrefs(prefs: DiaryBookingPrefs): void {
  try {
    const current = loadDiaryBookingPrefs();
    localStorage.setItem(
      BOOKING_PREFS_KEY,
      JSON.stringify({
        ...current,
        ...prefs,
      }),
    );
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

/**
 * Suggests a near-term time slot for fast booking (next 30-minute boundary).
 */
export function getSuggestedAppointmentTime(from: Date = new Date()): string {
  const next = new Date(from);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  if (minutes === 0 || minutes === 30) {
    // already on a slot — bump 30 minutes ahead so "now" is not the default
    next.setMinutes(minutes + 30);
  } else if (minutes < 30) {
    next.setMinutes(30);
  } else {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  }
  const hours = String(next.getHours()).padStart(2, '0');
  const mins = String(next.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Returns the emoji icon for a diary appointment type.
 */
export function getAppointmentTypeIcon(value?: string): string {
  const normalized = normalizeDiaryAppointmentType(value);
  return (
    DIARY_APPOINTMENT_TYPE_OPTIONS.find((option) => option.value === normalized)?.icon || '🔧'
  );
}

/**
 * Returns a compact type badge label with icon (e.g. "📄 RFC").
 */
export function getAppointmentTypeBadgeLabel(value?: string): string {
  const normalized = normalizeDiaryAppointmentType(value);
  const meta = DIARY_APPOINTMENT_TYPE_OPTIONS.find((option) => option.value === normalized);
  if (!meta) return '🔧 Visit';
  return `${meta.icon} ${meta.shortLabel}`;
}

/**
 * Returns a select/list label with icon (e.g. "🔧 Site Visit").
 */
export function getAppointmentTypeOptionLabel(value?: string): string {
  const normalized = normalizeDiaryAppointmentType(value);
  const meta = DIARY_APPOINTMENT_TYPE_OPTIONS.find((option) => option.value === normalized);
  if (!meta) return '🔧 Site Visit';
  return `${meta.icon} ${meta.label}`;
}

/**
 * Formats a short weekday date + time line for appointment cards.
 */
export function formatAppointmentWhen(
  appointmentDate?: string,
  appointmentTime?: string,
): string {
  if (!appointmentDate) {
    return formatAppointmentTime(appointmentTime) || 'Time TBC';
  }

  const date = new Date(appointmentDate);
  if (Number.isNaN(date.getTime())) {
    return formatAppointmentTime(appointmentTime) || 'Time TBC';
  }

  const dayPart = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timePart = formatAppointmentTime(appointmentTime);
  return timePart ? `${dayPart} • ${timePart}` : dayPart;
}

/**
 * Normalizes diary appointment types, mapping legacy RFQ values to RFC.
 */
export function normalizeDiaryAppointmentType(value?: string): DiaryAppointmentType {
  if (value === 'rfc' || value === 'rfq' || value === 'quotation' || value === 'quote') {
    return 'rfc';
  }

  if (value === 'loan_rental') {
    return 'loan_rental';
  }

  if (value === 'rfc_new_service_level') {
    return 'rfc_new_service_level';
  }

  return 'site_visit';
}

/**
 * Returns whether an appointment type is RFC-related for lead status syncing.
 */
export function isRfcAppointmentType(value?: string): boolean {
  const normalized = normalizeDiaryAppointmentType(value);
  return normalized === 'rfc' || normalized === 'rfc_new_service_level';
}

/**
 * Returns whether an appointment should open the standard RFC costing sheet.
 */
export function isRfcSheetAppointmentType(value?: string): boolean {
  return normalizeDiaryAppointmentType(value) === 'rfc';
}

/**
 * Returns whether an appointment type should open the Loan & Rental request sheet.
 */
export function isLoanRentalAppointmentType(value?: string): boolean {
  return normalizeDiaryAppointmentType(value) === 'loan_rental';
}

/**
 * Returns whether an appointment should open the New Service Level Agreement sheet.
 */
export function isNewServiceLevelAppointmentType(value?: string): boolean {
  return normalizeDiaryAppointmentType(value) === 'rfc_new_service_level';
}

/**
 * Returns whether a Site Visit map pin is required for this appointment type.
 */
export function requiresSiteVisitPin(value?: string): boolean {
  return normalizeDiaryAppointmentType(value) === 'site_visit';
}

export type DiaryFilter = 'all' | DiaryAppointmentType;

export const DIARY_FILTER_OPTIONS: Array<{ value: DiaryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'rfc', label: 'RFC' },
  { value: 'loan_rental', label: 'Loan Rental' },
  { value: 'rfc_new_service_level', label: 'New Service Level' },
];

/**
 * Returns the emoji shown beside a filter when that category has appointments.
 */
export function getFilterIndicatorEmoji(filter: DiaryFilter): string | null {
  const filterEmojiMap: Partial<Record<DiaryFilter, string>> = {
    site_visit: '🟢',
    rfc: '🟠',
    loan_rental: '🔵',
    rfc_new_service_level: '🟣',
  };

  return filterEmojiMap[filter] ?? null;
}

/**
 * Checks whether an appointment matches a diary filter value.
 */
export function appointmentMatchesFilter(
  appointment: { appointmentType?: string; status?: string },
  filter: DiaryFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }

  return normalizeDiaryAppointmentType(appointment.appointmentType) === filter;
}

/**
 * Returns whether an appointment is still open in the diary (not closed out).
 */
export function isOpenDiaryAppointment(appointment: {
  status?: string;
  attended?: boolean;
}): boolean {
  if (appointment.status === 'cancelled') {
    return false;
  }

  return !isAppointmentCompleted(appointment);
}

/**
 * Returns whether any open appointment in the list matches the given filter.
 * Completed and cancelled visits do not light the coloured filter indicators.
 */
export function filterHasAppointments<T extends { appointmentType?: string; status?: string; attended?: boolean }>(
  appointments: T[],
  filter: DiaryFilter,
): boolean {
  if (filter === 'all') {
    return false;
  }

  return appointments.some(
    (appointment) =>
      isOpenDiaryAppointment(appointment) && appointmentMatchesFilter(appointment, filter),
  );
}

/**
 * Converts an appointment time string to HH:mm for HTML time inputs.
 */
export function toTimeInputValue(time?: string): string {
  if (!time) {
    return '';
  }

  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return time;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  }
  if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Builds a customer notification message for a rescheduled appointment.
 */
export function buildRescheduleNotificationMessage(
  companyName: string,
  appointmentDate: string,
  appointmentTime: string,
  contactPerson?: string,
): string {
  const dateLabel = new Date(appointmentDate).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeLabel = formatAppointmentTime(appointmentTime);
  const greeting = contactPerson ? `Hi ${contactPerson}` : 'Hi';

  return `${greeting},\n\nOur appointment with ${companyName} has been rescheduled to ${dateLabel} at ${timeLabel}.\n\nPlease let us know if this works for you.\n\nKind regards`;
}

/**
 * Resolves the sales lead identifier from a planner appointment.
 */
export function getAppointmentLeadId(appointment: {
  salesLead?: string | { _id?: string };
}): string | undefined {
  if (!appointment.salesLead) {
    return undefined;
  }

  return typeof appointment.salesLead === 'string'
    ? appointment.salesLead
    : appointment.salesLead._id;
}

/**
 * Formats a phone number for WhatsApp deep links.
 */
export function toWhatsAppNumber(phone?: string): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) {
    return null;
  }

  return digits.startsWith('+') ? digits.slice(1) : digits.replace(/^0/, '27');
}

/**
 * Formats a Date instance for HTML date inputs (YYYY-MM-DD).
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a premium status label for diary appointments.
 */
export function formatAppointmentStatusLabel(status?: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'in_progress':
      return 'In Progress';
    case 'pending_approval':
      return 'Pending Approval';
    case 'rejected':
      return 'Rejected';
    case 'urgent':
      return 'Urgent';
    case 'rfq':
    case 'quote':
      return 'Pending';
    case 'appointment':
    default:
      return 'Scheduled';
  }
}

/**
 * Maps appointment status to a StatusBadge tone.
 */
export function getAppointmentStatusTone(
  status?: string,
): 'pending' | 'info' | 'success' | 'declined' | 'warning' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'declined';
    case 'urgent':
      return 'warning';
    case 'pending_approval':
      return 'pending';
    case 'rejected':
      return 'declined';
    case 'in_progress':
      return 'info';
    case 'rfq':
    case 'quote':
      return 'pending';
    default:
      return 'info';
  }
}

/**
 * Returns whether an appointment should be treated as completed in the diary.
 */
export function isAppointmentCompleted(appointment: {
  status?: string;
  attended?: boolean;
}): boolean {
  if (appointment.status === 'pending_approval') return false;
  if (appointment.status === 'rejected') return false;
  if (appointment.status === 'in_progress') return false;
  return appointment.status === 'completed' || Boolean(appointment.attended);
}

/**
 * Formats the completion timestamp for display on completed appointment cards.
 */
export function formatCompletionTime(attendedAt?: string, updatedAt?: string): string | null {
  const iso = attendedAt || updatedAt;
  if (!iso) {
    return null;
  }

  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns the compact emoji indicator for an appointment type or status.
 */
export function getTypeIndicatorEmoji(
  appointmentType?: string,
  status?: string,
): string {
  if (status === 'urgent') {
    return '🔴';
  }
  if (status === 'completed') {
    return '🟢';
  }
  if (status === 'in_progress') {
    return '🟡';
  }
  if (status === 'cancelled') {
    return '⚫';
  }

  const typeEmojiMap: Record<string, string> = {
    site_visit: '🔧',
    rfc: '📄',
    loan_rental: '🚛',
    rfc_new_service_level: '🛠️',
  };

  return typeEmojiMap[normalizeDiaryAppointmentType(appointmentType)] || '🔧';
}

/**
 * Returns the colour class for a small status dot on appointment cards.
 */
export function getStatusDotClass(status?: string): string {
  const statusColorMap: Record<string, string> = {
    appointment: 'bg-blue-400',
    in_progress: 'bg-amber-500',
    pending_approval: 'bg-amber-600',
    rejected: 'bg-red-500',
    rfq: 'bg-orange-500',
    quote: 'bg-orange-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-gray-300',
    urgent: 'bg-red-500',
  };

  return statusColorMap[status || 'appointment'] || statusColorMap.appointment;
}

/**
 * Returns the start of a day without mutating the original date.
 */
export function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

/**
 * Extracts YYYY-MM-DD from an appointment date without UTC day-shift.
 * `new Date("2026-08-07")` is UTC midnight and can land on the previous local day in SAST.
 */
export function getAppointmentDateKey(appointmentDate?: string | Date | null): string {
  if (!appointmentDate) return '';

  if (typeof appointmentDate === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(appointmentDate);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const value = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
  if (Number.isNaN(value.getTime())) return '';

  // Date-only storage is typically UTC midnight or UTC noon — use the UTC calendar day.
  const hours = value.getUTCHours();
  if (hours === 12 || (hours === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0)) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return formatDateForInput(value);
}

/**
 * Returns a stable local Date for planner day bucketing (same calendar day as booked).
 */
export function getAppointmentDayDate(appointmentDate?: string | Date | null): Date {
  const key = getAppointmentDateKey(appointmentDate);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return startOfDay(new Date());
}

/**
 * Day key used by WeeklyPlanner grouping (`Date.toDateString()`).
 */
export function getAppointmentDayBucketKey(appointmentDate?: string | Date | null): string {
  return getAppointmentDayDate(appointmentDate).toDateString();
}

/**
 * Returns the end of a day without mutating the original date.
 */
export function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

/**
 * Returns the Monday-based start of week for the provided date.
 */
export function startOfWeek(date: Date): Date {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

/**
 * Adds days to a date and returns a new instance.
 */
export function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

/**
 * Formats an appointment reminder badge based on how close the due date is.
 */
export function getReminderLabel(appointmentDate: string): {
  label: string;
  className: string;
} {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(appointmentDate));
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return { label: 'Overdue', className: 'bg-gray-800 text-white' };
  }
  if (diffDays === 0) {
    return { label: 'Today', className: 'bg-red-100 text-red-700' };
  }
  if (diffDays === 1) {
    return { label: 'Tomorrow', className: 'bg-amber-100 text-amber-700' };
  }
  if (diffDays === 2) {
    return { label: '2 Days Left', className: 'bg-emerald-100 text-emerald-700' };
  }

  return { label: `${diffDays} Days Left`, className: 'bg-gray-100 text-gray-600' };
}

/**
 * Returns the colour class for an appointment type or urgent status indicator dot.
 */
export function getTypeIndicatorClass(
  appointmentType?: string,
  status?: string,
): string {
  if (status === 'urgent') {
    return 'bg-red-500';
  }
  if (status === 'completed') {
    return 'bg-emerald-500';
  }
  if (status === 'cancelled') {
    return 'bg-gray-400';
  }

  const typeColorMap: Record<string, string> = {
    site_visit: 'bg-emerald-500',
    rfc: 'bg-orange-500',
    loan_rental: 'bg-sky-500',
    rfc_new_service_level: 'bg-violet-500',
  };

  return typeColorMap[normalizeDiaryAppointmentType(appointmentType)] || typeColorMap.site_visit;
}

/**
 * Formats a human-readable appointment type label.
 */
export function formatAppointmentType(value?: string): string {
  const normalized = normalizeDiaryAppointmentType(value);
  return (
    DIARY_APPOINTMENT_TYPE_OPTIONS.find((option) => option.value === normalized)?.label ||
    'Site Visit'
  );
}

/**
 * Formats a human-readable status label.
 */
export function formatStatusLabel(value?: string): string {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label || 'Appointment';
}

/**
 * Extracts a short town or suburb label from a full address string.
 */
export function extractShortLocation(location?: string): string | null {
  if (!location || location === 'Not specified') {
    return null;
  }

  const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }

  return parts[0] || null;
}

/**
 * Formats appointment time for compact card display.
 */
export function formatAppointmentTime(time?: string): string {
  if (!time) {
    return '';
  }

  if (/am|pm/i.test(time)) {
    return time;
  }

  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Combines an appointment date and time string into a single Date instance.
 */
export function parseAppointmentDateTime(
  appointmentDate: string,
  appointmentTime?: string,
): Date | null {
  const date = new Date(appointmentDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (!appointmentTime?.trim()) {
    return date;
  }

  const trimmed = appointmentTime.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    date.setHours(parseInt(h24Match[1], 10), parseInt(h24Match[2], 10), 0, 0);
    return date;
  }

  return date;
}

/**
 * Formats a human-readable countdown until the appointment start time.
 */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Starting now';
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Starts in ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `Starts in ${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `Starts in ${minutes}m`;
  }

  return 'Starts soon';
}

/**
 * Finds the nearest upcoming appointment from a list of planner appointments.
 */
export function findNextUpcomingAppointment<T extends {
  appointmentDate: string;
  appointmentTime?: string;
  status?: string;
  attended?: boolean;
}>(appointments: T[], now: Date = new Date()): T | null {
  const upcoming = appointments
    .filter(
      (appointment) =>
        appointment.status !== 'completed' &&
        appointment.status !== 'cancelled' &&
        appointment.status !== 'in_progress' &&
        !appointment.attended,
    )
    .map((appointment) => ({
      appointment,
      dateTime: parseAppointmentDateTime(
        appointment.appointmentDate,
        appointment.appointmentTime,
      ),
    }))
    .filter(
      (
        item,
      ): item is { appointment: T; dateTime: Date } =>
        item.dateTime !== null && item.dateTime.getTime() >= now.getTime(),
    )
    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());

  return upcoming[0]?.appointment ?? null;
}
