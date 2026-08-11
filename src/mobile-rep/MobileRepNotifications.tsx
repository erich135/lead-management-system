import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../lib/api';

interface MobileRepNotificationsProps {
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

/**
 * Mobile notification sheet with badge-friendly examples (appointments, approvals, jobs).
 */
const MobileRepNotifications: React.FC<MobileRepNotificationsProps> = ({
  open,
  onClose,
  onCountChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    /**
     * Loads the latest notifications for the signed-in rep.
     */
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await getNotifications({ limit: 40 });
        if (cancelled) return;
        setItems(response.notifications || []);
        onCountChange?.(response.unreadCount ?? 0);
      } catch (loadError: unknown) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, onCountChange]);

  if (!open) return null;

  /**
   * Marks one notification as read.
   */
  async function handleRead(id: string): Promise<void> {
    await markNotificationRead(id);
    setItems((current) =>
      current.map((item) => (item._id === id ? { ...item, isRead: true } : item)),
    );
    onCountChange?.(Math.max(0, items.filter((item) => !item.isRead && item._id !== id).length));
  }

  /**
   * Marks every notification as read.
   */
  async function handleReadAll(): Promise<void> {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    onCountChange?.(0);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-900/45 backdrop-blur-[2px]">
      <button type="button" className="flex-1" aria-label="Close notifications" onClick={onClose} />
      <div className="max-h-[78vh] overflow-hidden rounded-t-[1.5rem] border border-white/70 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.2)]">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0969a9]/10 text-[#0969a9]">
              <Bell className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Notifications</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleReadAll()}
              className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-xs font-bold text-[#0969a9]"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No notifications yet. New appointments, approval returns and job updates will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        await markNotificationRead(item._id);
                        setItems((current) =>
                          current.map((row) =>
                            row._id === item._id ? { ...row, isRead: true } : row,
                          ),
                        );
                        onCountChange?.(
                          Math.max(
                            0,
                            items.filter((row) => !row.isRead && row._id !== item._id).length,
                          ),
                        );
                        onClose();
                        if (item.actionUrl) {
                          window.location.assign(item.actionUrl);
                        }
                      })();
                    }}
                    className={`w-full px-4 py-3.5 text-left transition ${
                      item.isRead ? 'bg-white' : 'bg-[#0969a9]/[0.06]'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {item.title || item.type || 'Notification'}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {item.message || 'Tap to open'}
                    </p>
                    {item.actionLabel && (
                      <p className="mt-1 text-xs font-bold text-[#0969a9]">
                        {item.actionLabel}
                      </p>
                    )}
                    {item.createdAt && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileRepNotifications;
