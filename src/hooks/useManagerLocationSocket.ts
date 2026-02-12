/**
 * useManagerLocationSocket
 * 
 * Hook for the manager live map — subscribes to the "managers" Socket.IO room
 * and receives real-time rep location updates, dwell-time alerts, etc.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../lib/api';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';

export interface RepLocationUpdate {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  batteryLevel?: number;
  isAtBranch?: boolean;
  branchName?: string;
}

export interface DwellAlert {
  userId: string;
  userName: string;
  minutes: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface AttendanceAutoMarked {
  userId: string;
  userName: string;
  appointmentId: string;
  distance: number;
  timestamp: string;
}

interface UseManagerLocationSocketOptions {
  enabled: boolean;
  onDwellAlert?: (alert: DwellAlert) => void;
  onAttendanceMarked?: (data: AttendanceAutoMarked) => void;
}

export function useManagerLocationSocket(options: UseManagerLocationSocketOptions) {
  const { enabled, onDwellAlert, onAttendanceMarked } = options;

  const [repLocations, setRepLocations] = useState<Map<string, RepLocationUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Keep callback refs stable
  const onDwellAlertRef = useRef(onDwellAlert);
  const onAttendanceMarkedRef = useRef(onAttendanceMarked);
  useEffect(() => {
    onDwellAlertRef.current = onDwellAlert;
    onAttendanceMarkedRef.current = onAttendanceMarked;
  }, [onDwellAlert, onAttendanceMarked]);

  useEffect(() => {
    if (!enabled) return;

    const token = getAuthToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],  // WebSocket only — no HTTP polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      // Subscribe to rep location updates
      socket.emit('manager:subscribe-locations', (response: any) => {
        if (response?.success && response.locations) {
          const initialMap = new Map<string, RepLocationUpdate>();
          for (const loc of response.locations) {
            initialMap.set(loc.userId, {
              userId: loc.userId,
              userName: 'Rep',
              latitude: loc.latitude,
              longitude: loc.longitude,
              accuracy: loc.accuracy,
              speed: loc.speed,
              heading: null,
              timestamp: loc.timestamp,
            });
          }
          setRepLocations(initialMap);
          setIsSubscribed(true);
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsSubscribed(false);
    });

    // Real-time location update from a rep
    socket.on('rep:location:update', (data: RepLocationUpdate) => {
      setRepLocations((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    // Rep went offline
    socket.on('rep:location:offline', (data: { userId: string }) => {
      setRepLocations((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Dwell-time alert
    socket.on('dwell:alert', (alert: DwellAlert) => {
      onDwellAlertRef.current?.(alert);
    });

    // Auto-attendance marked
    socket.on('attendance:auto-marked', (data: AttendanceAutoMarked) => {
      onAttendanceMarkedRef.current?.(data);
    });

    return () => {
      socket.emit('manager:unsubscribe-locations');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsSubscribed(false);
    };
  }, [enabled]);

  const repLocationArray = useCallback((): RepLocationUpdate[] => {
    return Array.from(repLocations.values());
  }, [repLocations]);

  return {
    repLocations,
    repLocationArray,
    isConnected,
    isSubscribed,
    activeRepCount: repLocations.size,
  };
}
