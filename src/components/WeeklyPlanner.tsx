import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, User, RefreshCw } from 'lucide-react';
import { getWeeklyAppointments } from '../lib/api';

type PlannerAppointment = {
  _id: string;
  appointmentDate: string;
  appointmentTime: string;
  location?: string;
  purpose?: string;
  notes?: string;
  salesLead?: {
    _id: string;
    leadNumber?: string;
    companyName?: string;
    branch?: { _id?: string; name?: string } | string;
    assignedRep?: { _id?: string; code?: string; name?: string } | string;
  };
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatTime(time: string) {
  // Expecting formats like "10:00 AM" or "10:00"; return as-is if unknown
  return time;
}

const WeeklyPlanner: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<PlannerAppointment[]>([]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    let isMounted = true;
    async function loadAppointments() {
      setLoading(true);
      setError(null);
      try {
        const startISO = weekStart.toISOString();
        const end = addDays(weekStart, 6);
        end.setHours(23, 59, 59, 999);
        const endISO = end.toISOString();
        const data = await getWeeklyAppointments({ startDate: startISO, endDate: endISO });
        if (isMounted) setAppointments(data || []);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load appointments');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAppointments();
    return () => {
      isMounted = false;
    };
  }, [weekStart]);

  const grouped = useMemo(() => {
    const map: Record<string, PlannerAppointment[]> = {};
    weekDays.forEach((d) => {
      const key = d.toDateString();
      map[key] = [];
    });

    appointments.forEach((appt) => {
      const dateKey = new Date(appt.appointmentDate).toDateString();
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(appt);
    });

    // sort by time within each day
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
    });

    return map;
  }, [appointments, weekDays]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Weekly Planner</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Previous Week
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-4 py-2 text-sm font-medium text-white bg-ars-primary rounded-lg hover:bg-ars-primary/90 transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next Week
          </button>
          <button
            onClick={() => setWeekStart((d) => new Date(d))}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const key = day.toDateString();
          const dayAppointments = grouped[key] || [];
          return (
            <div key={key} className="border border-gray-200 rounded-lg p-3 min-h-[220px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{formatDateLabel(day)}</h3>
                <span className="text-xs text-gray-500">{dayAppointments.length} appt</span>
              </div>

              <div className="space-y-2 flex-1">
                {dayAppointments.length === 0 && (
                  <div className="text-xs text-gray-500">No appointments</div>
                )}
                {dayAppointments.map((appt) => (
                  <div key={appt._id} className="border border-gray-100 rounded-lg p-2 bg-gray-50">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Clock className="w-4 h-4 text-ars-primary" /> {formatTime(appt.appointmentTime || '')}
                    </div>
                    <div className="text-sm text-ars-heading font-semibold mt-1">
                      {appt.salesLead?.companyName || 'Lead'}
                    </div>
                    <div className="text-xs text-gray-600">{appt.salesLead?.leadNumber || ''}</div>
                    {appt.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                        <MapPin className="w-3 h-3" /> {appt.location}
                      </div>
                    )}
                    {appt.purpose && (
                      <div className="text-xs text-gray-600 mt-1">{appt.purpose}</div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <User className="w-3 h-3" />
                      {(() => {
                        const rep = appt.salesLead?.assignedRep as any;
                        const repValue = typeof rep === 'object' ? rep?.code || rep?.name : rep;
                        const looksLikeObjectId = typeof repValue === 'string' && /^[0-9a-f]{24}$/i.test(repValue);
                        return repValue && !looksLikeObjectId ? repValue : 'Unassigned';
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-4 text-sm text-gray-600">Loading appointments...</div>
      )}
    </div>
  );
};

export default WeeklyPlanner;
