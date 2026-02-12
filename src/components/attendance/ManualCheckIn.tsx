import React, { useState } from 'react';
import { MapPin, Loader2, CheckCircle, WifiOff, AlertTriangle } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { Appointment } from '../../types';

interface ManualCheckInProps {
  appointment: Appointment;
  onCheckIn: (data: {
    appointmentId: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) => Promise<void>;
}

/**
 * Manual check-in button with GPS capture.
 * Used as fallback when auto-geofence detection fails.
 * 
 * Flow:
 * 1. Rep taps "I'm Here"
 * 2. System tries to get GPS location
 * 3. Sends check-in with whatever location data available
 * 4. Backend marks as manual_checkin (flagged differently from auto_geofence)
 */
const ManualCheckIn: React.FC<ManualCheckInProps> = ({ appointment, onCheckIn }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkInComplete, setCheckInComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getCurrentPosition, isSupported, permissionState } = useGeolocation();

  if (appointment.attended) {
    return null; // Already attended — don't show
  }

  const handleCheckIn = async () => {
    setIsChecking(true);
    setError(null);

    try {
      // Try to get GPS position for the check-in
      let locationData: { latitude?: number; longitude?: number; accuracy?: number } = {};

      if (isSupported) {
        const pos = await getCurrentPosition();
        if (pos) {
          locationData = {
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
          };
        }
      }

      await onCheckIn({
        appointmentId: appointment._id,
        ...locationData,
      });

      setCheckInComplete(true);
    } catch (err: any) {
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  if (checkInComplete) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
        <CheckCircle className="w-5 h-5" />
        <div>
          <p className="font-medium text-sm">Checked in successfully</p>
          <p className="text-xs text-green-600">
            Recorded as manual check-in
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckIn}
        disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium text-sm transition-colors"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying location...
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            I'm Here — Check In
          </>
        )}
      </button>

      {/* GPS status indicator */}
      {!isSupported && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
          <WifiOff className="w-3.5 h-3.5" />
          GPS not available. Check-in will be recorded without location verification.
        </div>
      )}

      {permissionState === 'denied' && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
          <AlertTriangle className="w-3.5 h-3.5" />
          Location permission denied. Enable location in your browser settings for verified check-in.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

export default ManualCheckIn;
