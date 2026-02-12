import React from 'react';
import { Navigation, WifiOff, Signal } from 'lucide-react';

interface TrackingIndicatorProps {
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSentAt: number | null;
  accuracy?: number;
}

/**
 * Persistent tracking indicator shown to the rep.
 * Provides transparency about location tracking status.
 * Displayed in the header/navbar area.
 */
const TrackingIndicator: React.FC<TrackingIndicatorProps> = ({
  isActive,
  connectionStatus,
  lastSentAt,
  accuracy,
}) => {
  if (!isActive) return null;

  const isConnected = connectionStatus === 'connected';
  const lastSentAgo = lastSentAt
    ? Math.round((Date.now() - lastSentAt) / 1000)
    : null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        isConnected
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-red-100 text-red-700 border border-red-200'
      }`}
      title={
        isConnected
          ? `Location tracking active${lastSentAgo != null ? ` · Last update ${lastSentAgo}s ago` : ''}${accuracy ? ` · ±${Math.round(accuracy)}m` : ''}`
          : 'Location tracking disconnected'
      }
    >
      {isConnected ? (
        <>
          <Navigation className="w-3 h-3" />
          <span className="hidden sm:inline">Tracking</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  );
};

export default TrackingIndicator;
