/**
 * OverlapWarningBanner
 * 
 * Shown when creating/updating an appointment and the server detects
 * nearby appointments from other reps in the same area. Shows a
 * consolidation suggestion and a mini-map with the nearby appointments.
 */

import React, { useState } from 'react';
import { AlertTriangle, MapPin, ChevronDown, ChevronUp, Users } from 'lucide-react';
import type { NearbyAppointmentItem } from '../../lib/api';

interface OverlapWarningBannerProps {
  /** Number of nearby appointments found */
  nearbyCount: number;
  /** Number of other reps with appointments in the area */
  otherRepsCount: number;
  /** Whether consolidation is recommended */
  consolidationPossible: boolean;
  /** Consolidation message from the server */
  consolidationMessage?: string;
  /** The nearby appointments (max 5 shown) */
  nearbyAppointments: NearbyAppointmentItem[];
  /** Callback when user dismisses the warning */
  onDismiss?: () => void;
}

export default function OverlapWarningBanner({
  nearbyCount,
  otherRepsCount,
  consolidationPossible,
  consolidationMessage,
  nearbyAppointments,
  onDismiss,
}: OverlapWarningBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (nearbyCount === 0) return null;

  const severity = consolidationPossible ? 'amber' : 'blue';
  const bgColor = severity === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
  const iconColor = severity === 'amber' ? 'text-amber-600' : 'text-blue-600';
  const textColor = severity === 'amber' ? 'text-amber-800' : 'text-blue-800';
  const subTextColor = severity === 'amber' ? 'text-amber-700' : 'text-blue-700';

  return (
    <div className={`rounded-lg border ${bgColor} p-3 my-3`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className={`${iconColor} mt-0.5 flex-shrink-0`} />
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>
              Area Overlap Detected
            </p>
            <p className={`text-xs ${subTextColor} mt-0.5`}>
              {nearbyCount} appointment{nearbyCount > 1 ? 's' : ''} from{' '}
              {otherRepsCount} other rep{otherRepsCount > 1 ? 's' : ''} found nearby
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Consolidation message */}
      {consolidationMessage && (
        <div className={`mt-2 p-2 rounded ${severity === 'amber' ? 'bg-amber-100' : 'bg-blue-100'}`}>
          <p className={`text-xs ${subTextColor} flex items-center gap-1`}>
            <Users size={12} />
            {consolidationMessage}
          </p>
        </div>
      )}

      {/* Expand/collapse nearby list */}
      {nearbyAppointments.length > 0 && (
        <button
          className={`mt-2 text-xs ${subTextColor} hover:underline flex items-center gap-1`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide details' : `Show ${nearbyAppointments.length} nearby appointment${nearbyAppointments.length > 1 ? 's' : ''}`}
        </button>
      )}

      {/* Nearby appointments list */}
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {nearbyAppointments.map((appt) => (
            <div
              key={appt.appointmentId}
              className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 text-xs"
            >
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">{appt.companyName}</p>
                  <p className="text-gray-500">
                    {appt.repName} ({appt.repCode}) – {appt.appointmentTime}
                  </p>
                </div>
              </div>
              <span className="text-gray-400 whitespace-nowrap">
                {appt.distanceKm < 1
                  ? `${appt.distanceMeters}m away`
                  : `${appt.distanceKm} km away`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
