import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Cog, Menu, ScanLine, Clock, LogOut, User } from 'lucide-react';
import {
  getRepCodes,
  getUnreadNotificationCount,
  getWeeklyAppointments,
  updateAppointment,
  type RepCode,
} from '../lib/api';
import WeeklyPlanner from '../components/WeeklyPlanner';
import DiaryNewAppointmentModal from '../components/diary/DiaryNewAppointmentModal';
import DiaryVisitWorkspace from '../components/diary/DiaryVisitWorkspace';
import type { PlannerAppointment } from '../components/diary/DiaryDayAppointmentCard';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileRepBottomNav from './MobileRepBottomNav';
import MobileRepHome from './MobileRepHome';
import MobileRepAppointment from './MobileRepAppointment';
import MobileRepJobs from './MobileRepJobs';
import MobileRepSalesLeads from './MobileRepSalesLeads';
import MobileRepHistory from './MobileRepHistory';
import MobileRepProfile from './MobileRepProfile';
import MobileRepNotifications from './MobileRepNotifications';
import { isRepUser, type MobileRepTab } from './mobileRepUtils';
import {
  useOfflineVisitSync,
  type OfflineSyncItem,
} from './useOfflineVisitSync';

/**
 * Dedicated mobile-browser shell for Representatives.
 * Still the same website — responsive layout only; no native runtime.
 */
const MobileRepApp: React.FC = () => {
  const { user, signOut, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<MobileRepTab>('home');
  const [selectedAppointment, setSelectedAppointment] = useState<PlannerAppointment | null>(null);
  const [visitAppointment, setVisitAppointment] = useState<PlannerAppointment | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [plannerKey, setPlannerKey] = useState(0);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  /**
   * Mobile-only slide-up menu for non-tab sections (Activities, Machines, QR, approvals).
   */
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  /**
   * Syncs a queued offline appointment update when connectivity returns.
   */
  const syncOfflineItem = useCallback(async (item: OfflineSyncItem) => {
    await updateAppointment(item.leadId, item.appointmentId, item.payload);
  }, []);

  const { isOnline, pendingCount } = useOfflineVisitSync(syncOfflineItem);

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

  /**
   * Polls unread notification count for the Home badge.
   */
  const refreshUnread = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Keep the last known count when offline.
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 30000);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  /**
   * Opens an appointment from reminder deep-link ?appointmentId=.
   */
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    if (!appointmentId) return;

    let cancelled = false;

    void (async () => {
      try {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        const end = new Date();
        end.setDate(end.getDate() + 2);
        const rows = await getWeeklyAppointments({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        if (cancelled) return;
        const match = (rows || []).find((row) => row._id === appointmentId);
        if (!match) return;
        setSelectedAppointment(match as PlannerAppointment);
        setTab('sales_leads');
        const next = new URLSearchParams(searchParams);
        next.delete('appointmentId');
        setSearchParams(next, { replace: true });
      } catch (error) {
        console.warn('[MobileRepApp] Failed to open reminder appointment:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  /**
   * Opens the full-screen appointment page (adds history so phone Back works).
   */
  function handleOpenAppointment(appointment: PlannerAppointment): void {
    setSelectedAppointment(appointment);
    window.history.pushState({ arsMobileOverlay: 'appointment' }, '');
  }

  /**
   * Starts the visit workspace immediately (inspection form / notes flow).
   */
  function handleStartVisit(appointment: PlannerAppointment): void {
    setSelectedAppointment(null);
    setVisitAppointment(appointment);
    window.history.pushState({ arsMobileOverlay: 'visit' }, '');
  }

  /**
   * Closes appointment detail; syncs history when closed via the UI back button.
   */
  function closeAppointment(fromPopState = false): void {
    setSelectedAppointment(null);
    if (!fromPopState && window.history.state?.arsMobileOverlay === 'appointment') {
      window.history.back();
    }
  }

  /**
   * Closes visit workspace; syncs browser history when closed via UI.
   */
  function closeVisit(fromPopState = false): void {
    setVisitAppointment(null);
    if (!fromPopState && window.history.state?.arsMobileOverlay === 'visit') {
      window.history.back();
    }
  }

  /**
   * Opens notifications sheet with a history entry for the phone Back button.
   */
  function openNotifications(): void {
    setShowNotifications(true);
    window.history.pushState({ arsMobileOverlay: 'notifications' }, '');
  }

  /**
   * Closes notifications sheet.
   */
  function closeNotifications(fromPopState = false): void {
    setShowNotifications(false);
    void refreshUnread();
    if (!fromPopState && window.history.state?.arsMobileOverlay === 'notifications') {
      window.history.back();
    }
  }

  /**
   * Opens new-appointment modal with history support.
   */
  function openNewAppointment(): void {
    setShowNewAppointment(true);
    window.history.pushState({ arsMobileOverlay: 'newAppointment' }, '');
  }

  /**
   * Closes new-appointment modal.
   */
  function closeNewAppointment(fromPopState = false): void {
    setShowNewAppointment(false);
    if (!fromPopState && window.history.state?.arsMobileOverlay === 'newAppointment') {
      window.history.back();
    }
  }

  const overlayStateRef = React.useRef({
    visitAppointment,
    showNewAppointment,
    showNotifications,
    selectedAppointment,
  });
  overlayStateRef.current = {
    visitAppointment,
    showNewAppointment,
    showNotifications,
    selectedAppointment,
  };

  /**
   * Phone Back / gesture: close the top overlay instead of leaving the app.
   */
  useEffect(() => {
    /**
     * Handles browser history pop for mobile overlays.
     */
    function onPopState(): void {
      const state = overlayStateRef.current;
      if (state.visitAppointment) {
        setVisitAppointment(null);
        return;
      }
      if (state.showNewAppointment) {
        setShowNewAppointment(false);
        return;
      }
      if (state.showNotifications) {
        setShowNotifications(false);
        void refreshUnread();
        return;
      }
      if (state.selectedAppointment) {
        setSelectedAppointment(null);
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [refreshUnread]);

  return (
    <div className="mobile-rep-shell flex min-h-[100dvh] max-w-[100vw] flex-col overflow-x-clip">
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0969a9] via-[#0a7ec4] to-[#064e7a] px-4 pb-3.5 pt-[max(0.85rem,env(safe-area-inset-top))] text-white shadow-[0_8px_28px_rgba(9,105,169,0.28)]">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <img
            src="/icon-192.png"
            alt="ARS"
            className="h-10 w-10 rounded-2xl bg-white/15 object-cover ring-2 ring-white/25 shadow-md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold tracking-tight leading-tight">ARS</p>
            <p className="truncate text-[12px] font-medium text-white/85">
              {user?.fullName || 'Representative'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMoreMenu((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20"
            aria-label="More"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20"
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/20">
            Field
          </span>
        </div>
      </header>

      {showMoreMenu && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40"
            role="presentation"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-[71] mx-auto max-w-lg rounded-t-3xl bg-white shadow-2xl md:hidden">
            <div className="p-5">
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300" aria-hidden />
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setTab('history');
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <ClipboardList className="h-5 w-5 text-[#0969a9]" />
                  History
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setTab('profile');
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <User className="h-5 w-5 text-[#0969a9]" />
                  Profile
                </button>

                {(hasPermission('machines.verifyReadings') || user?.isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate('/pending-machine-readings');
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <ScanLine className="h-5 w-5 text-[#0969a9]" />
                    QR Readings
                  </button>
                )}

                {(hasPermission('sales_requests.review') || user?.isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate('/pending-sales-requests');
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <ClipboardList className="h-5 w-5 text-[#0969a9]" />
                    Rep Approvals
                  </button>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      void signOut().finally(() => {
                        setShowMoreMenu(false);
                      })
                    }
                    className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 px-4 py-3 text-left font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto pb-24">
        {tab === 'home' && (
          <MobileRepHome
            unreadCount={unreadCount}
            isOnline={isOnline}
            pendingSyncCount={pendingCount}
            onOpenNotifications={openNotifications}
            onOpenAppointment={handleOpenAppointment}
            onStartVisit={handleStartVisit}
            onNewAppointment={openNewAppointment}
            onOpenPlanner={() => setTab('sales_leads')}
          />
        )}

        {tab === 'sales_leads' && (
          <MobileRepSalesLeads
            plannerKey={plannerKey}
            onOpenAppointment={handleOpenAppointment}
            onOpenHistory={() => setTab('history')}
          />
        )}

        {tab === 'planner' && (
          <div className="mobile-rep-rise p-3">
            <WeeklyPlanner
              key={plannerKey}
              enableDaySwipe
              className="mobile-rep-card flex min-h-full flex-col rounded-2xl"
              onOpenHistory={() => setTab('history')}
              onAppointmentOpen={handleOpenAppointment}
            />
          </div>
        )}

        {tab === 'jobs' && <MobileRepJobs />}

        {tab === 'history' && (
          <MobileRepHistory onExit={() => setTab('sales_leads')} />
        )}

        {tab === 'profile' && <MobileRepProfile />}
      </main>

      <MobileRepBottomNav
        activeTab={tab}
        onChange={(next) => {
          setSelectedAppointment(null);
          if (next === 'activities') {
            navigate('/activities');
            return;
          }
          if (next === 'machines') {
            navigate('/machines');
            return;
          }
          setTab(next);
        }}
        notificationCount={unreadCount}
      />

      {selectedAppointment && (
        <MobileRepAppointment
          appointment={selectedAppointment}
          onBack={() => closeAppointment(false)}
          onStartVisit={handleStartVisit}
        />
      )}

      <DiaryNewAppointmentModal
        isOpen={showNewAppointment}
        repCodes={repCodes}
        onClose={() => closeNewAppointment(false)}
        onCreated={async () => {
          closeNewAppointment(false);
          setPlannerKey((value) => value + 1);
          if (tab !== 'sales_leads') setTab('sales_leads');
        }}
      />

      <DiaryVisitWorkspace
        appointment={visitAppointment}
        onClose={() => closeVisit(false)}
        onFinished={async () => {
          closeVisit(false);
          setPlannerKey((value) => value + 1);
          await refreshUnread();
        }}
      />

      <MobileRepNotifications
        open={showNotifications}
        onClose={() => closeNotifications(false)}
        onCountChange={setUnreadCount}
      />
    </div>
  );
};

/**
 * Renders the mobile-browser Representative layout when on a small screen.
 * Admin / Super Admin and desktop users keep the existing Dashboard website.
 */
export function MobileRepAppGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  /**
   * Routes that should display the existing Dashboard pages even for mobile reps,
   * so features like Activities / Machines / QR Readings / Rep Approvals remain accessible.
   */
  const shouldBypassMobileRepAppShell = [
    '/activities',
    '/machines',
    '/pending-machine-readings',
    '/pending-sales-requests',
    '/tech-app',
    '/admin',
    '/job-card-templates',
    '/job-card-submissions',
    '/parts-ready',
  ].includes(location.pathname);

  if (isMobile && isRepUser(user) && !shouldBypassMobileRepAppShell) {
    return <MobileRepApp />;
  }

  return <>{children}</>;
}

export default MobileRepApp;
