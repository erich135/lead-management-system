import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  History,
  List,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Wrench,
} from 'lucide-react';
import {
  getRepCodes,
  getWeeklyAppointments,
  updateAppointment,
  type RepCode,
} from '../lib/api';
import { useSearchParams } from 'react-router-dom';
import DiaryAppointmentDetailModal from './diary/DiaryAppointmentDetailModal';
import DiaryEditAppointmentModal from './diary/DiaryEditAppointmentModal';
import DiaryNewAppointmentModal from './diary/DiaryNewAppointmentModal';
import DiaryVisitWorkspace from './diary/DiaryVisitWorkspace';
import type { PlannerAppointment } from './diary/DiaryDayAppointmentCard';
import {
  formatDateForInput,
  getAppointmentDateKey,
  getAppointmentDayBucketKey,
  getAppointmentLeadId,
  getAppointmentTypeBadgeLabel,
} from './diary/diaryUtils';
import RepInstallAppDiaryBanner from '../mobile-rep/RepInstallAppDiaryBanner';

type PlannerView = 'day' | 'week' | 'month' | 'agenda';

interface WeeklyPlannerProps {
  onOpenHistory?: () => void;
  /** Hides the History toolbar button (e.g. super admin uses Pending Approvals instead). */
  hideHistoryButton?: boolean;
  /**
   * When provided, appointment taps call this instead of opening the detail modal.
   * Used by the mobile Representative shell for a full-screen appointment page.
   */
  onAppointmentOpen?: (appointment: PlannerAppointment) => void;
  /**
   * Enables swipe left/right to change days while in Day view (mobile field app).
   */
  enableDaySwipe?: boolean;
  /** Optional outer className without changing default desktop styling. */
  className?: string;
}

/**
 * Returns Monday 00:00 for the week containing the given date.
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Adds whole days without mutating the original date.
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Local midnight helper.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats weekday labels for week columns.
 */
function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formats appointment time for compact cards.
 */
function formatTime(time?: string): string {
  if (!time) return 'TBC';
  if (/am|pm/i.test(time)) return time;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Planner shows scheduled / in-progress / pending-approval work (never completed or cancelled).
 * Pending Approval stays visible even after the visit was attended and submitted.
 */
function isActivePlannerAppointment(appt: PlannerAppointment): boolean {
  const status = String(appt.status || '').toLowerCase();
  if (status === 'pending_approval' || status === 'rejected') return true;
  if (appt.attended) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  return true;
}

/**
 * Compact status label for active planner cards.
 */
function getStatusLabel(appt: PlannerAppointment): string {
  if (appt.status === 'in_progress') return 'In progress';
  if (appt.status === 'urgent') return 'Urgent';
  return 'Scheduled';
}

/**
 * Status badge colours for active appointments.
 */
function getStatusBadgeClass(appt: PlannerAppointment): string {
  if (appt.status === 'in_progress') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (appt.status === 'urgent') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-sky-100 text-sky-800 border-sky-200';
}

interface AppointmentCardProps {
  appointment: PlannerAppointment;
  onOpen: (appointment: PlannerAppointment) => void;
  draggable?: boolean;
}

/**
 * Compact field-service card: time, customer, status, type, short address.
 */
function AppointmentCard({ appointment, onOpen, draggable = false }: AppointmentCardProps) {
  const typeLabel = getAppointmentTypeBadgeLabel(appointment.appointmentType);
  const address = appointment.location || appointment.salesLead?.contactAddress;

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return;
        event.dataTransfer.setData('text/appointment-id', appointment._id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(appointment)}
      className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-ars-primary hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-gray-900">
          <Clock className="h-3 w-3 text-ars-primary" />
          {formatTime(appointment.appointmentTime)}
        </span>
        <span
          className={`inline-flex rounded-full border px-1.5 py-px text-[9px] font-semibold ${getStatusBadgeClass(
            appointment,
          )}`}
        >
          {getStatusLabel(appointment)}
        </span>
        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-1.5 py-px text-[9px] font-medium text-gray-600">
          {typeLabel}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[12px] font-bold leading-tight text-gray-900">
        {appointment.salesLead?.companyName || 'Customer'}
      </p>
      {address ? (
        <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-gray-500">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{address}</span>
        </p>
      ) : null}
    </button>
  );
}

/**
 * Subtle + button aligned at the bottom of day columns.
 */
function DayAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mt-auto flex w-full items-center justify-center py-1"
      title="New appointment"
      aria-label="Add appointment"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DDEFE2] bg-[#EEF8F1] text-[#22C55E] opacity-90 shadow-sm transition group-hover:scale-105 group-hover:opacity-100">
        <Plus className="h-4 w-4" />
      </span>
    </button>
  );
}

interface ToolbarIconButtonProps {
  label: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
}

/**
 * Compact toolbar control with icon + short label (full text in title/hover).
 */
function ToolbarIconButton({
  label,
  title,
  icon,
  onClick,
  active = false,
  primary = false,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
        primary
          ? 'bg-ars-primary text-white hover:bg-ars-primary/90'
          : active
            ? 'border border-ars-primary bg-white text-ars-primary shadow-sm'
            : 'border border-gray-200 bg-white text-gray-700 hover:border-ars-primary/40 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * Premium field-service Weekly Planner with Day / Week / Month / Agenda views.
 */
const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  onOpenHistory,
  hideHistoryButton = false,
  onAppointmentOpen,
  enableDaySwipe = false,
  className,
}) => {
  const [view, setView] = useState<PlannerView>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week',
  );
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<PlannerAppointment[]>([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState<PlannerAppointment | null>(null);
  const [editAppointment, setEditAppointment] = useState<PlannerAppointment | null>(null);
  const [visitAppointment, setVisitAppointment] = useState<PlannerAppointment | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>();
  const [defaultAppointmentType, setDefaultAppointmentType] = useState<string | undefined>();
  const [lockAppointmentType, setLockAppointmentType] = useState(false);
  const [dragOverDayKey, setDragOverDayKey] = useState<string | null>(null);
  const daySwipeStartX = useRef<number | null>(null);
  const daySwipeStartY = useRef<number | null>(null);
  const deepLinkHandledRef = useRef<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const monthAnchor = useMemo(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
    [anchorDate],
  );
  const monthGridDays = useMemo(() => {
    const gridStart = startOfWeek(monthAnchor);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthAnchor]);

  const dateRange = useMemo(() => {
    if (view === 'day') {
      return { start: startOfDay(anchorDate), end: addDays(startOfDay(anchorDate), 1) };
    }
    if (view === 'week' || view === 'agenda') {
      return { start: weekStart, end: addDays(weekStart, 7) };
    }
    const start = startOfWeek(monthAnchor);
    return { start, end: addDays(start, 42) };
  }, [anchorDate, monthAnchor, view, weekStart]);

  /**
   * Loads active appointments for the current date window.
   */
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const end = new Date(dateRange.end);
      end.setMilliseconds(end.getMilliseconds() - 1);
      const data = await getWeeklyAppointments({
        startDate: dateRange.start.toISOString(),
        endDate: end.toISOString(),
        search: search.trim() || undefined,
      });
      setAppointments((data || []) as PlannerAppointment[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start, search]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  /**
   * Keeps the website diary in sync when a rep books from their phone.
   * Refreshes on tab focus and every 20s while the planner is open.
   */
  useEffect(() => {
    /**
     * Silently reloads appointments without toggling the loading spinner.
     */
    async function softRefresh(): Promise<void> {
      try {
        const end = new Date(dateRange.end);
        end.setMilliseconds(end.getMilliseconds() - 1);
        const data = await getWeeklyAppointments({
          startDate: dateRange.start.toISOString(),
          endDate: end.toISOString(),
          search: search.trim() || undefined,
        });
        setAppointments((data || []) as PlannerAppointment[]);
      } catch {
        // Keep the last good list if the background refresh fails.
      }
    }

    /**
     * Refreshes when the browser tab becomes visible again.
     */
    function onVisibility(): void {
      if (document.visibilityState === 'visible') {
        void softRefresh();
      }
    }

    const timer = window.setInterval(() => void softRefresh(), 20000);
    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dateRange.end, dateRange.start, search]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await getRepCodes();
        setRepCodes(response.repCodes || []);
      } catch {
        setRepCodes([]);
      }
    })();
  }, []);

  useEffect(() => {
    setDetailAppointment((current) => {
      if (!current) return null;
      return appointments.find((item) => item._id === current._id) || current;
    });
  }, [appointments]);

  /**
   * Opens an appointment from /diary?appointmentId=… (reminder "Open Appointment").
   */
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    if (!appointmentId || loading) return;
    if (deepLinkHandledRef.current === appointmentId) return;

    const match = appointments.find((item) => item._id === appointmentId);
    if (!match) return;

    deepLinkHandledRef.current = appointmentId;
    if (onAppointmentOpen) {
      onAppointmentOpen(match);
    } else {
      setDetailAppointment(match);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('appointmentId');
    setSearchParams(next, { replace: true });
  }, [appointments, loading, onAppointmentOpen, searchParams, setSearchParams]);

  const activeAppointments = useMemo(
    () => appointments.filter(isActivePlannerAppointment),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activeAppointments;
    return activeAppointments.filter((appt) => {
      const haystack = [
        appt.salesLead?.companyName,
        appt.salesLead?.contactPerson,
        appt.location,
        appt.salesLead?.contactAddress,
        appt.appointmentType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeAppointments, search]);

  const grouped = useMemo(() => {
    const map: Record<string, PlannerAppointment[]> = {};
    filteredAppointments.forEach((appt) => {
      const key = getAppointmentDayBucketKey(appt.appointmentDate);
      if (!map[key]) map[key] = [];
      map[key].push(appt);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
    });
    return map;
  }, [filteredAppointments]);

  const agendaList = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      const dateCompare = String(a.appointmentDate).localeCompare(String(b.appointmentDate));
      if (dateCompare !== 0) return dateCompare;
      return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
    });
  }, [filteredAppointments]);

  /**
   * Opens appointment details, or hands off to a parent full-screen handler.
   */
  function openAppointment(appointment: PlannerAppointment): void {
    if (onAppointmentOpen) {
      onAppointmentOpen(appointment);
      return;
    }
    setDetailAppointment(appointment);
  }

  /**
   * Opens New Appointment with optional date / locked type.
   */
  function openNewAppointment(date?: Date, appointmentType?: string, lockType = false): void {
    setCreateDefaultDate(formatDateForInput(date || anchorDate));
    setDefaultAppointmentType(appointmentType);
    setLockAppointmentType(lockType);
    setShowNewModal(true);
  }

  /**
   * Closes the create modal.
   */
  function closeNewModal(): void {
    setShowNewModal(false);
    setDefaultAppointmentType(undefined);
    setLockAppointmentType(false);
  }

  /**
   * Moves planner focus backward by the active view unit.
   */
  function goPrevious(): void {
    if (view === 'day') setAnchorDate((d) => addDays(d, -1));
    else if (view === 'month') {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else setAnchorDate((d) => addDays(startOfWeek(d), -7));
  }

  /**
   * Jumps planner focus to today.
   */
  function goToday(): void {
    setAnchorDate(startOfDay(new Date()));
  }

  /**
   * Moves planner focus forward by the active view unit.
   */
  function goNext(): void {
    if (view === 'day') setAnchorDate((d) => addDays(d, 1));
    else if (view === 'month') {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else setAnchorDate((d) => addDays(startOfWeek(d), 7));
  }

  /**
   * Handles dropping an appointment onto a day (week or month).
   */
  async function handleDropOnDay(day: Date, event: React.DragEvent): Promise<void> {
    event.preventDefault();
    setDragOverDayKey(null);
    const appointmentId = event.dataTransfer.getData('text/appointment-id');
    if (!appointmentId) return;

    const appointment = appointments.find((item) => item._id === appointmentId);
    if (!appointment) return;

    const leadId = getAppointmentLeadId(appointment);
    if (!leadId) {
      setActionMessage('Unable to move this appointment.');
      return;
    }

    const nextDate = formatDateForInput(day);
    const currentDate = getAppointmentDateKey(appointment.appointmentDate) || formatDateForInput(new Date(appointment.appointmentDate));
    if (nextDate === currentDate) return;

    try {
      await updateAppointment(leadId, appointment._id, {
        appointmentDate: nextDate,
      });
      setActionMessage(
        `Moved ${appointment.salesLead?.companyName || 'appointment'} to ${day.toLocaleDateString()}.`,
      );
      await loadAppointments();
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to move appointment.');
    }
  }

  const rangeLabel = useMemo(() => {
    if (view === 'day') {
      return anchorDate.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
    if (view === 'month') {
      return monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    const end = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })} – ${end.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }, [anchorDate, monthAnchor, view, weekStart]);

  const quickCreate = [
    { type: 'site_visit', label: 'Site', title: 'Site Visit', icon: <MapPin className="h-3.5 w-3.5" /> },
    { type: 'rfc', label: 'RFC', title: 'RFC', icon: <FileText className="h-3.5 w-3.5" /> },
    { type: 'loan_rental', label: 'Loan Rental', title: 'Loan Rental', icon: <Truck className="h-3.5 w-3.5" /> },
    {
      type: 'rfc_new_service_level',
      label: 'Service',
      title: 'New Service Level',
      icon: <Wrench className="h-3.5 w-3.5" />,
    },
  ] as const;

  const viewOptions: Array<{ id: PlannerView; label: string; icon: React.ReactNode }> = [
    { id: 'day', label: 'Day', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { id: 'week', label: 'Week', icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { id: 'month', label: 'Month', icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { id: 'agenda', label: 'Agenda', icon: <List className="h-3.5 w-3.5" /> },
  ];

  const dayAppointments = grouped[anchorDate.toDateString()] || [];

  /**
   * Captures the start of a horizontal swipe (day / week / month when enabled).
   */
  function handleDayTouchStart(event: React.TouchEvent<HTMLDivElement>): void {
    if (!enableDaySwipe) return;
    daySwipeStartX.current = event.changedTouches[0]?.clientX ?? null;
    daySwipeStartY.current = event.changedTouches[0]?.clientY ?? null;
  }

  /**
   * Changes period when the user swipes left/right far enough (ignores vertical scroll).
   */
  function handleDayTouchEnd(event: React.TouchEvent<HTMLDivElement>): void {
    if (!enableDaySwipe || daySwipeStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX;
    const endY = event.changedTouches[0]?.clientY;
    const startX = daySwipeStartX.current;
    const startY = daySwipeStartY.current;
    daySwipeStartX.current = null;
    daySwipeStartY.current = null;
    if (typeof endX !== 'number' || typeof endY !== 'number' || startY == null) return;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    // Prefer vertical scroll — only navigate when swipe is clearly horizontal.
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    if (deltaX < 0) goNext();
    else goPrevious();
  }

  return (
    <div
      className={
        className ||
        'flex min-h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm'
      }
      onTouchStart={handleDayTouchStart}
      onTouchEnd={handleDayTouchEnd}
    >
      <div className="border-b border-gray-100 px-3 py-3 sm:px-4">
        <RepInstallAppDiaryBanner />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Planner</h2>
            <p className="text-xs text-gray-500">{rangeLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {viewOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setView(option.id)}
                  className={`inline-flex h-10 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition md:h-8 ${
                    view === option.id
                      ? 'bg-white text-ars-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>

            <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-gray-200 bg-white p-1 md:w-auto md:justify-start md:rounded-lg md:p-0.5">
              <button
                type="button"
                onClick={goPrevious}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-800 active:bg-gray-100 md:h-8 md:w-8 md:rounded-md md:hover:bg-gray-50"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-11 flex-1 rounded-lg bg-ars-primary px-4 text-sm font-bold text-white md:h-8 md:flex-none md:rounded-md md:px-3 md:text-xs md:font-semibold"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-800 active:bg-gray-100 md:h-8 md:w-8 md:rounded-md md:hover:bg-gray-50"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={() => void loadAppointments()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 active:bg-gray-100 md:h-8 md:w-8 md:rounded-md md:hover:bg-gray-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 md:h-3.5 md:w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <ToolbarIconButton
            primary
            label="New"
            title="New Appointment"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => openNewAppointment()}
          />
          {quickCreate.map((item) => (
            <ToolbarIconButton
              key={item.type}
              label={item.label}
              title={item.title}
              icon={item.icon}
              onClick={() => openNewAppointment(anchorDate, item.type, true)}
            />
          ))}
          <ToolbarIconButton
            label="Week"
            title="Week view"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            active={view === 'week'}
            onClick={() => setView('week')}
          />
          <ToolbarIconButton
            label="Month"
            title="Month view"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            active={view === 'month'}
            onClick={() => setView('month')}
          />
          {!hideHistoryButton && (
            <ToolbarIconButton
              label="History"
              title="Open History"
              icon={<History className="h-3.5 w-3.5" />}
              onClick={() => onOpenHistory?.()}
            />
          )}
          <ToolbarIconButton
            label="Search"
            title="Search appointments"
            icon={<Search className="h-3.5 w-3.5" />}
            active={showSearch}
            onClick={() => setShowSearch((open) => !open)}
          />
        </div>

        {showSearch && (
          <div className="mt-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, address, type…"
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ars-primary focus:outline-none focus:ring-2 focus:ring-ars-primary/20"
              autoFocus
            />
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="mx-3 mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 sm:mx-4">
          {actionMessage}
        </div>
      )}
      {error && (
        <div className="mx-3 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-4">
          {error}
        </div>
      )}

      <div className="flex-1 p-3 sm:p-4">
        {view === 'day' && (
          <div className="mx-auto max-w-2xl space-y-2">
            {dayAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                <p className="font-semibold text-gray-800">No jobs today</p>
                <p className="mt-1 text-sm text-gray-500">Only scheduled and in-progress work shows here.</p>
                <button
                  type="button"
                  onClick={() => openNewAppointment(anchorDate)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-ars-primary px-4 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  New Appointment
                </button>
              </div>
            ) : (
              dayAppointments.map((appt) => (
                <AppointmentCard
                  key={appt._id}
                  appointment={appt}
                  onOpen={openAppointment}
                  draggable
                />
              ))
            )}
          </div>
        )}

        {view === 'week' && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekDays.map((day) => {
              const key = day.toDateString();
              const dayAppts = grouped[key] || [];
              const isToday = key === startOfDay(new Date()).toDateString();
              const isDragOver = dragOverDayKey === key;

              return (
                <div
                  key={key}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverDayKey(key);
                  }}
                  onDragLeave={() => setDragOverDayKey((current) => (current === key ? null : current))}
                  onDrop={(event) => void handleDropOnDay(day, event)}
                  className={`flex min-h-[240px] flex-col rounded-xl border p-2.5 ${
                    isDragOver
                      ? 'border-ars-primary bg-sky-50'
                      : isToday
                        ? 'border-ars-primary/50 bg-white'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-900">{formatDateLabel(day)}</h3>
                    <span className="text-[10px] font-medium text-gray-500">{dayAppts.length}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    {dayAppts.map((appt) => (
                      <AppointmentCard
                        key={appt._id}
                        appointment={appt}
                        onOpen={openAppointment}
                        draggable
                      />
                    ))}
                    <DayAddButton onClick={() => openNewAppointment(day)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'month' && (
          <>
            {/* Mobile (<768px): touch-friendly day cards — desktop calendar unchanged below */}
            <div className="space-y-2 md:hidden">
              {monthGridDays
                .filter((day) => day.getMonth() === monthAnchor.getMonth())
                .map((day) => {
                  const key = day.toDateString();
                  const dayAppts = grouped[key] || [];
                  const isToday = key === startOfDay(new Date()).toDateString();
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-3 ${
                        isToday ? 'border-ars-primary/40 bg-sky-50/80' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAnchorDate(startOfDay(day));
                            setView('day');
                          }}
                          className="min-h-11 flex-1 text-left"
                        >
                          <p className="text-sm font-bold text-gray-900">
                            {day.toLocaleDateString(undefined, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <p className="text-[11px] font-medium text-gray-500">
                            {dayAppts.length} job{dayAppts.length === 1 ? '' : 's'}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openNewAppointment(day)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-ars-primary"
                          title="New appointment"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {dayAppts.length === 0 ? (
                        <p className="text-xs text-gray-400">No appointments</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dayAppts.map((appt) => (
                            <button
                              key={appt._id}
                              type="button"
                              onClick={() => openAppointment(appt)}
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-800 active:bg-gray-100"
                            >
                              <span className="tabular-nums text-ars-primary">
                                {formatTime(appt.appointmentTime)}
                              </span>
                              <span className="min-w-0 truncate">
                                {appt.salesLead?.companyName || 'Customer'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Desktop / tablet (≥768px): original month grid — do not alter */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 md:block">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                <div key={label} className="px-2 py-2.5">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-white">
              {monthGridDays.map((day) => {
                const key = day.toDateString();
                const dayAppts = grouped[key] || [];
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const isToday = key === startOfDay(new Date()).toDateString();
                const isDragOver = dragOverDayKey === key;

                return (
                  <div
                    key={key}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverDayKey(key);
                    }}
                    onDragLeave={() =>
                      setDragOverDayKey((current) => (current === key ? null : current))
                    }
                    onDrop={(event) => void handleDropOnDay(day, event)}
                    className={`min-h-[104px] border-b border-r border-gray-100 p-1.5 sm:min-h-[118px] ${
                      !inMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    } ${isDragOver ? 'bg-sky-50' : ''}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setAnchorDate(startOfDay(day));
                          setView('day');
                        }}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday ? 'bg-ars-primary text-white' : inMonth ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {day.getDate()}
                      </button>
                      <button
                        type="button"
                        onClick={() => openNewAppointment(day)}
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-ars-primary"
                        title="New appointment"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {dayAppts.slice(0, 3).map((appt) => (
                        <button
                          key={appt._id}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/appointment-id', appt._id);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => openAppointment(appt)}
                          className="w-full truncate rounded border border-gray-200 bg-white px-1 py-0.5 text-left text-[10px] font-semibold text-gray-700 hover:border-ars-primary"
                          title={`${formatTime(appt.appointmentTime)} · ${
                            appt.salesLead?.companyName || 'Customer'
                          }`}
                        >
                          {formatTime(appt.appointmentTime)}{' '}
                          {appt.salesLead?.companyName || 'Customer'}
                        </button>
                      ))}
                      {dayAppts.length > 3 ? (
                        <p className="text-[10px] text-gray-500">+{dayAppts.length - 3} more</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
              Drag a job onto another day to reschedule. Completed jobs appear in History only.
            </p>
          </div>
          </>
        )}

        {view === 'agenda' && (
          <div className="mx-auto max-w-3xl space-y-2">
            {agendaList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                No scheduled jobs in this period.
              </div>
            ) : (
              agendaList.map((appt) => (
                <div key={appt._id} className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {new Date(appt.appointmentDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  <AppointmentCard
                    appointment={appt}
                    onOpen={openAppointment}
                    draggable
                  />
                </div>
              ))
            )}
          </div>
        )}

        {loading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
      </div>

      <DiaryNewAppointmentModal
        isOpen={showNewModal}
        repCodes={repCodes}
        defaultDate={createDefaultDate}
        defaultAppointmentType={defaultAppointmentType}
        lockAppointmentType={lockAppointmentType}
        onClose={closeNewModal}
        onCreated={async () => {
          setActionMessage('Appointment saved.');
          await loadAppointments();
        }}
      />

      <DiaryAppointmentDetailModal
        appointment={detailAppointment}
        onClose={() => setDetailAppointment(null)}
        onUpdated={loadAppointments}
        onEdit={(appointment) => {
          setDetailAppointment(null);
          setEditAppointment(appointment);
        }}
        onStartVisit={(appointment) => {
          setDetailAppointment(null);
          setVisitAppointment(appointment);
        }}
      />

      <DiaryEditAppointmentModal
        appointment={editAppointment}
        onClose={() => setEditAppointment(null)}
        onUpdated={async () => {
          await loadAppointments();
          setEditAppointment(null);
        }}
      />

      <DiaryVisitWorkspace
        appointment={visitAppointment}
        onClose={() => setVisitAppointment(null)}
        onFinished={async () => {
          setVisitAppointment(null);
          setActionMessage('Visit submitted — Pending Approval (or moved to History if no form).');
          await loadAppointments();
        }}
      />
    </div>
  );
};

export default WeeklyPlanner;
