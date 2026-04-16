/**
 * LiveRepMap – Manager Dashboard Component
 * 
 * Shows:
 * - Live dots for each tracked sales rep (green=moving, amber=idle, gray=offline)
 * - Dwell-time alerts as toast notifications
 * - Auto-attendance confirmations
 * - Click a rep to see details + option to view daily route
 * - Date picker to load historical route trails
 * - Daily summary sidebar with distance, stops, time
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  MapPin, Users, AlertTriangle, Clock, Route, Activity,
  ChevronRight, X, Calendar, Navigation, Battery, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SmartDateInput } from '../SmartDateInput';
import { MapComponent, MapMarker, MapCircle, MapRoute, MARKER_COLORS, createCustomIcon } from '../map';
import {
  useManagerLocationSocket,
  RepLocationUpdate,
  DwellAlert,
} from '../../hooks/useManagerLocationSocket';
import {
  getRepDailyRoute,
  getRepStopsAndTrips,
  getAllRepSummaries,
  DailySummary,
  RoutePoint,
  DailyRouteData,
} from '../../lib/api';

// ============================================================
// Main Component
// ============================================================

interface LiveRepMapProps {
  /** If false, socket subscription is paused (e.g., when tab not visible) */
  enabled?: boolean;
}

export default function LiveRepMap({ enabled = true }: LiveRepMapProps) {
  const { hasPermission } = useAuth();
  const canView = hasPermission('location_tracking.view');

  // ----------------------------------------------------------
  // State (hooks must all run before any conditional return)
  // ----------------------------------------------------------
  const [dwellAlerts, setDwellAlerts] = useState<DwellAlert[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [routeDate, setRouteDate] = useState<string>(todayISO());
  const [routePoints, setRoutePoints] = useState<RoutePoint[] | null>(null);
  const [routeData, setRouteData] = useState<DailyRouteData | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // ----------------------------------------------------------
  // Socket subscription
  // ----------------------------------------------------------
  const handleDwellAlert = useCallback((alert: DwellAlert) => {
    setDwellAlerts((prev) => [alert, ...prev].slice(0, 20)); // keep last 20
  }, []);

  const { repLocations, repLocationArray, isConnected, isSubscribed, activeRepCount } =
    useManagerLocationSocket({
      enabled,
      onDwellAlert: handleDwellAlert,
    });

  // ----------------------------------------------------------
  // Load daily summaries on date change
  // ----------------------------------------------------------
  useEffect(() => {
    (async () => {
      setLoadingSummaries(true);
      try {
        const summaries = await getAllRepSummaries(routeDate);
        setDailySummaries(summaries);
      } catch {
        // Silently ignore – might be no data
      }
      setLoadingSummaries(false);
    })();
  }, [routeDate]);

  // ----------------------------------------------------------
  // Load route trail when a rep is selected
  // ----------------------------------------------------------
  const loadRoute = useCallback(async (userId: string) => {
    setLoadingRoute(true);
    try {
      const [points, data] = await Promise.all([
        getRepDailyRoute(userId, routeDate),
        getRepStopsAndTrips(userId, routeDate),
      ]);
      setRoutePoints(points);
      setRouteData(data);
    } catch {
      setRoutePoints(null);
      setRouteData(null);
    }
    setLoadingRoute(false);
  }, [routeDate]);

  const handleRepClick = useCallback((userId: string) => {
    setSelectedRepId(userId);
    loadRoute(userId);
  }, [loadRoute]);

  const clearSelection = useCallback(() => {
    setSelectedRepId(null);
    setRoutePoints(null);
    setRouteData(null);
  }, []);

  // ----------------------------------------------------------
  // Map markers
  // ----------------------------------------------------------
  const markers: MapMarker[] = useMemo(() => {
    const reps = repLocationArray();
    return reps.map((rep) => {
      const isMoving = (rep.speed ?? 0) > 2;
      const isSelected = rep.userId === selectedRepId;
      const color = rep.isAtBranch
        ? MARKER_COLORS.branch
        : isMoving
          ? MARKER_COLORS.rep
          : MARKER_COLORS.repIdle;

      return {
        id: rep.userId,
        position: [rep.latitude, rep.longitude] as [number, number],
        label: rep.userName,
        color,
        icon: createCustomIcon(color, isSelected ? [32, 48] : [25, 41]),
        popup: (
          <div className="text-sm min-w-[200px]">
            <p className="font-semibold text-gray-900">{rep.userName}</p>
            <div className="mt-1 space-y-0.5 text-gray-600">
              <p>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isMoving ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                {rep.isAtBranch ? `At branch: ${rep.branchName || 'Unknown'}` : isMoving ? 'Moving' : 'Stationary'}
              </p>
              {rep.speed != null && <p>Speed: {(rep.speed * 3.6).toFixed(1)} km/h</p>}
              {rep.accuracy && <p>Accuracy: ±{Math.round(rep.accuracy)}m</p>}
              {rep.batteryLevel != null && <p>Battery: {rep.batteryLevel}%</p>}
              <p className="text-xs text-gray-400">
                Updated: {new Date(rep.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              className="mt-2 text-xs text-blue-600 hover:underline"
              onClick={() => handleRepClick(rep.userId)}
            >
              View Route →
            </button>
          </div>
        ),
      };
    });
  }, [repLocationArray, selectedRepId, handleRepClick]);

  // Route polyline
  const routes: MapRoute[] = useMemo(() => {
    if (!routePoints || routePoints.length < 2) return [];
    return [{
      id: 'daily-route',
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
      radius: 80,
      color: stop.isAtBranch ? MARKER_COLORS.branch : '#EF4444',
      fillColor: stop.isAtBranch ? MARKER_COLORS.branch : '#EF4444',
      fillOpacity: 0.2,
    }));
  }, [routeData]);

  // ----------------------------------------------------------
  // Selected rep info
  // ----------------------------------------------------------
  const selectedRep = selectedRepId ? repLocations.get(selectedRepId) : null;
  const selectedSummary = dailySummaries.find((s) => s.userId === selectedRepId);

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  // Permission gate
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">You do not have permission to view live tracking.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-lg shadow-md overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                Live Tracking
              </h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? `${activeRepCount} online` : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Date picker */}
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <SmartDateInput
                value={routeDate}
                onChange={(e) => {
                  setRouteDate(e.target.value);
                  clearSelection();
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
              />
            </div>
          </div>

          {/* Dwell Alerts */}
          {dwellAlerts.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                Dwell Alerts
              </p>
              {dwellAlerts.slice(0, 3).map((alert, i) => (
                <p key={i} className="text-xs text-amber-700">
                  {alert.userName} – {alert.minutes}min stationary
                </p>
              ))}
            </div>
          )}

          {/* Rep List / Summaries */}
          <div className="flex-1 overflow-y-auto">
            {/* Live reps */}
            <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Active Reps ({activeRepCount})
            </div>
            {repLocationArray().map((rep) => (
              <RepListItem
                key={rep.userId}
                rep={rep}
                isSelected={rep.userId === selectedRepId}
                summary={dailySummaries.find((s) => s.userId === rep.userId)}
                onClick={() => handleRepClick(rep.userId)}
              />
            ))}

            {/* Daily summaries for reps NOT currently online */}
            {dailySummaries
              .filter((s) => !repLocations.has(s.userId))
              .map((summary) => (
                <div
                  key={summary.userId}
                  className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedRepId === summary.userId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleRepClick(summary.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{summary.userName}</span>
                    </div>
                    <span className="text-xs text-gray-400">offline</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    <span>{summary.totalDistanceKm} km</span>
                    <span>{summary.stopsCount} stops</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Selected Rep Detail */}
          {selectedRepId && (selectedRep || selectedSummary) && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  {selectedRep?.userName || selectedSummary?.userName}
                </p>
                <button onClick={clearSelection} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>

              {loadingRoute ? (
                <p className="text-xs text-gray-500">Loading route...</p>
              ) : routeData ? (
                <div className="space-y-1 text-xs text-gray-600">
                  <p className="flex items-center gap-1">
                    <Route size={12} /> {routeData.totalDistanceKm} km traveled
                  </p>
                  <p className="flex items-center gap-1">
                    <Navigation size={12} /> {routeData.totalMovingMinutes} min moving
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock size={12} /> {routeData.totalStoppedMinutes} min stopped
                  </p>
                  <p className="flex items-center gap-1">
                    <MapPin size={12} /> {routeData.stops.length} stops, {routeData.trips.length} trips
                  </p>
                  {routeData.stops.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="font-semibold text-gray-700">Stops:</p>
                      {routeData.stops.map((stop, i) => (
                        <div key={i} className="pl-2 border-l-2 border-gray-300">
                          <p>
                            {stop.isAtBranch ? '🏢 Branch' : `📍 Stop ${i + 1}`}
                            {' – '}{stop.durationMinutes} min
                          </p>
                          <p className="text-gray-400">
                            {new Date(stop.arrivalTime).toLocaleTimeString()} → {new Date(stop.departureTime).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No route data for this date</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {/* Toggle sidebar button */}
        <button
          className="absolute top-3 left-3 z-[1000] bg-white shadow rounded-md p-1.5 hover:bg-gray-50"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <ChevronRight size={16} className={showSidebar ? 'rotate-180' : ''} />
        </button>

        {/* Connection badge */}
        <div className="absolute top-3 right-3 z-[1000] bg-white shadow rounded-md px-2 py-1 text-xs flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`} />
          {isSubscribed ? 'Live' : 'Connecting...'}
        </div>

        <MapComponent
          markers={markers}
          circles={circles}
          routes={routes}
          height="100%"
          zoom={10}
        />
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function RepListItem({
  rep,
  isSelected,
  summary,
  onClick,
}: {
  rep: RepLocationUpdate;
  isSelected: boolean;
  summary?: DailySummary;
  onClick: () => void;
}) {
  const isMoving = (rep.speed ?? 0) > 2;
  const statusColor = rep.isAtBranch
    ? 'bg-orange-500'
    : isMoving
      ? 'bg-green-500'
      : 'bg-amber-500';

  return (
    <div
      className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm font-medium text-gray-800">{rep.userName}</span>
        </div>
        <div className="flex items-center gap-1">
          {rep.batteryLevel != null && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Battery size={10} />
              {rep.batteryLevel}%
            </span>
          )}
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>

      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
        <span>
          {rep.isAtBranch
            ? `At ${rep.branchName || 'branch'}`
            : isMoving
              ? `${((rep.speed ?? 0) * 3.6).toFixed(0)} km/h`
              : 'Stationary'}
        </span>
        {summary && (
          <>
            <span>•</span>
            <span>{summary.totalDistanceKm} km</span>
            <span>{summary.stopsCount} stops</span>
          </>
        )}
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
