import { useEffect, useRef, useCallback, useState } from 'react';
import { useGeolocation, GeolocationPosition } from './useGeolocation';

interface UseLocationTrackingOptions {
  /** Socket instance from the app */
  socket: any; // Socket.IO client instance
  /** Whether tracking should be active */
  enabled: boolean;
  /** Update interval in milliseconds. Default: 30000 (30s) */
  intervalMs?: number;
  /** Callback when attendance is auto-marked */
  onAttendanceMarked?: (data: {
    appointmentId: string;
    salesLeadId: string;
    distance: number;
    timestamp: string;
  }) => void;
}

interface TrackingState {
  /** Whether location tracking is currently active */
  isActive: boolean;
  /** Last sent location */
  lastSentPosition: GeolocationPosition | null;
  /** Last send timestamp */
  lastSentAt: number | null;
  /** Number of updates sent this session */
  updatesSent: number;
  /** Connection status */
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

/**
 * Hook that combines geolocation tracking with Socket.IO
 * to send position updates to the backend for geofence checking.
 * 
 * Only active during business hours (configurable) and when enabled.
 */
export function useLocationTracking(options: UseLocationTrackingOptions) {
  const {
    socket,
    enabled,
    intervalMs = 30000,
    onAttendanceMarked,
  } = options;

  const [trackingState, setTrackingState] = useState<TrackingState>({
    isActive: false,
    lastSentPosition: null,
    lastSentAt: null,
    updatesSent: 0,
    connectionStatus: 'disconnected',
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAttendanceMarkedRef = useRef(onAttendanceMarked);

  useEffect(() => {
    onAttendanceMarkedRef.current = onAttendanceMarked;
  }, [onAttendanceMarked]);

  const {
    position,
    isSupported,
    isTracking,
    error: geoError,
    permissionState,
    startTracking,
    stopTracking: stopGeoTracking,
    getCurrentPosition,
  } = useGeolocation({
    enableHighAccuracy: true,
    maximumAge: 15000,
    timeout: 20000,
  });

  /** Send current position to backend via Socket.IO */
  const sendLocationUpdate = useCallback(async () => {
    if (!socket?.connected || !enabled) return;

    const pos = position || (await getCurrentPosition());
    if (!pos) return;

    socket.emit(
      'location:update',
      {
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        speed: pos.speed,
        heading: pos.heading,
        timestamp: pos.timestamp,
        batteryLevel: await getBatteryLevel(),
      },
      (response: any) => {
        if (response?.success) {
          setTrackingState((prev) => ({
            ...prev,
            lastSentPosition: pos,
            lastSentAt: Date.now(),
            updatesSent: prev.updatesSent + 1,
          }));
        }
      }
    );
  }, [socket, enabled, position, getCurrentPosition]);

  // Start/stop tracking based on enabled prop
  useEffect(() => {
    if (enabled && isSupported) {
      startTracking();
      setTrackingState((prev) => ({ ...prev, isActive: true }));

      // Notify server
      socket?.emit('location:tracking-status', { active: true });

      // Send updates at interval
      intervalRef.current = setInterval(sendLocationUpdate, intervalMs);

      // Send initial position immediately
      sendLocationUpdate();
    } else {
      stopGeoTracking();
      setTrackingState((prev) => ({
        ...prev,
        isActive: false,
        updatesSent: 0,
      }));

      socket?.emit('location:tracking-status', { active: false });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isSupported]);

  // Listen for auto-attendance events from server
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceMarked = (data: any) => {
      if (onAttendanceMarkedRef.current) {
        onAttendanceMarkedRef.current(data);
      }
    };

    socket.on('attendance:auto-marked', handleAttendanceMarked);

    return () => {
      socket.off('attendance:auto-marked', handleAttendanceMarked);
    };
  }, [socket]);

  // Track connection status
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () =>
      setTrackingState((prev) => ({ ...prev, connectionStatus: 'connected' }));
    const handleDisconnect = () =>
      setTrackingState((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
    const handleError = () =>
      setTrackingState((prev) => ({ ...prev, connectionStatus: 'error' }));

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);

    if (socket.connected) {
      setTrackingState((prev) => ({ ...prev, connectionStatus: 'connected' }));
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
    };
  }, [socket]);

  return {
    trackingState,
    currentPosition: position,
    geoError,
    permissionState,
    isSupported,
    isTracking,
    sendLocationUpdate,
  };
}

/** Get battery level if Battery API is available */
async function getBatteryLevel(): Promise<number | undefined> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {
    // Battery API not available
  }
  return undefined;
}

export default useLocationTracking;
