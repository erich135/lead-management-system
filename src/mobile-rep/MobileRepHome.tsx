import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Play,
  Plus,
  WifiOff,
} from 'lucide-react';
import { getWeeklyAppointments } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { PlannerAppointment } from '../components/diary/DiaryDayAppointmentCard';
import { loadVisitSession } from '../components/diary/visitUtils';
import { getAppointmentTypeBadgeLabel } from '../components/diary/diaryUtils';
import { getVisitStartActionLabel } from '../components/diary/visitFormSelection';
import {
  addDays,
  buildNavigateUrl,
  buildTelUrl,
  formatMobileTime,
  getTimeGreeting,
  startOfDay,
} from './mobileRepUtils';

interface MobileRepHomeProps {
  unreadCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
  onOpenNotifications: () => void;
  onOpenAppointment: (appointment: PlannerAppointment) => void;
  onStartVisit: (appointment: PlannerAppointment) => void;
  onNewAppointment: () => void;
  onOpenPlanner: () => void;
}

/**
 * Representative Home screen: greeting, today's list, next appointment, quick actions.
 */
const MobileRepHome: React.FC<MobileRepHomeProps> = ({
  unreadCount,
  isOnline,
  pendingSyncCount,
  onOpenNotifications,
  onOpenAppointment,
  onStartVisit,
  onNewAppointment,
  onOpenPlanner,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<PlannerAppointment[]>([]);

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there';

  /**
   * Loads today's active appointments for the signed-in rep.
   */
  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = startOfDay(new Date());
      const end = addDays(start, 1);
      end.setMilliseconds(end.getMilliseconds() - 1);
      const data = await getWeeklyAppointments({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      const active = (data || []).filter(
        (appt) =>
          appt.status !== 'completed' &&
          appt.status !== 'cancelled' &&
          !(appt.attended && appt.status !== 'pending_approval' && appt.status !== 'rejected'),
      ) as PlannerAppointment[];
      active.sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
      setAppointments(active);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load today’s appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  /**
   * Soft-refresh today's list so phone bookings stay aligned with the website diary.
   */
  useEffect(() => {
    const timer = window.setInterval(() => void loadToday(), 20000);
    /**
     * Reloads when returning to the app tab.
     */
    function onVisible(): void {
      if (document.visibilityState === 'visible') {
        void loadToday();
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [loadToday]);

  const nextAppointment = useMemo(() => {
    const inProgress = appointments.find((appt) => appt.status === 'in_progress');
    if (inProgress) return inProgress;
    return appointments.find((appt) => {
      const hasDraft = Boolean(loadVisitSession(appt._id));
      return hasDraft || appt.status === 'appointment' || appt.status === 'urgent' || appt.status === 'rejected';
    }) || appointments[0] || null;
  }, [appointments]);

  const navigateUrl = nextAppointment ? buildNavigateUrl(nextAppointment) : null;
  const callUrl = nextAppointment ? buildTelUrl(nextAppointment.salesLead?.contactPhone) : null;

  return (
    <div className="mobile-rep-rise space-y-4 overflow-x-hidden px-3 pb-4 pt-4 min-[375px]:px-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0969a9]">{getTimeGreeting()},</p>
          <h1 className="mt-0.5 text-[1.65rem] font-extrabold tracking-tight text-slate-900">
            {firstName}
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {appointments.length === 0
              ? 'No visits lined up yet'
              : `${appointments.length} visit${appointments.length === 1 ? '' : 's'} today`}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-slate-700 shadow-[0_4px_14px_rgba(9,105,169,0.12)]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {(!isOnline || pendingSyncCount > 0) && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/95 px-3.5 py-3 text-sm text-amber-950 shadow-sm">
          <WifiOff className="h-4 w-4 shrink-0" />
          {!isOnline
            ? 'You’re offline — visit forms stay on this device and will sync later.'
            : `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync.`}
        </div>
      )}

      <section className="mobile-rep-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            Next Appointment
          </h2>
          <button
            type="button"
            onClick={onOpenPlanner}
            className="text-xs font-bold text-[#0969a9]"
          >
            View planner
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : nextAppointment ? (
          <button
            type="button"
            onClick={() => onOpenAppointment(nextAppointment)}
            className="mobile-rep-action w-full rounded-2xl bg-gradient-to-br from-[#0969a9]/[0.08] to-[#0ea5e9]/[0.06] p-4 text-left ring-1 ring-[#0969a9]/15"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-slate-900">
                  {nextAppointment.salesLead?.companyName || 'Appointment'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {formatMobileTime(nextAppointment.appointmentTime)} ·{' '}
                  {getAppointmentTypeBadgeLabel(nextAppointment.appointmentType)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#0969a9] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                {nextAppointment.status === 'in_progress' ? 'In progress' : 'Today'}
              </span>
            </div>
            {(nextAppointment.location || nextAppointment.salesLead?.contactAddress) && (
              <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0969a9]/70" />
                <span>
                  {nextAppointment.location || nextAppointment.salesLead?.contactAddress}
                </span>
              </p>
            )}
          </button>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No appointments scheduled for today.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!nextAppointment}
            onClick={() => nextAppointment && onStartVisit(nextAppointment)}
            className="mobile-rep-action inline-flex min-h-[3.4rem] items-center justify-center gap-2 rounded-2xl bg-[#0969a9] px-3 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(9,105,169,0.28)] disabled:opacity-40"
          >
            <Play className="h-4 w-4 fill-current" />
            {nextAppointment
              ? getVisitStartActionLabel({
                  appointmentStatus: nextAppointment.status,
                  hasVisitSession: Boolean(loadVisitSession(nextAppointment._id)),
                })
              : 'Start Visit'}
          </button>
          <button
            type="button"
            onClick={onNewAppointment}
            className="mobile-rep-action mobile-rep-card inline-flex min-h-[3.4rem] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold text-slate-800"
          >
            <Plus className="h-4 w-4 text-[#0969a9]" />
            New Appointment
          </button>
          <a
            href={navigateUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!navigateUrl}
            className={`mobile-rep-action mobile-rep-card inline-flex min-h-[3.4rem] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold text-slate-800 ${
              !navigateUrl ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <Navigation className="h-4 w-4 text-[#0969a9]" />
            Navigate
          </a>
          <a
            href={callUrl || undefined}
            aria-disabled={!callUrl}
            className={`mobile-rep-action mobile-rep-card inline-flex min-h-[3.4rem] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold text-slate-800 ${
              !callUrl ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <Phone className="h-4 w-4 text-[#0969a9]" />
            Call Customer
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Today&apos;s Appointments
        </h2>
        {error && (
          <div className="mb-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="mobile-rep-card rounded-2xl border-dashed px-4 py-10 text-center text-sm text-slate-500">
            Nothing on the planner for today.
          </div>
        ) : (
          <div className="space-y-2.5">
            {appointments.map((appt, index) => (
              <button
                key={appt._id}
                type="button"
                onClick={() => onOpenAppointment(appt)}
                style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                className="mobile-rep-rise mobile-rep-action mobile-rep-card flex w-full items-center gap-3 rounded-2xl p-3.5 text-left active:bg-slate-50"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#0969a9] to-[#0a7ec4] text-white shadow-sm">
                  <span className="text-[9px] font-semibold uppercase opacity-80">Time</span>
                  <span className="text-xs font-extrabold leading-tight">
                    {formatMobileTime(appt.appointmentTime)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">
                    {appt.salesLead?.companyName || 'Appointment'}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {getAppointmentTypeBadgeLabel(appt.appointmentType)}
                    {appt.location ? ` · ${appt.location}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MobileRepHome;
