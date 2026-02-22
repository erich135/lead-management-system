import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadNotificationCount, getDailyTasks } from '../lib/api';

interface NotificationBellProps {
  onOpenPanel: () => void;
}

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationBell({ onOpenPanel }: NotificationBellProps) {
  const { user } = useAuth();
  const [totalCount, setTotalCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    fetchCounts();

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.id]);

  async function fetchCounts() {
    try {
      const [notifCount, tasksResult] = await Promise.all([
        getUnreadNotificationCount().catch(() => 0),
        getDailyTasks().catch(() => ({ tasks: [], summary: { total: 0, critical: 0, warning: 0, info: 0 } })),
      ]);
      // Combine unread notifications + overdue daily tasks
      const overdueCount = tasksResult.summary?.critical || 0;
      setTotalCount(notifCount + overdueCount);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  }

  return (
    <button
      onClick={onOpenPanel}
      className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
    >
      <Bell className="w-6 h-6" />
      {totalCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {totalCount > 999 ? '999+' : totalCount}
        </span>
      )}
    </button>
  );
}
