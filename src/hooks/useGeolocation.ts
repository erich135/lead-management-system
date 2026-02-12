import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  speed: number | null; // m/s
  heading: number | null; // degrees
  timestamp: number;
}

export interface UseGeolocationOptions {
  /** Enable high accuracy (GPS). Default: true */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position in ms. Default: 10000 (10s) */
  maximumAge?: number;
  /** Timeout for position request in ms. Default: 15000 (15s) */
  timeout?: number;
  /** Watch mode: continuously track position. Default: false */
  watch?: boolean;
  /** Callback when position updates */
  onPositionUpdate?: (position: GeolocationPosition) => void;
  /** Callback on error */
  onError?: (error: GeolocationPositionError) => void;
}

export interface UseGeolocationReturn {
  /** Current position, null if not yet acquired */
  position: GeolocationPosition | null;
  /** Whether geolocation is supported */
  isSupported: boolean;
  /** Whether currently tracking */
  isTracking: boolean;
  /** Whether waiting for first position */
  isLoading: boolean;
  /** Current error, if any */
  error: GeolocationPositionError | null;
  /** Permission state: 'granted' | 'denied' | 'prompt' | 'unknown' */
  permissionState: string;
  /** Request a single position */
  getCurrentPosition: () => Promise<GeolocationPosition | null>;
  /** Start watching position */
  startTracking: () => void;
  /** Stop watching position */
  stopTracking: () => void;
}

/**
 * React hook for browser Geolocation API.
 * Handles permission requests, continuous tracking, and error states.
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 10000,
    timeout = 15000,
    watch = false,
    onPositionUpdate,
    onError,
  } = options;

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [permissionState, setPermissionState] = useState<string>('unknown');

  const watchIdRef = useRef<number | null>(null);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onErrorRef = useRef(onError);

  // Keep callback refs up to date
  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate;
  }, [onPositionUpdate]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Check permission state
  useEffect(() => {
    if (!isSupported) {
      setPermissionState('unsupported');
      return;
    }

    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state);
        result.onchange = () => {
          setPermissionState(result.state);
        };
      }).catch(() => {
        setPermissionState('unknown');
      });
    }
  }, [isSupported]);

  const geoOptions: PositionOptions = {
    enableHighAccuracy,
    maximumAge,
    timeout,
  };

  const handleSuccess = useCallback((pos: globalThis.GeolocationPosition) => {
    const newPosition: GeolocationPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      timestamp: pos.timestamp,
    };

    setPosition(newPosition);
    setError(null);
    setIsLoading(false);

    if (onPositionUpdateRef.current) {
      onPositionUpdateRef.current(newPosition);
    }
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err);
    setIsLoading(false);

    if (onErrorRef.current) {
      onErrorRef.current(err);
    }
  }, []);

  /** Request a single position reading */
  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition | null> => {
    if (!isSupported) return null;

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
          };
          setPosition(newPosition);
          setError(null);
          setIsLoading(false);
          resolve(newPosition);
        },
        (err) => {
          setError(err);
          setIsLoading(false);
          resolve(null);
        },
        geoOptions
      );
    });
  }, [isSupported, enableHighAccuracy, maximumAge, timeout]);

  /** Start continuous position tracking */
  const startTracking = useCallback(() => {
    if (!isSupported || watchIdRef.current !== null) return;

    setIsLoading(true);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );
  }, [isSupported, handleSuccess, handleError, enableHighAccuracy, maximumAge, timeout]);

  /** Stop continuous position tracking */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Auto-start watch mode if enabled
  useEffect(() => {
    if (watch && isSupported) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [watch, isSupported]);

  return {
    position,
    isSupported,
    isTracking,
    isLoading,
    error,
    permissionState,
    getCurrentPosition,
    startTracking,
    stopTracking,
  };
}

export default useGeolocation;
