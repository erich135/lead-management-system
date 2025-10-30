import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, TechBooking } from '../types';
import { Download } from 'lucide-react';

interface DiaryProps {
  users: Profile[];
}

export function Diary({ users }: DiaryProps) {
  const [bookings, setBookings] = useState<TechBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tech_bookings')
        .select(`*, technician:profiles!tech_bookings_technician_id_fkey(*), lead:leads(*)`)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (data) setBookings(data as any);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (techFilter !== 'all' && b.technician_id !== techFilter) return false;
      if (dateFrom && b.booking_date < dateFrom) return false;
      if (dateTo && b.booking_date > dateTo) return false;
      return true;
    });
  }, [bookings, techFilter, dateFrom, dateTo]);

  function toCSV() {
    const header = ['Date', 'Start', 'End', 'Technician', 'Lead', 'Location', 'Notes'];
    const rows = filtered.map((b) => [
      b.booking_date,
      b.start_time,
      b.end_time,
      b.technician?.full_name || '',
      `${b.lead?.lead_number || ''} ${b.lead?.client_name || ''}`.trim(),
      b.location || '',
      b.notes || '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((x) => `"${(x || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diary.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toPDF() {
    // Lightweight PDF using print; for production consider jsPDF
    const printWindow = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Diary</title>`);
    printWindow.document.write(`<style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font:12px Arial}</style>`);
    printWindow.document.write(`</head><body>`);
    printWindow.document.write(`<h3>Technician Diary</h3>`);
    printWindow.document.write(`<table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Technician</th><th>Lead</th><th>Location</th><th>Notes</th></tr></thead><tbody>`);
    filtered.forEach((b) => {
      printWindow!.document.write(`<tr><td>${b.booking_date}</td><td>${b.start_time}</td><td>${b.end_time}</td><td>${b.technician?.full_name || ''}</td><td>${b.lead?.lead_number || ''} ${b.lead?.client_name || ''}</td><td>${b.location || ''}</td><td>${b.notes || ''}</td></tr>`);
    });
    printWindow.document.write(`</tbody></table>`);
    printWindow.document.write(`</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">Technician Diary</h3>
        <div className="flex gap-2">
          <button onClick={toCSV} className="px-3 py-2 border rounded-lg text-sm">Export CSV</button>
          <button onClick={toPDF} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1"><Download className="w-4 h-4"/> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Technician</label>
          <select value={techFilter} onChange={(e) => setTechFilter(e.target.value)} className="w-full border rounded px-2 py-1">
            <option value="all">All</option>
            {users.filter(u=>u.is_active).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="w-full border rounded px-2 py-1"/>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="w-full border rounded px-2 py-1"/>
        </div>
        <div className="flex items-end">
          <button onClick={load} className="px-3 py-2 border rounded-lg text-sm">Refresh</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No bookings found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Start</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">End</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Technician</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lead</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.booking_date}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.start_time}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.end_time}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.technician?.full_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.lead?.lead_number} — {b.lead?.client_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.location}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
