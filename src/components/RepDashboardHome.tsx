import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRepCodes,
  getUnreadNotificationCount,
  updateAppointment,
  type RepCode,
} from '../lib/api';
import type { PlannerAppointment } from './diary/DiaryDayAppointmentCard';
import DiaryNewAppointmentModal from './diary/DiaryNewAppointmentModal';
import DiaryVisitWorkspace from './diary/DiaryVisitWorkspace';
import MobileRepHome from '../mobile-rep/MobileRepHome';
import MobileRepAppointment from '../mobile-rep/MobileRepAppointment';
import MobileRepNotifications from '../mobile-rep/MobileRepNotifications';
import {
  useOfflineVisitSync,
  type OfflineSyncItem,
} from '../mobile-rep/useOfflineVisitSync';

/**
 * Rep-only Dashboard home: today's appointments and visit actions.
 * Uses the normal ARS menu — only this page content differs for reps.
 */
export function RepDashboardHome(): React.ReactElement {
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<PlannerAppointment | null>(null);
  const [visitAppointment, setVisitAppointment] = useState<PlannerAppointment | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [homeKey, setHomeKey] = useState(0);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);

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
   * Polls unread notification count for the home bell badge.
   */
  const refreshUnread = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Keep last known count when offline.
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 30000);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  /**
   * Opens appointment detail from the home list.
   */
  function handleOpenAppointment(appointment: PlannerAppointment): void {
    setSelectedAppointment(appointment);
  }

  /**
   * Starts the visit workspace for an appointment.
   */
  function handleStartVisit(appointment: PlannerAppointment): void {
    setSelectedAppointment(null);
    setVisitAppointment(appointment);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <MobileRepHome
        key={homeKey}
        unreadCount={unreadCount}
        isOnline={isOnline}
        pendingSyncCount={pendingCount}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenAppointment={handleOpenAppointment}
        onStartVisit={handleStartVisit}
        onNewAppointment={() => setShowNewAppointment(true)}
        onOpenPlanner={() => navigate('/sales-leads')}
      />

      {selectedAppointment && (
        <MobileRepAppointment
          appointment={selectedAppointment}
          onBack={() => setSelectedAppointment(null)}
          onStartVisit={handleStartVisit}
        />
      )}

      <DiaryNewAppointmentModal
        isOpen={showNewAppointment}
        repCodes={repCodes}
        onClose={() => setShowNewAppointment(false)}
        onCreated={async () => {
          setShowNewAppointment(false);
          setHomeKey((value) => value + 1);
        }}
      />

      <DiaryVisitWorkspace
        appointment={visitAppointment}
        onClose={() => setVisitAppointment(null)}
        onFinished={async () => {
          setVisitAppointment(null);
          setHomeKey((value) => value + 1);
          await refreshUnread();
        }}
      />

      <MobileRepNotifications
        open={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          void refreshUnread();
        }}
        onCountChange={setUnreadCount}
      />
    </div>
  );
}

export default RepDashboardHome;
