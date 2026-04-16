/**
 * DailyOverlapReport – Manager Dashboard
 * 
 * Shows a report of appointment overlap groups for a given date.
 * Helps managers identify where multiple reps are going to the same area
 * and suggests consolidation to save travel costs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Calendar, MapPin, Users, TrendingDown, Loader2, RefreshCw
} from 'lucide-react';
import { SmartDateInput } from '../SmartDateInput';
import { MapComponent, MapMarker, MapCircle, MARKER_COLORS, createCustomIcon } from '../map';
import {
  getDailyOverlaps,
  DailyOverlapGroup,
} from '../../lib/api';

interface DailyOverlapReportProps {
  initialDate?: string;
}

export default function DailyOverlapReport({ initialDate }: DailyOverlapReportProps) {
  const [date, setDate] = useState(initialDate || todayISO());
  const [radiusKm, setRadiusKm] = useState(5);
  const [groups, setGroups] = useState<DailyOverlapGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDailyOverlaps(date, radiusKm * 1000);
      setGroups(data);
      setSelectedGroup(null);
    } catch {
      setGroups([]);
    }
    setLoading(false);
  }, [date, radiusKm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Total potential savings
  const totalSavingsKm = groups.reduce((s, g) => s + g.potentialSavingsKm, 0);

  // Map data for selected group
  const mapMarkers: MapMarker[] = [];
  const mapCircles: MapCircle[] = [];

  if (selectedGroup !== null && groups[selectedGroup]) {
    const group = groups[selectedGroup];
    // Circle around the area
    mapCircles.push({
      id: 'overlap-area',
      center: [group.area.latitude, group.area.longitude],
      radius: group.radiusMeters,
      color: '#EF4444',
      fillColor: '#EF4444',
      fillOpacity: 0.1,
    });

    // Markers for each appointment
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];
    const repColorMap = new Map<string, string>();
    let colorIdx = 0;

    group.appointments.forEach((appt, i) => {
      if (!repColorMap.has(appt.repCodeId)) {
        repColorMap.set(appt.repCodeId, colors[colorIdx % colors.length]);
        colorIdx++;
      }
      const color = repColorMap.get(appt.repCodeId)!;

      mapMarkers.push({
        id: `overlap-${i}`,
        position: [appt.latitude, appt.longitude],
        label: appt.companyName,
        icon: createCustomIcon(color),
        popup: (
          <div className="text-sm min-w-[180px]">
            <p className="font-semibold">{appt.companyName}</p>
            <p className="text-gray-500">{appt.repName} ({appt.repCode})</p>
            <p className="text-gray-500">{appt.appointmentTime}</p>
          </div>
        ),
      });
    });
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          Area Overlap Report
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-gray-400" />
            <SmartDateInput
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Radius:</label>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
            </select>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 rounded hover:bg-gray-100"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 text-sm">
        <span className="flex items-center gap-1 text-gray-600">
          <Users size={14} />
          <strong>{groups.length}</strong> overlap group{groups.length !== 1 ? 's' : ''}
        </span>
        {totalSavingsKm > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <TrendingDown size={14} />
            ~{totalSavingsKm.toFixed(1)} km potential savings
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : groups.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
          <p>No overlapping appointments found for this date and radius.</p>
        </div>
      ) : (
        <div className="flex">
          {/* Groups list */}
          <div className="w-80 border-r border-gray-200 max-h-96 overflow-y-auto">
            {groups.map((group, idx) => (
              <div
                key={idx}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedGroup === idx ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
                onClick={() => setSelectedGroup(idx)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    Group {idx + 1}
                  </span>
                  <span className="text-xs text-amber-600 font-medium">
                    {group.uniqueReps.length} reps
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {group.appointments.length} appointments within {(group.radiusMeters / 1000).toFixed(1)} km
                </p>
                {group.potentialSavingsKm > 0 && (
                  <p className="text-xs text-green-600 mt-0.5">
                    ~{group.potentialSavingsKm} km savings if consolidated
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.appointments.slice(0, 3).map((appt, i) => (
                    <span key={i} className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                      {appt.repCode}
                    </span>
                  ))}
                  {group.appointments.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{group.appointments.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Map for selected group */}
          <div className="flex-1">
            {selectedGroup !== null ? (
              <MapComponent
                markers={mapMarkers}
                circles={mapCircles}
                height="384px"
                zoom={13}
              />
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-400 text-sm">
                Select a group to view on the map
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
