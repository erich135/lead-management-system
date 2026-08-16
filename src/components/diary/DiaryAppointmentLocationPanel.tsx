import React, { useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { GeoPoint } from '../../types';
import { MapComponent, MARKER_COLORS, type MapCircle, type MapMarker } from '../map';
import { parseStoredVisitRecord } from './visitUtils';

interface AppointmentLocationSource {
  location?: string;
  geoLocation?: GeoPoint;
  geofenceRadius?: number;
  feedback?: string | null;
}

interface DiaryAppointmentLocationPanelProps {
  appointment: AppointmentLocationSource;
  readOnly?: boolean;
  className?: string;
}

/**
 * Resolves pinned map coordinates from appointment geoLocation or completed visit GPS.
 */
export function resolveAppointmentMapCoordinates(
  appointment: AppointmentLocationSource,
): [number, number] | null {
  const pinned = appointment.geoLocation?.coordinates;
  if (pinned?.length === 2) {
    const lng = Number(pinned[0]);
    const lat = Number(pinned[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
  }

  const visitRecord = parseStoredVisitRecord(appointment.feedback);
  const savedPin = visitRecord?.pinnedGeoLocation?.coordinates;
  if (savedPin?.length === 2) {
    const lng = Number(savedPin[0]);
    const lat = Number(savedPin[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
  }

  const gps = visitRecord?.gpsConfirmation?.coordinates;
  if (gps?.length === 2) {
    const lng = Number(gps[0]);
    const lat = Number(gps[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
  }

  return null;
}

/**
 * Shows the saved appointment pin on a read-only map with address and GPS coordinates.
 */
export const DiaryAppointmentLocationPanel: React.FC<DiaryAppointmentLocationPanelProps> = ({
  appointment,
  readOnly = true,
  className = '',
}) => {
  const coordinates = useMemo(
    () => resolveAppointmentMapCoordinates(appointment),
    [appointment],
  );

  const locationLabel =
    appointment.location?.trim() ||
    parseStoredVisitRecord(appointment.feedback)?.location?.trim() ||
    '';

  const mapsHref = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`
    : locationLabel
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`
      : null;

  if (!coordinates && !locationLabel) {
    return null;
  }

  const [lng, lat] = coordinates ?? [0, 0];
  const markers: MapMarker[] = coordinates
    ? [
        {
          id: 'appointment-pin',
          position: [lat, lng],
          label: locationLabel || 'Pinned location',
          color: MARKER_COLORS.appointment,
        },
      ]
    : [];

  const circles: MapCircle[] =
    coordinates && appointment.geofenceRadius
      ? [
          {
            id: 'appointment-geofence',
            center: [lat, lng],
            radius: appointment.geofenceRadius,
            color: MARKER_COLORS.geofence,
          },
        ]
      : [];

  return (
    <div className={`space-y-2 ${className}`}>
      {coordinates && (
        <MapComponent
          center={[lat, lng]}
          zoom={15}
          height="200px"
          markers={markers}
          circles={circles}
          draggable={!readOnly}
          scrollWheelZoom={!readOnly}
          showZoomControl
        />
      )}

      {locationLabel && (
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-ars-primary" />
          <span className="leading-5">{locationLabel}</span>
        </div>
      )}

      {coordinates && (
        <p className="text-xs text-gray-500">
          GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}

      {mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ars-primary hover:text-ars-primary/80"
        >
          <Navigation className="h-3.5 w-3.5" />
          Open in Google Maps
        </a>
      )}
    </div>
  );
};

export default DiaryAppointmentLocationPanel;
