import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications,
  markNotificationRead,
  type AppNotification,
} from '../lib/api';

const POLL_MS = 15000;
const TOAST_SHOWN_KEY = 'ars-appt-reminder-toasts-shown';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Returns notification ids already shown as toasts this browser session.
 */
function readShownIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(TOAST_SHOWN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/**
 * Persists toast ids so the same reminder is not toasted repeatedly.
 */
function writeShownIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(TOAST_SHOWN_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore quota */
  }
}

/**
 * True when the browser cannot show Web Push notifications to this user.
 */
function browserNotificationsUnavailable(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return true;
  return Notification.permission !== 'granted';
}

/**
 * Polls for appointment reminders and shows an in-app toast when browser
 * push is unavailable (or blocked). Always creates/keeps the bell notification.
 */
export function AppointmentReminderToastHost(): React.ReactElement | null {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const shownRef = useRef<Set<string>>(readShownIds());

  /**
   * Loads unread appointment reminders and queues toasts for new ones.
   */
  const pollReminders = useCallback(async () => {
    if (!user?.id) return;
    if (!browserNotificationsUnavailable()) return;

    try {
      const result = await getNotifications({
        unreadOnly: true,
        type: 'appointment_reminder',
        limit: 20,
      });

      const nextToasts: ToastItem[] = [];
      for (const notification of result.notifications || []) {
        if (shownRef.current.has(notification._id)) continue;
        shownRef.current.add(notification._id);
        nextToasts.push(toToastItem(notification));
      }

      if (nextToasts.length > 0) {
        writeShownIds(shownRef.current);
        setToasts((current) => [...nextToasts, ...current].slice(0, 4));
      }
    } catch (error) {
      console.warn('[AppointmentReminderToast] poll failed:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void pollReminders();
    const timer = window.setInterval(() => void pollReminders(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [user?.id, pollReminders]);

  /**
   * Dismisses one toast from the stack.
   */
  function dismiss(id: string): void {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  /**
   * Opens the appointment from the toast action, then dismisses.
   */
  async function openAppointment(toast: ToastItem): Promise<void> {
    try {
      await markNotificationRead(toast.id);
    } catch {
      /* still navigate */
    }
    dismiss(toast.id);
    navigate(toast.actionUrl || '/diary');
  }

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[140] flex flex-col items-end gap-2 p-3 sm:p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          role="status"
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0969a9]/10 text-[#0969a9]">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
              <p className="mt-0.5 text-sm text-gray-600">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 border-t border-gray-100 px-4 py-2.5">
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => void openAppointment(toast)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0969a9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#085a91]"
            >
              <Bell className="h-4 w-4" />
              {toast.actionLabel || 'Open Appointment'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Maps an API notification into toast display fields.
 */
function toToastItem(notification: AppNotification): ToastItem {
  return {
    id: notification._id,
    title: notification.title || 'Appointment reminder',
    message: notification.message || '',
    actionUrl: notification.actionUrl || '/diary',
    actionLabel: notification.actionLabel || 'Open Appointment',
  };
}

export default AppointmentReminderToastHost;
