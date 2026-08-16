import React, { useMemo, useState } from 'react';
import { Clock, MapPin, Navigation } from 'lucide-react';
import type { PlannerAppointment } from './DiaryDayAppointmentCard';
import { CompletedVisitTypeLabel } from './DiaryCompletedDot';
import {
  formatAppointmentTime,
  formatAppointmentType,
} from './diaryUtils';
import {
  formatVisitClockTime,
  formatVisitDurationMinutes,
  formatVisitHistoryDate,
  parseStoredVisitRecord,
  type StoredVisitRecord,
} from './visitUtils';

interface VisitHistoryTimelineProps {
  appointment: PlannerAppointment;
  /** When false, location/GPS blocks are omitted because a map panel is shown above. */
  showLocationDetails?: boolean;
}

/**
 * Builds a fallback visit record from legacy appointment fields when structured feedback is missing.
 */
function buildLegacyVisitRecord(appointment: PlannerAppointment): StoredVisitRecord | null {
  if (appointment.status !== 'completed') {
    return null;
  }

  const endedAt = appointment.attendedAt || appointment.updatedAt;
  const startedAt = appointment.attendedAt || appointment.updatedAt;

  if (!endedAt) {
    return null;
  }

  return {
    startedAt,
    endedAt,
    durationSeconds: 0,
    durationLabel: '00:00:00',
    durationMinutes: 0,
    notes: appointment.notes || '',
    photos: [],
    photoCount: 0,
    location: appointment.location,
    outcome: appointment.outcome,
  };
}

/**
 * Read-only timeline showing everything captured during a completed site visit or RFQ.
 */
const VisitHistoryTimeline: React.FC<VisitHistoryTimelineProps> = ({
  appointment,
  showLocationDetails = true,
}) => {
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);

  const visitRecord = useMemo(
    () => parseStoredVisitRecord(appointment.feedback) || buildLegacyVisitRecord(appointment),
    [appointment],
  );

  if (!visitRecord) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <CompletedVisitTypeLabel appointmentType={appointment.appointmentType} size="sm" />
        <p className="mt-2">
          {new Date(appointment.appointmentDate).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        {appointment.notes?.trim() ? (
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6">
            {appointment.notes}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No detailed visit record was saved for this appointment.</p>
        )}
      </div>
    );
  }

  const locationLabel = visitRecord.location || appointment.location;
  const scheduledDate = new Date(appointment.appointmentDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const scheduledTime = formatAppointmentTime(appointment.appointmentTime);
  const durationLabel =
    visitRecord.durationMinutes > 0
      ? formatVisitDurationMinutes(visitRecord.durationSeconds)
      : null;
  const gpsMapsHref =
    visitRecord.gpsConfirmation?.coordinates?.length === 2
      ? `https://www.google.com/maps/search/?api=1&query=${visitRecord.gpsConfirmation.coordinates[1]},${visitRecord.gpsConfirmation.coordinates[0]}`
      : null;

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white p-4">
      <div>
        <CompletedVisitTypeLabel
          appointmentType={appointment.appointmentType}
          size="sm"
          className="text-base text-slate-900"
        />
        <p className="mt-2 text-sm text-slate-700">
          <span aria-hidden className="mr-1.5">
            📅
          </span>
          {scheduledDate} – {scheduledTime}
        </p>
      </div>

      <div className="space-y-2 border-l-2 border-emerald-200 pl-4 text-sm text-slate-700">
        {durationLabel && (
          <p>
            <span aria-hidden className="mr-1.5">
              🕒
            </span>
            Duration: {durationLabel}
          </p>
        )}

        <p>
          <span aria-hidden className="mr-1.5">
            ▶️
          </span>
          Started {formatVisitHistoryDate(visitRecord.startedAt)} at{' '}
          {formatVisitClockTime(visitRecord.startedAt)}
        </p>

        <p>
          <span aria-hidden className="mr-1.5">
            ⏹️
          </span>
          Finished {formatVisitHistoryDate(visitRecord.endedAt)} at{' '}
          {formatVisitClockTime(visitRecord.endedAt)}
        </p>

        {showLocationDetails && locationLabel && (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>
              <span aria-hidden className="mr-1">
                📍
              </span>
              Location: {locationLabel}
            </span>
          </p>
        )}

        {showLocationDetails && visitRecord.gpsConfirmation?.available && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="font-medium text-slate-800">
              <span aria-hidden className="mr-1.5">
                📡
              </span>
              GPS Confirmation
            </p>
            {visitRecord.gpsConfirmation.label && (
              <p className="mt-1 text-xs text-slate-600">{visitRecord.gpsConfirmation.label}</p>
            )}
            {visitRecord.gpsConfirmation.method && (
              <p className="mt-0.5 text-xs text-slate-500">
                Method: {visitRecord.gpsConfirmation.method.replace(/_/g, ' ')}
              </p>
            )}
            {typeof visitRecord.gpsConfirmation.accuracyMeters === 'number' && (
              <p className="mt-0.5 text-xs text-slate-500">
                Accuracy: ±{Math.round(visitRecord.gpsConfirmation.accuracyMeters)}m
              </p>
            )}
            {gpsMapsHref && (
              <a
                href={gpsMapsHref}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Navigation className="h-3.5 w-3.5" />
                View on map
              </a>
            )}
          </div>
        )}

        {visitRecord.notes?.trim() && (
          <div>
            <p className="mb-1 font-medium text-slate-800">
              <span aria-hidden className="mr-1.5">
                📝
              </span>
              Notes
            </p>
            <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">
              {visitRecord.notes}
            </div>
          </div>
        )}

        {visitRecord.photos.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-slate-800">
              <span aria-hidden className="mr-1.5">
                📷
              </span>
              Photos
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visitRecord.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() =>
                    setExpandedPhotoId((current) => (current === photo.id ? null : photo.id))
                  }
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-emerald-300"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                  <p className="truncate px-2 py-1.5 text-xs text-slate-600">
                    {photo.caption || `Photo ${index + 1}`}
                  </p>
                </button>
              ))}
            </div>
            {expandedPhotoId && (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img
                  src={visitRecord.photos.find((photo) => photo.id === expandedPhotoId)?.dataUrl}
                  alt="Expanded visit photo"
                  className="max-h-72 w-full object-contain"
                />
              </div>
            )}
          </div>
        )}

        {visitRecord.outcome && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Outcome: {visitRecord.outcome}
          </p>
        )}
      </div>
    </div>
  );
};

export default VisitHistoryTimeline;
