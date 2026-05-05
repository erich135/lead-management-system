/**
 * AdminActivityReport.tsx
 *
 * Shows how many jobs each admin created (= quotations) per day / week /
 * month / YTD with an average-per-working-day column.
 *
 * All figures are derived from job.createdAt so every job is counted
 * regardless of whether startDate was filled in.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getAdminActivitySummary,
  getAdminCodes,
  getUsers,
  AdminActivityData,
  AdminActivityRow,
  AdminCode,
  User,
  getAdminActivityScheduleConfig,
  updateAdminActivityScheduleConfig,
  sendAdminActivityNow,
  AdminActivityScheduleConfig,
} from '../lib/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Activity,
  Bell,
  BellOff,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  X,
  BarChart3,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  branches: { _id: string; name: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Today as YYYY-MM-DD in local time */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format a number to 1 dp, stripping trailing .0 */
function fmt1(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

/** Trend icon based on whether value is above/below average */
function TrendChip({ value, avg }: { value: number; avg: number }) {
  if (avg === 0 && value === 0) return null;
  const pct = avg > 0 ? ((value - avg) / avg) * 100 : 0;
  const above = value >= avg;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        above ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {above ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

/** Heat-map cell colour based on value vs team average */
function heatClass(value: number, avg: number): string {
  if (value === 0) return 'text-gray-300';
  if (avg === 0) return 'text-gray-700';
  const ratio = value / avg;
  if (ratio >= 1.5) return 'text-emerald-700 font-bold';
  if (ratio >= 1.0) return 'text-emerald-600 font-semibold';
  if (ratio >= 0.5) return 'text-amber-600';
  return 'text-rose-500';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminActivityReport({ branches }: Props) {
  // ── Filter state ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [adminOptions, setAdminOptions] = useState<AdminCode[]>([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [data, setData] = useState<AdminActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ── Schedule modal state ──────────────────────────────────────────────────
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedConfig, setSchedConfig] = useState<AdminActivityScheduleConfig>({
    isActive: false, sendTime: '07:00', recipients: [],
  });
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedSending, setSchedSending] = useState(false);
  const [schedMsg, setSchedMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  // User-picker for recipients
  const [userList, setUserList] = useState<User[]>([]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // ── Pie chart canvas ref ──────────────────────────────────────────────────
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Load admin codes ──────────────────────────────────────────────────────
  const ensureAdminCodes = useCallback(async () => {
    if (adminsLoaded) return;
    try {
      const res = await getAdminCodes();
      setAdminOptions(res.adminCodes.filter((a) => a.isActive));
      setAdminsLoaded(true);
    } catch { /* non-fatal */ }
  }, [adminsLoaded]);

  const openAdminDropdown = async () => {
    await ensureAdminCodes();
    setAdminDropdownOpen(true);
  };

  // ── Fetch report data ─────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminActivitySummary({
        date: selectedDate || undefined,
        adminCodes: selectedAdmins.length ? selectedAdmins : undefined,
        branches: selectedBranches.length ? selectedBranches : undefined,
      });
      setData(result);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleAdmin = (code: string) =>
    setSelectedAdmins((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));
  const toggleBranch = (id: string) =>
    setSelectedBranches((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // ── Team averages ─────────────────────────────────────────────────────────
  const teamAvg = data ? {
    daily:   data.rows.reduce((s, r) => s + r.daily,   0) / (data.rows.length || 1),
    weekly:  data.rows.reduce((s, r) => s + r.weekly,  0) / (data.rows.length || 1),
    monthly: data.rows.reduce((s, r) => s + r.monthly, 0) / (data.rows.length || 1),
    ytd:     data.rows.reduce((s, r) => s + r.ytd,     0) / (data.rows.length || 1),
    avg:     data.rows.reduce((s, r) => s + r.avgPerDay, 0) / (data.rows.length || 1),
  } : null;

  const totals = data ? data.rows.reduce(
    (acc, r) => ({ daily: acc.daily+r.daily, weekly: acc.weekly+r.weekly, monthly: acc.monthly+r.monthly, ytd: acc.ytd+r.ytd, avgPerDay: 0 }),
    { daily: 0, weekly: 0, monthly: 0, ytd: 0, avgPerDay: 0 },
  ) : null;

  // ── Pie chart drawing ─────────────────────────────────────────────────────
  const PIE_COLORS = [
    '#1d4ed8','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
    '#14b8a6','#e11d48','#a855f7','#0ea5e9','#d97706',
    '#22c55e','#e879f9','#fb923c',
  ];

  function drawPieOnCanvas(canvas: HTMLCanvasElement, rows: AdminRow[], totalYtd: number) {
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r  = size * 0.38;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    if (totalYtd === 0) return;

    let start = -Math.PI / 2;
    rows.forEach((row, i) => {
      const slice = (row.ytd / totalYtd) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label if slice is big enough
      if (slice > 0.2) {
        const midAngle = start + slice / 2;
        const lx = cx + (r * 0.65) * Math.cos(midAngle);
        const ly = cy + (r * 0.65) * Math.sin(midAngle);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, size * 0.04)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(row.adminCode, lx, ly);
      }
      start += slice;
    });
  }

  // Draw pie on the hidden canvas whenever data changes
  useEffect(() => {
    if (!data || !pieCanvasRef.current) return;
    const totalYtd = data.rows.reduce((s, r) => s + r.ytd, 0);
    drawPieOnCanvas(pieCanvasRef.current, data.rows, totalYtd);
  }, [data]);

  // ── Export helpers ────────────────────────────────────────────────────────
  const buildTableData = (): { head: string[]; rows: (string | number)[][] } => {
    if (!data) return { head: [], rows: [] };
    const { meta } = data;
    const head = ['Admin', `Daily  ${meta.dailyLabel}`, `Weekly  ${meta.weeklyLabel}`, `Monthly  ${meta.monthlyLabel}`, meta.ytdLabel, 'Avg / Day'];
    const rows: (string | number)[][] = data.rows.map((r) => [r.adminCode, r.daily, r.weekly, r.monthly, r.ytd, r.avgPerDay]);
    if (totals) rows.push(['TOTAL / TEAM AVG', totals.daily, totals.weekly, totals.monthly, totals.ytd, teamAvg ? parseFloat(fmt1(teamAvg.avg)) : '']);
    return { head, rows };
  };

  const exportExcel = () => {
    if (!data) return;
    const { head, rows } = buildTableData();
    const wb = XLSX.utils.book_new();

    // Sheet 1 — main table
    const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
    ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Admin Activity');

    // Sheet 2 — YTD distribution data (for manual chart creation)
    const totalYtd = data.rows.reduce((s, r) => s + r.ytd, 0);
    const distHead = ['Admin', 'YTD Jobs', 'Share %'];
    const distRows = data.rows.map((r) => [
      r.adminCode,
      r.ytd,
      totalYtd > 0 ? parseFloat(((r.ytd / totalYtd) * 100).toFixed(1)) : 0,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      [`YTD Distribution — ${data.meta.ytdLabel}  ·  Select A2:B${1 + distRows.length + 1} → Insert → Pie Chart`],
      distHead,
      ...distRows,
    ]);
    ws2['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'YTD Distribution');

    XLSX.writeFile(wb, `Admin_Activity_${selectedDate || 'report'}.xlsx`);
  };

  const exportPDF = () => {
    if (!data) return;
    const { head, rows } = buildTableData();
    const doc = new jsPDF({ orientation: 'landscape' });

    // Title
    doc.setFontSize(20);
    doc.setTextColor(26, 86, 219);
    doc.text('Admin Activity Report', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Reference date: ${data.meta.dailyLabel}   ·   Working days YTD: ${data.meta.workingDays}   ·   Generated: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`,
      14, 25,
    );

    // Table
    autoTable(doc, {
      head: [head],
      body: rows.map((r) => r.map(String)),
      startY: 30,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [26, 86, 219], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { fontStyle: 'bold' }, 5: { fontStyle: 'italic' } },
    });

    // Pie chart — draw on hidden canvas, embed as PNG
    const totalYtd = data.rows.reduce((s, r) => s + r.ytd, 0);
    if (totalYtd > 0 && pieCanvasRef.current) {
      const canvas = pieCanvasRef.current;
      drawPieOnCanvas(canvas, data.rows, totalYtd);
      const imgData = canvas.toDataURL('image/png');

      const tableEndY = (doc as any).lastAutoTable?.finalY ?? 30;
      const pageH = doc.internal.pageSize.getHeight();
      const spaceBelow = pageH - tableEndY - 20;

      if (spaceBelow >= 70) {
        // Fits on current page
        const chartY = tableEndY + 8;
        doc.setFontSize(10);
        doc.setTextColor(29, 78, 216);
        doc.text(`YTD Distribution — ${data.meta.ytdLabel}`, 14, chartY - 2);
        doc.addImage(imgData, 'PNG', 14, chartY + 2, 70, 70);
        addPieLegend(doc, data.rows, 90, chartY + 2, totalYtd);
      } else {
        // New page
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(29, 78, 216);
        doc.text(`YTD Distribution — ${data.meta.ytdLabel}`, 14, 18);
        doc.addImage(imgData, 'PNG', 14, 22, 80, 80);
        addPieLegend(doc, data.rows, 100, 22, totalYtd);
      }
    }

    doc.save(`Admin_Activity_${selectedDate || 'report'}.pdf`);
  };

  // Draw a colour-keyed legend next to the pie chart in the PDF
  function addPieLegend(doc: jsPDF, rows: AdminRow[], x: number, y: number, total: number) {
    doc.setFontSize(8);
    let ly = y;
    rows.forEach((r, i) => {
      if (r.ytd === 0) return;
      const col = PIE_COLORS[i % PIE_COLORS.length];
      const [rr, gg, bb] = [
        parseInt(col.slice(1, 3), 16),
        parseInt(col.slice(3, 5), 16),
        parseInt(col.slice(5, 7), 16),
      ];
      doc.setFillColor(rr, gg, bb);
      doc.rect(x, ly, 4, 4, 'F');
      doc.setTextColor(55, 65, 81);
      const pct = ((r.ytd / total) * 100).toFixed(1);
      doc.text(`${r.adminCode}  ${r.ytd} (${pct}%)`, x + 6, ly + 3.5);
      ly += 6;
    });
  }

  // ── Schedule modal helpers ────────────────────────────────────────────────
  const openScheduleModal = async () => {
    setScheduleOpen(true);
    setSchedMsg(null);
    setUserPickerOpen(false);
    setUserSearch('');
    setSchedLoading(true);
    try {
      const [cfg, usersResp] = await Promise.all([
        getAdminActivityScheduleConfig(),
        getUsers({ limit: 200 }),
      ]);
      setSchedConfig(cfg);
      setUserList((usersResp.users ?? []).filter((u) => u.isActive && u.email));
    } catch { /* use defaults */ }
    finally { setSchedLoading(false); }
  };

  const saveSchedule = async () => {
    setSchedSaving(true);
    setSchedMsg(null);
    try {
      const updated = await updateAdminActivityScheduleConfig({
        isActive: schedConfig.isActive,
        sendTime: schedConfig.sendTime,
        recipients: schedConfig.recipients,
      });
      setSchedConfig(updated);
      setSchedMsg({ type: 'ok', text: 'Schedule saved successfully' });
    } catch (err: any) {
      setSchedMsg({ type: 'err', text: err.message || 'Save failed' });
    } finally { setSchedSaving(false); }
  };

  const sendTestNow = async () => {
    if (!schedConfig.recipients.length) {
      setSchedMsg({ type: 'err', text: 'Add at least one recipient first' });
      return;
    }
    setSchedSending(true);
    setSchedMsg(null);
    try {
      const res = await sendAdminActivityNow(schedConfig.recipients);
      setSchedMsg({ type: 'ok', text: res.message });
    } catch (err: any) {
      setSchedMsg({ type: 'err', text: err.message || 'Send failed' });
    } finally { setSchedSending(false); }
  };

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e || !e.includes('@')) return;
    if (!schedConfig.recipients.includes(e)) {
      setSchedConfig((c) => ({ ...c, recipients: [...c.recipients, e] }));
    }
    setNewEmail('');
    setUserPickerOpen(false);
  };

  const addUserEmail = (email: string) => {
    const e = email.trim().toLowerCase();
    if (e && !schedConfig.recipients.includes(e)) {
      setSchedConfig((c) => ({ ...c, recipients: [...c.recipients, e] }));
    }
    setUserPickerOpen(false);
    setUserSearch('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Hidden canvas used for pie chart rendering in exports */}
      <canvas ref={pieCanvasRef} width={300} height={300} className="hidden" aria-hidden="true" />

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ars-heading flex items-center gap-2">
            <Activity className="w-5 h-5 text-ars-primary" />
            Admin Activity Report
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Quotation output per admin — one job created = one quotation
          </p>
        </div>
        <button
          onClick={openScheduleModal}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2 border border-ars-primary text-ars-primary rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          Schedule this Report
        </button>
      </div>

      {/* ── Schedule modal ────────────────────────────────────────────────── */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-ars-primary" />
                <h3 className="font-bold text-ars-heading text-base">Schedule Daily Report</h3>
              </div>
              <button onClick={() => setScheduleOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {schedLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-ars-primary" />
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">

                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    {schedConfig.isActive
                      ? <Bell className="w-4 h-4 text-emerald-600" />
                      : <BellOff className="w-4 h-4 text-gray-400" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {schedConfig.isActive ? 'Scheduled — Active' : 'Scheduling Disabled'}
                      </p>
                      <p className="text-xs text-gray-500">Sends yesterday's report every morning</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSchedConfig((c) => ({ ...c, isActive: !c.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${schedConfig.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${schedConfig.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Send time */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />Send Time (SAST)
                  </label>
                  <input
                    type="time"
                    value={schedConfig.sendTime}
                    onChange={(e) => setSchedConfig((c) => ({ ...c, sendTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ars-primary/30 focus:border-ars-primary"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Sends the report for the previous day at this time</p>
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />Recipients
                  </label>

                  {/* User picker dropdown */}
                  <div className="relative mb-2">
                    <button
                      type="button"
                      onClick={() => { setUserPickerOpen((o) => !o); setUserSearch(''); }}
                      className="flex items-center gap-1.5 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-left hover:border-ars-primary/60 focus:outline-none focus:ring-2 focus:ring-ars-primary/30 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-ars-primary flex-shrink-0" />
                      <span className="text-gray-500">Add recipient…</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${userPickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userPickerOpen && (
                      <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                        {/* Search inside picker */}
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search by name or email…"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ars-primary/40"
                          />
                        </div>

                        {/* System users list */}
                        <div className="max-h-48 overflow-y-auto">
                          {userList
                            .filter((u) => {
                              const q = userSearch.toLowerCase();
                              return (
                                !schedConfig.recipients.includes(u.email.toLowerCase()) &&
                                (q === '' || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
                              );
                            })
                            .map((u) => (
                              <button
                                key={u._id}
                                type="button"
                                onClick={() => addUserEmail(u.email)}
                                className="flex flex-col w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                              >
                                <span className="text-sm font-semibold text-gray-800">{u.firstName} {u.lastName}</span>
                                <span className="text-xs text-gray-500">{u.email}</span>
                              </button>
                            ))
                          }
                          {userList.filter((u) => {
                            const q = userSearch.toLowerCase();
                            return !schedConfig.recipients.includes(u.email.toLowerCase()) && (q === '' || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
                          }).length === 0 && (
                            <p className="px-4 py-3 text-xs text-gray-400 italic">No matching users found</p>
                          )}
                        </div>

                        {/* Manual email entry at bottom of picker */}
                        <div className="p-2 border-t border-gray-100 flex gap-2">
                          <input
                            type="email"
                            placeholder="Or type an email address…"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ars-primary/40"
                          />
                          <button
                            onClick={addEmail}
                            className="px-3 py-1.5 bg-ars-primary text-white text-xs font-semibold rounded-lg hover:bg-ars-primary/90"
                          >Add</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recipient chips */}
                  {schedConfig.recipients.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No recipients yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {schedConfig.recipients.map((email) => (
                        <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-100">
                          {email}
                          <button onClick={() => setSchedConfig((c) => ({ ...c, recipients: c.recipients.filter((r) => r !== email) }))} className="hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Last run status */}
                {schedConfig.lastRunAt && (
                  <div className={`text-xs px-3 py-2 rounded-lg border ${schedConfig.lastRunStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                    Last sent: {new Date(schedConfig.lastRunAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
                    {schedConfig.lastRunStatus === 'success' ? ' ✓' : ` — ${schedConfig.lastRunError || 'failed'}`}
                  </div>
                )}

                {/* Feedback message */}
                {schedMsg && (
                  <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${schedMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {schedMsg.type === 'ok' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {schedMsg.text}
                  </div>
                )}
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={sendTestNow}
                disabled={schedSending || schedLoading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                {schedSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Now (test)
              </button>
              <div className="flex gap-2">
                <button onClick={() => setScheduleOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveSchedule}
                  disabled={schedSaving || schedLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-ars-primary text-white text-sm font-semibold rounded-lg hover:bg-ars-primary/90 disabled:opacity-50 transition-colors"
                >
                  {schedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-ars-primary" />
          <h3 className="font-semibold text-ars-heading text-sm uppercase tracking-wide">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">

          {/* Reference date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Reference Date
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ars-primary/30 focus:border-ars-primary transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Sets the day / week / month shown</p>
          </div>

          {/* Admin multi-select */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Admin Codes{selectedAdmins.length > 0 && <span className="text-ars-primary ml-1">({selectedAdmins.length})</span>}
            </label>
            <button
              type="button"
              onClick={adminDropdownOpen ? () => setAdminDropdownOpen(false) : openAdminDropdown}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-left hover:border-ars-primary/50 focus:outline-none focus:ring-2 focus:ring-ars-primary/30 transition-colors"
            >
              <span className={selectedAdmins.length ? 'text-gray-800' : 'text-gray-400'}>
                {selectedAdmins.length ? selectedAdmins.join(', ') : 'All admins'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {adminDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                {adminOptions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
                ) : (
                  adminOptions.map((ac) => (
                    <label
                      key={ac._id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAdmins.includes(ac.code)}
                        onChange={() => toggleAdmin(ac.code)}
                        className="w-4 h-4 rounded text-ars-primary focus:ring-ars-primary"
                      />
                      <span className="text-sm font-semibold text-gray-800">{ac.code}</span>
                      {ac.description && (
                        <span className="text-xs text-gray-500 truncate">{ac.description}</span>
                      )}
                    </label>
                  ))
                )}
                {selectedAdmins.length > 0 && (
                  <button
                    onClick={() => { setSelectedAdmins([]); setAdminDropdownOpen(false); }}
                    className="w-full text-xs text-rose-500 hover:text-rose-600 px-4 py-2 border-t border-gray-100 text-left"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Branch filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Branches{selectedBranches.length > 0 && <span className="text-ars-primary ml-1">({selectedBranches.length})</span>}
            </label>
            <div className="flex flex-wrap gap-1.5 border border-gray-300 rounded-xl px-3 py-2 min-h-[42px] hover:border-ars-primary/50 transition-colors">
              {branches.length === 0 ? (
                <span className="text-xs text-gray-400 self-center">No branches</span>
              ) : (
                branches.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => toggleBranch(b._id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedBranches.includes(b._id)
                        ? 'bg-ars-primary text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {b.name}
                    {selectedBranches.includes(b._id) && <X className="w-3 h-3" />}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Load button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ars-primary text-white rounded-xl text-sm font-semibold hover:bg-ars-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
              ) : (
                <><RefreshCw className="w-4 h-4" />{hasLoaded ? 'Refresh' : 'Load Report'}</>
              )}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {(selectedAdmins.length > 0 || selectedBranches.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500 self-center">Active filters:</span>
            {selectedAdmins.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                {a}
                <button onClick={() => toggleAdmin(a)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {selectedBranches.map((id) => {
              const b = branches.find((x) => x._id === id);
              return b ? (
                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium border border-violet-100">
                  {b.name}
                  <button onClick={() => toggleBranch(id)} className="hover:text-violet-900"><X className="w-3 h-3" /></button>
                </span>
              ) : null;
            })}
            <button
              onClick={() => { setSelectedAdmins([]); setSelectedBranches([]); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline self-center ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasLoaded && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <BarChart3 className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold text-lg">No data loaded yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Select a reference date and click <strong>Load Report</strong>
          </p>
        </div>
      )}

      {/* ── Report content ────────────────────────────────────────────────── */}
      {hasLoaded && data && (
        <>
          {/* ── Summary cards ──────────────────────────────────────────────── */}
          {data.rows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.rows.map((row) => (
                <div
                  key={row.adminCode}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2.5 py-1 bg-ars-primary/10 text-ars-primary text-xs font-bold rounded-lg tracking-wider">
                        {row.adminCode}
                      </span>
                    </div>
                    <TrendChip value={row.daily} avg={teamAvg?.daily ?? 0} />
                  </div>

                  <div className="space-y-2.5 mt-4">
                    <StatLine icon={<CalendarDays className="w-3.5 h-3.5" />} label="Today" value={row.daily} avg={teamAvg?.daily ?? 0} />
                    <StatLine icon={<Calendar className="w-3.5 h-3.5" />} label="This week" value={row.weekly} avg={teamAvg?.weekly ?? 0} />
                    <StatLine icon={<Calendar className="w-3.5 h-3.5" />} label="This month" value={row.monthly} avg={teamAvg?.monthly ?? 0} />
                    <div className="pt-2 border-t border-gray-100">
                      <StatLine icon={<TrendingUp className="w-3.5 h-3.5" />} label="YTD" value={row.ytd} avg={teamAvg?.ytd ?? 0} bold />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">Avg / working day</span>
                        <span className="text-sm font-bold text-ars-primary">{fmt1(row.avgPerDay)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Main table ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table header bar */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-ars-heading">Performance Summary</h3>
                {data.meta && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Working days so far this year: <span className="font-semibold text-gray-600">{data.meta.workingDays}</span>
                    &nbsp;·&nbsp;
                    Reference date: <span className="font-semibold text-gray-600">{data.meta.dailyLabel}</span>
                  </p>
                )}
              </div>
              {/* Export buttons */}
              <div className="flex gap-2">
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>

            {/* No results */}
            {data.rows.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-sm">
                No activity found for the selected filters and date
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-ars-primary to-blue-600 text-white">
                      <th className="text-left px-5 py-4 font-semibold text-xs uppercase tracking-widest w-28">Admin</th>

                      {/* Daily */}
                      <th className="px-5 py-4 text-center min-w-[150px]">
                        <div className="font-semibold text-xs uppercase tracking-widest">Daily</div>
                        <div className="text-[11px] text-blue-200 font-normal mt-0.5">{data.meta.dailyLabel}</div>
                      </th>

                      {/* Weekly */}
                      <th className="px-5 py-4 text-center min-w-[200px]">
                        <div className="font-semibold text-xs uppercase tracking-widest">Weekly</div>
                        <div className="text-[11px] text-blue-200 font-normal mt-0.5">{data.meta.weeklyLabel}</div>
                      </th>

                      {/* Monthly */}
                      <th className="px-5 py-4 text-center min-w-[150px]">
                        <div className="font-semibold text-xs uppercase tracking-widest">Monthly</div>
                        <div className="text-[11px] text-blue-200 font-normal mt-0.5">{data.meta.monthlyLabel}</div>
                      </th>

                      {/* YTD */}
                      <th className="px-5 py-4 text-center min-w-[120px]">
                        <div className="font-semibold text-xs uppercase tracking-widest">{data.meta.ytdLabel}</div>
                        <div className="text-[11px] text-blue-200 font-normal mt-0.5">Jan 1 → today</div>
                      </th>

                      {/* Avg */}
                      <th className="px-5 py-4 text-center min-w-[130px]">
                        <div className="font-semibold text-xs uppercase tracking-widest">Avg / Day</div>
                        <div className="text-[11px] text-blue-200 font-normal mt-0.5">{data.meta.workingDays} working days</div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr
                        key={row.adminCode}
                        className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        {/* Admin code badge */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-ars-primary/10 text-ars-primary font-bold text-sm">
                            {row.adminCode}
                          </span>
                        </td>

                        {/* Daily */}
                        <td className="px-5 py-4 text-center">
                          <ValueCell value={row.daily} avg={teamAvg?.daily ?? 0} />
                        </td>

                        {/* Weekly */}
                        <td className="px-5 py-4 text-center">
                          <ValueCell value={row.weekly} avg={teamAvg?.weekly ?? 0} />
                        </td>

                        {/* Monthly */}
                        <td className="px-5 py-4 text-center">
                          <ValueCell value={row.monthly} avg={teamAvg?.monthly ?? 0} />
                        </td>

                        {/* YTD */}
                        <td className="px-5 py-4 text-center">
                          <ValueCell value={row.ytd} avg={teamAvg?.ytd ?? 0} large />
                        </td>

                        {/* Avg/day */}
                        <td className="px-5 py-4 text-center">
                          <span className={`text-lg font-bold tabular-nums ${heatClass(row.avgPerDay, teamAvg?.avg ?? 0)}`}>
                            {fmt1(row.avgPerDay)}
                          </span>
                          <TrendChip value={row.avgPerDay} avg={teamAvg?.avg ?? 0} />
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Totals / team average footer */}
                  {totals && teamAvg && (
                    <tfoot>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300">
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team Total</span>
                        </td>
                        <FooterCell value={totals.daily} />
                        <FooterCell value={totals.weekly} />
                        <FooterCell value={totals.monthly} />
                        <FooterCell value={totals.ytd} />
                        <td className="px-5 py-4 text-center">
                          <span className="text-base font-bold text-gray-600 tabular-nums">—</span>
                        </td>
                      </tr>
                      <tr className="bg-blue-50/60 border-t border-blue-100">
                        <td className="px-5 py-3">
                          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Team Avg</span>
                        </td>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-blue-600 tabular-nums">{fmt1(teamAvg.daily)}</td>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-blue-600 tabular-nums">{fmt1(teamAvg.weekly)}</td>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-blue-600 tabular-nums">{fmt1(teamAvg.monthly)}</td>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-blue-600 tabular-nums">{fmt1(teamAvg.ytd)}</td>
                        <td className="px-5 py-3 text-center text-sm font-bold text-blue-700 tabular-nums">{fmt1(teamAvg.avg)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* ── Legend ───────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
            <span className="font-semibold">Colour guide:</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> ≥ 150% of team avg</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> ≥ team avg</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> ≥ 50% of team avg</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> below 50% of team avg</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> zero</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatLine({
  icon,
  label,
  value,
  avg,
  bold = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  avg: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`flex items-center gap-1.5 text-xs ${bold ? 'text-gray-700 font-semibold' : 'text-gray-500'}`}>
        <span className="text-gray-400">{icon}</span>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? 'text-base font-bold text-gray-900' : 'text-sm font-semibold'} ${heatClass(value, avg)}`}>
        {value}
      </span>
    </div>
  );
}

function ValueCell({ value, avg, large = false }: { value: number; avg: number; large?: boolean }) {
  if (value === 0) {
    return <span className="text-gray-300 text-base">—</span>;
  }
  const cls = heatClass(value, avg);
  return (
    <span className={`tabular-nums ${large ? 'text-xl' : 'text-base'} font-bold ${cls}`}>
      {value}
    </span>
  );
}

function FooterCell({ value }: { value: number }) {
  return (
    <td className="px-5 py-4 text-center">
      <span className="text-lg font-extrabold text-gray-800 tabular-nums">{value}</span>
    </td>
  );
}
