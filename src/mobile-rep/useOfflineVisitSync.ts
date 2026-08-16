import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearVisitSession,
  loadVisitSession,
  type VisitSession,
} from '../components/diary/visitUtils';

const QUEUE_KEY = 'ars-mobile-offline-sync-v1';

interface OfflineSyncItem {
  id: string;
  appointmentId: string;
  leadId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

/**
 * Reads the offline sync queue from localStorage.
 */
function readQueue(): OfflineSyncItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists the offline sync queue.
 */
function writeQueue(items: OfflineSyncItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

/**
 * Queues a failed visit persist so it can sync when connectivity returns.
 */
export function enqueueOfflineVisitSync(item: Omit<OfflineSyncItem, 'id' | 'queuedAt'>): void {
  const queue = readQueue();
  const next: OfflineSyncItem = {
    ...item,
    id: `${item.appointmentId}-${Date.now()}`,
    queuedAt: new Date().toISOString(),
  };
  const withoutDupes = queue.filter((entry) => entry.appointmentId !== item.appointmentId);
  writeQueue([...withoutDupes, next]);
}

/**
 * Hook that tracks online status and flushes queued visit updates when online.
 */
export function useOfflineVisitSync(
  syncFn: (item: OfflineSyncItem) => Promise<void>,
): {
  isOnline: boolean;
  pendingCount: number;
  flush: () => Promise<void>;
} {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);
  const syncFnRef = useRef(syncFn);
  syncFnRef.current = syncFn;
  const flushingRef = useRef(false);

  /**
   * Attempts to send all queued visit updates to the server.
   */
  const flush = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    flushingRef.current = true;
    try {
      const queue = readQueue();
      if (queue.length === 0) {
        setPendingCount(0);
        return;
      }

      const remaining: OfflineSyncItem[] = [];
      for (const item of queue) {
        try {
          await syncFnRef.current(item);
          // Successful sync — local draft can stay until workspace clears it.
        } catch {
          remaining.push(item);
        }
      }
      writeQueue(remaining);
      setPendingCount(remaining.length);
    } finally {
      flushingRef.current = false;
    }
  }, []);

  useEffect(() => {
    /**
     * Updates online flag and flushes the queue when the device reconnects.
     */
    function handleOnline(): void {
      setIsOnline(true);
      void flush();
    }

    /**
     * Marks the device as offline.
     */
    function handleOffline(): void {
      setIsOnline(false);
      setPendingCount(readQueue().length);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void flush();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flush]);

  return { isOnline, pendingCount, flush };
}

/**
 * Returns true when a local visit session still exists for an appointment.
 */
export function hasLocalVisitDraft(appointmentId: string): boolean {
  return Boolean(loadVisitSession(appointmentId));
}

/**
 * Clears a local visit draft after a successful remote sync.
 */
export function clearLocalVisitDraft(appointmentId: string): void {
  clearVisitSession(appointmentId);
}

export type { OfflineSyncItem, VisitSession };
