import React from 'react';
import { MapPin, CheckCircle, XCircle, Clock, AlertTriangle, Navigation } from 'lucide-react';
import type { Appointment, AttendanceMethod } from '../../types';
import { formatDistance, geoJsonToLatLng } from '../../utils/geocoding';

interface AttendanceStatusBadgeProps {
  appointment: Appointment;
  /** Whether to show detailed info (distance, method) */
  detailed?: boolean;
}

const METHOD_LABELS: Record<AttendanceMethod, string> = {
  auto_geofence: 'Auto-verified',
  manual_checkin: 'Manual check-in',
  manual_override: 'Manager override',
};

const METHOD_COLORS: Record<AttendanceMethod, string> = {
  auto_geofence: 'bg-green-100 text-green-800 border-green-200',
  manual_checkin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  manual_override: 'bg-blue-100 text-blue-800 border-blue-200',
};

/**
 * Displays the attendance verification status of an appointment.
 * Shows different badges based on attendance method and status.
 */
const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({
  appointment,
  detailed = false,
}) => {
  // Determine status
  const isUpcoming = !appointment.attended && !appointment.noShowAutoDetected && isInFuture(appointment);
  const isNoShow = !appointment.attended && (appointment.noShowAutoDetected || isPast(appointment));
  const isAttended = appointment.attended;

  if (isAttended) {
    const method = appointment.attendanceMethod || 'manual_checkin';
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${METHOD_COLORS[method]}`}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span>{METHOD_LABELS[method]}</span>
        {detailed && appointment.attendedAt && (
          <span className="text-xs opacity-75 ml-1">
            {new Date(appointment.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    );
  }

  if (isNoShow) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
        <XCircle className="w-3.5 h-3.5" />
        <span>{appointment.noShowAutoDetected ? 'No-show (auto-detected)' : 'Missed'}</span>
      </div>
    );
  }

  if (isUpcoming) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending</span>
      </div>
    );
  }

  return null;
};

interface AttendanceDetailCardProps {
  appointment: Appointment;
}

/**
 * Detailed attendance card showing location verification info.
 * For use in appointment detail views.
 */
export const AttendanceDetailCard: React.FC<AttendanceDetailCardProps> = ({ appointment }) => {
  if (!appointment.attended && !appointment.noShowAutoDetected) {
    return null;
  }

  const method = appointment.attendanceMethod;
  const location = appointment.attendanceLocation;

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          Attendance Verification
        </h4>
        <AttendanceStatusBadge appointment={appointment} detailed />
      </div>

      {appointment.attended && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 block">Method</span>
            <span className="font-medium">
              {method ? METHOD_LABELS[method] : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Verified at</span>
            <span className="font-medium">
              {appointment.attendedAt
                ? new Date(appointment.attendedAt).toLocaleString()
                : 'N/A'}
            </span>
          </div>
          {location?.coordinates && (
            <>
              <div>
                <span className="text-gray-500 block">GPS Coordinates</span>
                <span className="font-medium text-xs font-mono">
                  {location.coordinates[1].toFixed(6)}, {location.coordinates[0].toFixed(6)}
                </span>
              </div>
              {appointment.attendanceAccuracy != null && (
                <div>
                  <span className="text-gray-500 block">GPS Accuracy</span>
                  <span className="font-medium">
                    ±{formatDistance(appointment.attendanceAccuracy)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {appointment.noShowAutoDetected && !appointment.attended && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">No-show auto-detected</p>
            <p className="text-red-500 text-xs mt-1">
              The rep did not arrive at the appointment location within the expected time window.
            </p>
            {appointment.noShowReason && (
              <p className="text-red-500 text-xs mt-1">
                Reason: {appointment.noShowReason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceStatusBadge;

// ============================================================
// Helpers
// ============================================================

function isInFuture(appointment: Appointment): boolean {
  const date = new Date(appointment.appointmentDate);
  return date >= new Date(new Date().toISOString().split('T')[0]);
}

function isPast(appointment: Appointment): boolean {
  return !isInFuture(appointment);
}
