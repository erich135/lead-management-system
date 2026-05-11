/**
 * RepDailyRouteView – Sales Rep own-route viewer
 * 
 * Shows:
 * - Map with their daily route polyline
 * - Stop markers with durations
 * - Summary stats (distance, stops, moving/stopped time)
 * - Date picker to view previous days
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MapPin, Route, Clock, Navigation, Calendar, Loader2 } from 'lucide-react';
import { SmartDateInput } from '../SmartDateInput';
import MapComponent from './MapComponent';
import type { MapRoute, MapCircle } from './MapComponent';
import { MARKER_COLORS } from './MapComponent';
import {
  getRepDailyRoute,
  getRepStopsAndTrips,
  RoutePoint,
  DailyRouteData,
} from '../../lib/api';

interface RepDailyRouteViewProps {
  /** The rep user's own ID */
  userId: string;
  /** Optional initial date (defaults to today) */
  initialDate?: string;
}

export default function RepDailyRouteView({ userId, initialDate }: RepDailyRouteViewProps) {
  const [date, setDate] = useState(initialDate || todayISO());
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeData, setRouteData] = useState<DailyRouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load route data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [points, data] = await Promise.all([
        getRepDailyRoute(userId, date),
        getRepStopsAndTrips(userId, date),
      ]);
      setRoutePoints(points);
      setRouteData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load route data');
      setRoutePoints([]);
      setRouteData(null);
    }
    setLoading(false);
  }, [userId, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Route polyline
  const routes: MapRoute[] = useMemo(() => {
    if (routePoints.length < 2) return [];
    return [{
      id: 'my-route',
      positions: routePoints.map((p) => [p.lat, p.lng] as [number, number]),
      color: '#6366F1',
      weight: 3,
    }];
  }, [routePoints]);

  // Stop circles
  const circles: MapCircle[] = useMemo(() => {
    if (!routeData?.stops) return [];
    return routeData.stops.map((stop, i) => ({
      id: `stop-${i}`,
      center: [stop.latitude, stop.longitude] as [number, number],
      radius: 60,
      color: stop.isAtBranch ? MARKER_COLORS.branch : '#8B5CF6',
      fillColor: stop.isAtBranch ? MARKER_COLORS.branch : '#8B5CF6',
      fillOpacity: 0.25,
    }));
  }, [routeData]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Route size={20} />
          My Daily Route
        </h3>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <SmartDateInput
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISO()}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          />
        </div>
      </div>

      {/* Summary stats */}
      {routeData && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-4 gap-4">
          <StatCard icon={<Route size={16} />} label="Distance" value={`${routeData.totalDistanceKm} km`} />
          <StatCard icon={<Navigation size={16} />} label="Moving" value={`${routeData.totalMovingMinutes} min`} />
          <StatCard icon={<Clock size={16} />} label="Stopped" value={`${routeData.totalStoppedMinutes} min`} />
          <StatCard icon={<MapPin size={16} />} label="Stops" value={`${routeData.stops.length}`} />
        </div>
      )}

      {/* Map */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-[1000] flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        )}
        {error && (
          <div className="p-4 text-center text-sm text-red-600">{error}</div>
        )}
        <MapComponent
          routes={routes}
          circles={circles}
          height="400px"
          zoom={12}
        />
      </div>

      {/* Stops list */}
      {routeData && routeData.stops.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Stops</h4>
          <div className="space-y-2">
            {routeData.stops.map((stop, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded border border-gray-100 bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${stop.isAtBranch ? 'bg-orange-500' : 'bg-purple-500'}`} />
                  <span className="text-sm text-gray-700">
                    {stop.isAtBranch ? 'Branch' : `Stop ${i + 1}`}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-3">
                  <span>{stop.durationMinutes} min</span>
                  <span>
                    {new Date(stop.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' → '}
                    {new Date(stop.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ============================================================
// Utils
// ============================================================

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
