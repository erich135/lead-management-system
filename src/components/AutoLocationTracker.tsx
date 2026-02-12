import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import useLocationTracking from '../hooks/useLocationTracking';
import { getAuthToken } from '../lib/api';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Invisible component that auto-starts GPS tracking for users
 * whose locationTrackingEnabled flag is true.
 * 
 * Also registers a Service Worker for background tracking
 * when the tab is minimized or screen locked.
 * 
 * Renders nothing — purely a side-effect component.
 * Place inside the authenticated app shell so it has access to AuthContext.
 */
export function AutoLocationTracker() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [socketReady, setSocketReady] = useState(false);

  const shouldTrack = !!user?.locationTrackingEnabled;
  const userId = user?.id;

  // Register/unregister the location tracking service worker
  useEffect(() => {
    if (!shouldTrack || !userId) {
      // Stop SW tracking when disabled
      if (swRegistrationRef.current) {
        navigator.serviceWorker?.controller?.postMessage({ type: 'STOP_TRACKING' });
      }
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/location-tracking-sw.js', {
          scope: '/',
        });
        if (cancelled) return;
        swRegistrationRef.current = reg;

        // Wait for the SW to become active
        const sw = reg.active || reg.installing || reg.waiting;
        if (sw?.state === 'activated' || sw?.state === 'activating') {
          sendStartToSW();
        } else {
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'activated') sendStartToSW();
          });
        }
      } catch (err) {
        console.warn('[AutoLocationTracker] SW registration failed:', err);
      }
    })();

    function sendStartToSW() {
      const token = getAuthToken();
      navigator.serviceWorker?.controller?.postMessage({
        type: 'START_TRACKING',
        payload: { token, apiBaseUrl: API_BASE_URL },
      });
    }

    return () => {
      cancelled = true;
      navigator.serviceWorker?.controller?.postMessage({ type: 'STOP_TRACKING' });
    };
  }, [shouldTrack, userId]);

  // Request Screen Wake Lock to keep screen on while tracking
  useEffect(() => {
    if (!shouldTrack) return;
    if (!('wakeLock' in navigator)) return;

    let wakeLock: WakeLockSentinel | null = null;

    (async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('[AutoLocationTracker] Wake lock acquired');
      } catch (err) {
        console.warn('[AutoLocationTracker] Wake lock failed:', err);
      }
    })();

    // Re-acquire on visibility change
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && shouldTrack) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch { /* ignore */ }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release();
    };
  }, [shouldTrack]);

  // Create/destroy socket based on tracking flag
  useEffect(() => {
    if (!shouldTrack || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],  // WebSocket only — no HTTP polling
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
    });

    socket.on('connect', () => {
      console.log('[AutoLocationTracker] Socket connected');
      setSocketReady(true);
    });

    socket.on('disconnect', () => {
      console.log('[AutoLocationTracker] Socket disconnected');
      setSocketReady(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[AutoLocationTracker] Socket connect error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [shouldTrack, userId]);

  // Only render the tracking hook when we have a socket and should track
  if (!shouldTrack || !socketReady || !socketRef.current) return null;

  return <TrackingRunner socket={socketRef.current} />;
}

/**
 * Inner component that actually runs the tracking hook.
 * Separated so the hook only runs when we are sure we should track.
 */
function TrackingRunner({ socket }: { socket: Socket }) {
  useLocationTracking({
    socket,
    enabled: true,
    intervalMs: 30000,
    onAttendanceMarked: (data) => {
      // Could show a toast notification here
      console.log('[AutoLocationTracker] Attendance auto-marked:', data);
    },
  });

  // Render nothing
  return null;
}

export default AutoLocationTracker;
