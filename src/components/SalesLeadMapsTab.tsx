/**
 * SalesLeadMapsTab – Manager Map Hub
 *
 * Sub-views:
 *   1. Live Tracking  – real-time rep locations (LiveRepMap)
 *   2. Appointments   – upcoming appointment locations on a map with filters
 *   3. Daily Routes   – view any rep's route for a chosen date
 *   4. Overlap Report – see where reps overlap and can consolidate
 *
 * Permission-gated: requires `location_tracking.view`.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, Navigation, AlertTriangle, Loader2,
  Route as RouteIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LiveRepMap from './map/LiveRepMap';
import DailyOverlapReport from './map/DailyOverlapReport';
import { MapComponent, type MapMarker, type MapRoute, createCustomIcon } from './map';
import {
  getWeeklyAppointments,
  getAllRepSummaries,
  getRepDailyRoute,
  getRepStopsAndTrips,
  type RoutePoint,
  type DailyRouteData,
  type DailySummary,
  type Branch,
  type RepCode,
} from '../lib/api';
import { SmartDateInput } from './SmartDateInput';

type MapSubView = 'live' | 'appointments' | 'routes' | 'overlaps';

interface SalesLeadMapsTabProps {
  branches: Branch[];
  repCodes: RepCode[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesLeadMapsTab({ branches, repCodes }: SalesLeadMapsTabProps) {
  const { hasPermission } = useAuth();
  const [subView, setSubView] = useState<MapSubView>('live');

  if (!hasPermission('location_tracking.view')) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border m-6">
        <p className="text-gray-500">You do not have permission to view tracking maps.</p>
      </div>
    );
  }

  const subTabs: { id: MapSubView; label: string; icon: React.ReactNode }[] = [
    { id: 'live', label: 'Live Tracking', icon: <Navigation size={16} /> },
    { id: 'appointments', label: 'Appointments Map', icon: <MapPin size={16} /> },
    { id: 'routes', label: 'Daily Routes', icon: <RouteIcon size={16} /> },
    { id: 'overlaps', label: 'Overlap Report', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubView(tab.id)}
            className={`
              flex items-center gap-1.5 py-3 px-4 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
              ${
                subView === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {subView === 'live' && <LiveRepMap enabled />}
        {subView === 'appointments' && (
          <AppointmentsMapView branches={branches} repCodes={repCodes} />
        )}
        {subView === 'routes' && (
          <RoutesExplorerView repCodes={repCodes} />
        )}
        {subView === 'overlaps' && <DailyOverlapReport />}
      </div>
    </div>
  );
}

// ============================================================
// Appointments Map Sub-View
// ============================================================

function AppointmentsMapView({ branches, repCodes }: { branches: Branch[]; repCodes: RepCode[] }) {
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [branchFilter, setBranchFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attended' | 'pending' | 'missed'>('all');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWeeklyAppointments({
        startDate,
        endDate,
        branch: branchFilter || undefined,
        assignedRep: repFilter || undefined,
      });
      setAppointments(data);
    } catch {
      setAppointments([]);
    }
    setLoading(false);
  }, [startDate, endDate, branchFilter, repFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Filter by attendance status
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return appointments;
    return appointments.filter((a) => {
      if (statusFilter === 'attended') return a.attended;
      if (statusFilter === 'missed') return !a.attended && new Date(a.appointmentDate) < new Date();
      return !a.attended; // pending
    });
  }, [appointments, statusFilter]);

  // Build map markers from appointments that have geoLocation
  const markers: MapMarker[] = useMemo(() => {
    return filtered
      .filter((a) => a.geoLocation?.coordinates)
      .map((a, i) => {
        const [lng, lat] = a.geoLocation.coordinates;
        const isAttended = a.attended;
        const isPast = new Date(a.appointmentDate) < new Date();
        const color = isAttended ? 'green' : isPast ? 'red' : 'blue';
        const company = a.salesLead?.companyName || a.location || 'Appointment';
        const repName = a.salesLead?.assignedRep?.code || '';

        return {
          id: a._id,
          position: [lat, lng] as [number, number],
          popup: `
            <div style="min-width:200px">
              <strong>${company}</strong><br/>
              <span style="color:#666">${a.appointmentDate} ${a.appointmentTime || ''}</span><br/>
              <span>Rep: ${repName}</span><br/>
              <span>${a.location || ''}</span><br/>
              <em>${isAttended ? '✅ Attended' : isPast ? '❌ Missed' : '⏳ Upcoming'}</em>
              ${a.purpose ? `<br/><span>Purpose: ${a.purpose}</span>` : ''}
            </div>
          `,
          icon: createCustomIcon(color),
        };
      });
  }, [filtered]);

  const totalWithGeo = filtered.filter((a) => a.geoLocation?.coordinates).length;
  const totalWithoutGeo = filtered.length - totalWithGeo;

  return (
    <div className="flex flex-col h-full">
      {/* Filters bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <SmartDateInput
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <SmartDateInput
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rep</label>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="">All Reps</option>
              {repCodes.map((r) => (
                <option key={r._id} value={r._id}>{r.code} – {r.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border rounded-md px-3 py-1.5 text-sm min-w-[120px]"
            >
              <option value="all">All</option>
              <option value="pending">Upcoming</option>
              <option value="attended">Attended</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-500">
            {loading && <Loader2 className="animate-spin" size={16} />}
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-blue-500" />
              {totalWithGeo} on map
            </span>
            {totalWithoutGeo > 0 && (
              <span className="text-amber-600 text-xs">
                {totalWithoutGeo} without coordinates
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[400px]">
        <MapComponent
          markers={markers}
          center={[-26.2041, 28.0473]}
          zoom={markers.length > 0 ? undefined : 6}
          height="100%"
        />
      </div>
    </div>
  );
}

// ============================================================
// Routes Explorer Sub-View
// ============================================================

function RoutesExplorerView({ repCodes }: { repCodes: RepCode[] }) {
  const [selectedRep, setSelectedRep] = useState('');
  const [date, setDate] = useState(todayISO());
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeData, setRouteData] = useState<DailyRouteData | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all rep summaries for the selected date (overview)
  useEffect(() => {
    (async () => {
      try {
        const data = await getAllRepSummaries(date);
        setSummaries(data);
      } catch {
        setSummaries([]);
      }
    })();
  }, [date]);

  // Load route when a rep is selected
  useEffect(() => {
    if (!selectedRep) {
      setRoutePoints([]);
      setRouteData(null);
      return;
    }
    setLoading(true);
    Promise.all([
      getRepDailyRoute(selectedRep, date),
      getRepStopsAndTrips(selectedRep, date),
    ])
      .then(([points, data]) => {
        setRoutePoints(points);
        setRouteData(data);
      })
      .catch(() => {
        setRoutePoints([]);
        setRouteData(null);
      })
      .finally(() => setLoading(false));
  }, [selectedRep, date]);

  // Build map route
  const mapRoute: MapRoute | undefined = useMemo(() => {
    if (routePoints.length < 2) return undefined;
    return {
      id: 'rep-route',
      positions: routePoints.map((p) => [p.lat, p.lng] as [number, number]),
      color: '#3b82f6',
      weight: 3,
    };
  }, [routePoints]);

  // Build stop markers
  const stopMarkers: MapMarker[] = useMemo(() => {
    if (!routeData?.stops) return [];
    return routeData.stops.map((stop, i) => ({
      id: `stop-${i}`,
      position: [stop.latitude, stop.longitude] as [number, number],
      popup: `
        <div>
          <strong>Stop #${i + 1}</strong><br/>
          Duration: ${Math.round(stop.durationMinutes)} min<br/>
          ${stop.arrivalTime ? `From: ${new Date(stop.arrivalTime).toLocaleTimeString()}` : ''}
          ${stop.departureTime ? `<br/>To: ${new Date(stop.departureTime).toLocaleTimeString()}` : ''}
        </div>
      `,
      icon: createCustomIcon('orange'),
    }));
  }, [routeData]);

  const selectedSummary = summaries.find((s) => s.userId === selectedRep);

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
        {/* Date & Rep selector */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <SmartDateInput
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Rep</label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm w-full"
            >
              <option value="">— Choose a rep —</option>
              {repCodes.map((r) => (
                <option key={r._id} value={(r as any).user || r._id}>
                  {r.code} – {r.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary stats */}
        {selectedRep && selectedSummary && (
          <div className="p-4 border-b border-gray-200 space-y-2 text-sm">
            <h4 className="font-semibold text-gray-800">Day Summary</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded p-2">
                <p className="text-xs text-blue-600">Distance</p>
                <p className="font-bold text-blue-800">{(selectedSummary.totalDistanceKm || 0).toFixed(1)} km</p>
              </div>
              <div className="bg-green-50 rounded p-2">
                <p className="text-xs text-green-600">Stops</p>
                <p className="font-bold text-green-800">{selectedSummary.stopsCount || 0}</p>
              </div>
              <div className="bg-amber-50 rounded p-2">
                <p className="text-xs text-amber-600">Moving</p>
                <p className="font-bold text-amber-800">{selectedSummary.totalMovingMinutes || 0} min</p>
              </div>
              <div className="bg-purple-50 rounded p-2">
                <p className="text-xs text-purple-600">Stopped</p>
                <p className="font-bold text-purple-800">{selectedSummary.totalStoppedMinutes || 0} min</p>
              </div>
            </div>
            {selectedSummary.firstActivity && (
              <p className="text-xs text-gray-500">
                Tracking: {new Date(selectedSummary.firstActivity).toLocaleTimeString()} – {selectedSummary.lastActivity ? new Date(selectedSummary.lastActivity).toLocaleTimeString() : '...'}
              </p>
            )}
          </div>
        )}

        {/* All reps overview for the day */}
        <div className="flex-1 overflow-auto p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            All Reps – {date}
          </h4>
          {summaries.length === 0 ? (
            <p className="text-sm text-gray-400">No tracking data for this date</p>
          ) : (
            <div className="space-y-2">
              {summaries.map((s) => (
                <button
                  key={s.userId}
                  onClick={() => setSelectedRep(s.userId)}
                  className={`w-full text-left rounded-lg p-2.5 text-sm border transition-colors ${
                    selectedRep === s.userId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-800">{s.userName || s.userId}</p>
                  <p className="text-xs text-gray-500">
                    {(s.totalDistanceKm || 0).toFixed(1)} km · {s.stopsCount || 0} stops · {s.tripsCount || 0} trips
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}
        <MapComponent
          markers={stopMarkers}
          routes={mapRoute ? [mapRoute] : undefined}
          center={
            routePoints.length > 0
              ? [routePoints[0].lat, routePoints[0].lng]
              : [-26.2041, 28.0473]
          }
          zoom={routePoints.length > 0 ? 13 : 6}
          height="100%"
        />
      </div>
    </div>
  );
}
