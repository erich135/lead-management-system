import { useEffect, useRef, useState } from 'react';
import { geocodeMapsBrowserConfig } from '../../../lib/api';
import {
  googleLookupUserMessage,
  STREET_MAP_ZOOM,
} from '../../../lib/googleAddressLookup';

const DEFAULT_CENTER = { lat: -26.2041, lng: 28.0473 };
const SCRIPT_ID = 'ars-google-maps-js';

type GoogleLatLngLiteral = { lat: number; lng: number };

type GoogleMapsMarker = {
  setPosition: (position: GoogleLatLngLiteral) => void;
  setMap: (map: GoogleMapsMap | null) => void;
  addListener: (eventName: string, handler: () => void) => void;
  getPosition: () => { lat: () => number; lng: () => number } | null;
};

type GoogleMapsMap = {
  setCenter: (position: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
  panTo: (position: GoogleLatLngLiteral) => void;
  addListener: (eventName: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } | null }) => void) => void;
};

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapsMap;
        Marker: new (opts: Record<string, unknown>) => GoogleMapsMarker;
        event: { trigger: (instance: unknown, eventName: string) => void };
      };
    };
    gm_authFailure?: () => void;
  }
}

function sameCoord(
  left: { lat: number; lng: number } | null,
  lat: number,
  lng: number,
): boolean {
  if (!left) return false;
  return Math.abs(left.lat - lat) < 1e-7 && Math.abs(left.lng - lng) < 1e-7;
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('maps_js_load_failed')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      previousAuthFailure?.();
      reject(new Error('maps_js_auth_failure'));
    };
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('maps_js_load_failed'));
    document.head.appendChild(script);
  });
}

interface GoogleSiteMapProps {
  latitude: number | null;
  longitude: number | null;
  onPin: (latitude: number, longitude: number) => void;
  onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
}

export function GoogleSiteMap({ latitude, longitude, onPin, onStatusChange }: GoogleSiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapsMap | null>(null);
  const markerRef = useRef<GoogleMapsMarker | null>(null);
  const lastEmittedRef = useRef<{ lat: number; lng: number } | null>(null);
  const onPinRef = useRef(onPin);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  onPinRef.current = onPin;

  function updateStatus(next: 'loading' | 'ready' | 'error') {
    setStatus(next);
    onStatusChange?.(next);
  }

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    async function setup() {
      try {
        const config = await geocodeMapsBrowserConfig();
        if (cancelled) return;
        await loadGoogleMapsScript(config.apiKey);
        if (cancelled || !containerRef.current || !window.google?.maps?.Map) return;

        const hasPin = latitude !== null && longitude !== null;
        const center = hasPin
          ? { lat: latitude, lng: longitude }
          : DEFAULT_CENTER;
        const map = new window.google.maps.Map(containerRef.current, {
          center,
          zoom: hasPin ? STREET_MAP_ZOOM : 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        mapRef.current = map;
        map.addListener('click', (event) => {
          const latLng = event.latLng;
          if (!latLng) return;
          emitPin(latLng.lat(), latLng.lng());
        });

        if (hasPin) {
          placeMarker({ lat: latitude, lng: longitude });
        }

        timers.push(
          window.setTimeout(() => window.google?.maps.event.trigger(map, 'resize'), 0),
          window.setTimeout(() => window.google?.maps.event.trigger(map, 'resize'), 150),
          window.setTimeout(() => window.google?.maps.event.trigger(map, 'resize'), 400),
        );
        updateStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(googleLookupUserMessage(error));
        updateStatus('error');
      }
    }

    function emitPin(lat: number, lng: number) {
      lastEmittedRef.current = { lat, lng };
      placeMarker({ lat, lng });
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(STREET_MAP_ZOOM);
      onPinRef.current(lat, lng);
    }

    function placeMarker(position: GoogleLatLngLiteral) {
      if (!window.google?.maps?.Marker || !mapRef.current) return;
      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position,
          draggable: true,
          title: 'Site location',
        });
        markerRef.current.addListener('dragend', () => {
          const next = markerRef.current?.getPosition();
          if (!next) return;
          emitPin(next.lat(), next.lng());
        });
        return;
      }
      markerRef.current.setPosition(position);
    }

    void setup();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
    // Map instance is created once; pin updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== 'ready' || latitude === null || longitude === null) return;
    if (sameCoord(lastEmittedRef.current, latitude, longitude)) return;
    const position = { lat: latitude, lng: longitude };
    if (!window.google?.maps?.Marker || !mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position,
        draggable: true,
        title: 'Site location',
      });
      markerRef.current.addListener('dragend', () => {
        const next = markerRef.current?.getPosition();
        if (!next) return;
        lastEmittedRef.current = { lat: next.lat(), lng: next.lng() };
        mapRef.current?.panTo({ lat: next.lat(), lng: next.lng() });
        onPinRef.current(next.lat(), next.lng());
      });
    } else {
      markerRef.current.setPosition(position);
    }
    mapRef.current.panTo(position);
    mapRef.current.setZoom(STREET_MAP_ZOOM);
  }, [latitude, longitude, status]);

  return (
    <div className="relative h-64 overflow-hidden rounded-[8px] border border-slate-200">
      <div ref={containerRef} className="h-full w-full" data-testid="spt-google-map" />
      {status === 'loading' ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-slate-600">
          Loading Google Maps…
        </p>
      ) : null}
      {status === 'error' && errorMessage ? (
        <p className="absolute inset-x-0 bottom-0 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
