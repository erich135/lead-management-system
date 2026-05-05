/**
 * ScheduledReports.tsx
 * Super admin UI for managing automated scheduled PDF reports.
 * - List all reports with status, schedule, last run info
 * - Create / Edit report with full configuration
 * - Toggle active/inactive
 * - Delete (with confirmation)
 * - "Send Now" for immediate test delivery
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Send,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Filter,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
} from 'lucide-react';
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  toggleScheduledReport,
  deleteScheduledReport,
  sendScheduledReportNow,
  previewScheduledReport,
  getBranches,
  getRepCodes,
  ScheduledReport,
  ScheduledReportPayload,
  ScheduledReportSections,
  ScheduledReportFilters,
  ScheduledReportFrequency,
  ScheduledReportDateRange,
  Branch,
  RepCode,
} from '../lib/api';

// ─────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ScheduledReportsProps {
  allUsers: User[];
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'appointment_attended', label: 'Appointment Attended' },
  { value: 'rfc_requested', label: 'RFC Requested' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const LEAD_SOURCES = [
  'Cold Call', 'Referral', 'Website', 'Trade Show', 'Social Media',
  'Walk-in', 'Email Campaign', 'Partner', 'Other',
];

const DATE_RANGE_OPTIONS: { value: ScheduledReportDateRange; label: string }[] = [
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'last12months', label: 'Last 12 Months' },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_SECTIONS: ScheduledReportSections = {
  overview: true,
  leadPerformance: true,
  repPerformance: false,
  sourceAnalysis: false,
  appointmentAnalytics: false,
  branchPerformance: false,
  leadAging: false,
  lostReasons: false,
  quotesPerDayPerAdmin: false,
};

const DEFAULT_FILTERS: ScheduledReportFilters = {
  branches: [],
  assignedReps: [],
  leadSources: [],
  statuses: [],
  dateRangeType: 'yesterday',
};

const EMPTY_FORM: ScheduledReportPayload = {
  name: '',
  description: '',
  sections: { ...DEFAULT_SECTIONS },
  filters: { ...DEFAULT_FILTERS },
  frequency: 'daily',
  sendTime: '07:00',
  recipients: [],
  isActive: true,
};

// ─────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────

function MultiSelectPill({
  label,
  options,
  selected,
  onChange,
  valueKey = '_id',
  labelKey = 'name',
}: {
  label: string;
  options: any[];
  selected: string[];
  onChange: (vals: string[]) => void;
  valueKey?: string;
  labelKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = selected.map(
    (v) => options.find((o) => o[valueKey] === v)?.[labelKey] ?? v,
  );

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <span className="text-gray-600 truncate">
          {selected.length === 0
            ? `All (no filter)`
            : `${selected.length} selected`}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedLabels.map((lbl, i) => (
            <span
              key={selected[i]}
              className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full"
            >
              {lbl}
              <button type="button" onClick={() => toggle(selected[i])}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No options available</div>
          ) : (
            options.map((opt) => {
              const val = opt[valueKey];
              const lbl = opt[labelKey];
              const checked = selected.includes(val);
              return (
                <label
                  key={val}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(val)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span>{lbl}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function StringMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const objs = options.map((o) => ({ value: o, label: o }));
  return (
    <MultiSelectPill
      label={label}
      options={objs}
      selected={selected}
      onChange={onChange}
      valueKey="value"
      labelKey="label"
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────

function StatusBadge({ report }: { report: ScheduledReport }) {
  if (!report.isActive) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Paused</span>;
  }
  if (report.lastRunStatus === 'failed') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Last run failed</span>;
  }
  if (report.lastRunStatus === 'success') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Active</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Active</span>;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scheduleLabel(report: ScheduledReport): string {
  if (report.frequency === 'daily') return `Daily at ${report.sendTime}`;
  if (report.frequency === 'weekly') {
    const day = DAYS_OF_WEEK[report.dayOfWeek ?? 1];
    return `Weekly — ${day} at ${report.sendTime}`;
  }
  if (report.frequency === 'monthly') {
    return `Monthly — day ${report.dayOfMonth ?? 1} at ${report.sendTime}`;
  }
  return report.frequency;
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export function ScheduledReports({ allUsers }: ScheduledReportsProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [form, setForm] = useState<ScheduledReportPayload>({ ...EMPTY_FORM, sections: { ...DEFAULT_SECTIONS }, filters: { ...DEFAULT_FILTERS } });
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Sending now
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Which accordion sections are expanded in the form
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    reportSections: true,
    filters: true,
    schedule: true,
    recipients: true,
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);
      const [rpt, br, rc] = await Promise.all([
        getScheduledReports(),
        getBranches(),
        getRepCodes(),
      ]);
      setReports(rpt.reports);
      setBranches(br.branches.filter((b) => b.isActive));
      setRepCodes(rc.repCodes.filter((r) => (r as any).isActive !== false));
    } catch (e: any) {
      setError(e?.message || 'Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  // ── Open modal ────────────────────────────────────────

  function openCreate() {
    setEditingReport(null);
    setForm({ ...EMPTY_FORM, sections: { ...DEFAULT_SECTIONS }, filters: { ...DEFAULT_FILTERS } });
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(r: ScheduledReport) {
    setEditingReport(r);
    // Resolve IDs from populated objects
    const recipientIds = r.recipients.map((u) =>
      typeof u === 'string' ? u : u._id,
    );
    const branchIds = r.filters.branches.map((b) =>
      typeof b === 'string' ? b : (b as any)._id,
    );
    const repIds = r.filters.assignedReps.map((rp) =>
      typeof rp === 'string' ? rp : (rp as any)._id,
    );

    setForm({
      name: r.name,
      description: r.description || '',
      sections: { ...DEFAULT_SECTIONS, ...r.sections },
      filters: {
        branches: branchIds,
        assignedReps: repIds,
        leadSources: r.filters.leadSources || [],
        statuses: r.filters.statuses || [],
        dateRangeType: r.filters.dateRangeType || 'yesterday',
      },
      frequency: r.frequency,
      dayOfWeek: r.dayOfWeek,
      dayOfMonth: r.dayOfMonth,
      sendTime: r.sendTime,
      recipients: recipientIds,
      isActive: r.isActive,
    });
    setFormError(null);
    setShowModal(true);
  }

  // ── Save ──────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Report name is required'); return; }
    if (!form.recipients.length) { setFormError('At least one recipient is required'); return; }
    if (form.frequency === 'weekly' && form.dayOfWeek === undefined) {
      setFormError('Please select a day of the week'); return;
    }
    if (form.frequency === 'monthly' && !form.dayOfMonth) {
      setFormError('Please select a day of the month'); return;
    }
    const anySectionSelected = Object.values(form.sections).some(Boolean);
    if (!anySectionSelected) { setFormError('At least one report section must be selected'); return; }

    setSaving(true);
    setFormError(null);
    try {
      if (editingReport) {
        const res = await updateScheduledReport(editingReport._id, form);
        setReports((prev) => prev.map((r) => r._id === editingReport._id ? res.report : r));
        flash('Report updated successfully');
      } else {
        const res = await createScheduledReport(form);
        setReports((prev) => [res.report, ...prev]);
        flash('Scheduled report created successfully');
      }
      setShowModal(false);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle ────────────────────────────────────────────

  async function handleToggle(id: string) {
    try {
      const res = await toggleScheduledReport(id);
      setReports((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, isActive: res.report.isActive ?? !r.isActive, nextRunAt: res.report.nextRunAt ?? r.nextRunAt } : r,
        ),
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to toggle report');
    }
  }

  // ── Delete ────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeletingId(id);
    try {
      await deleteScheduledReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
      setDeleteConfirm(null);
      flash('Report deleted');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Send Now ──────────────────────────────────────────

  async function handleSendNow(id: string) {
    setSendingId(id);
    try {
      const res = await sendScheduledReportNow(id);
      flash(res.message || 'Report queued for delivery');
    } catch (e: any) {
      setError(e?.message || 'Failed to trigger report');
    } finally {
      setSendingId(null);
    }
  }

  // ── Form field helpers ────────────────────────────────

  const toggleAccordion = (key: keyof typeof expandedSections) =>
    setExpandedSections((p) => ({ ...p, [key]: !p[key] }));

  const setSection = (key: keyof ScheduledReportSections, val: boolean) =>
    setForm((p) => ({ ...p, sections: { ...p.sections, [key]: val } }));

  const setFilter = <K extends keyof ScheduledReportFilters>(key: K, val: ScheduledReportFilters[K]) =>
    setForm((p) => ({ ...p, filters: { ...p.filters, [key]: val } }));

  // ── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ars-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Scheduled Reports</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure automated PDF reports emailed to selected users on a schedule.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-ars-primary text-white rounded-lg hover:bg-ars-primary-dark transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">{successMsg}</p>
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No scheduled reports yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a report to start sending automated PDFs to your team.</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-ars-primary text-white rounded-lg text-sm font-medium hover:bg-ars-primary-dark">
            Create First Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const recipientCount = report.recipients.length;
            const isDeleting = deletingId === report._id;
            const isSending = sendingId === report._id;
            const confirmingDelete = deleteConfirm === report._id;

            return (
              <div key={report._id} className={`bg-white border rounded-xl p-5 transition-all ${report.isActive ? 'border-gray-200' : 'border-gray-100 opacity-70'}`}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${report.isActive ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <FileText className={`w-5 h-5 ${report.isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{report.name}</h4>
                      <StatusBadge report={report} />
                    </div>
                    {report.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                      {/* Schedule */}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {scheduleLabel(report)}
                      </span>
                      {/* Date range */}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {DATE_RANGE_OPTIONS.find((d) => d.value === report.filters.dateRangeType)?.label ?? report.filters.dateRangeType}
                      </span>
                      {/* Recipients */}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5" />
                        {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Sections */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Object.entries(report.sections) as [keyof ScheduledReportSections, boolean][])
                        .filter(([, v]) => v)
                        .map(([k]) => (
                          <span key={k} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                            {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          </span>
                        ))}
                    </div>

                    {/* Last run info */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                      {report.lastRunAt && (
                        <span className="text-xs text-gray-400">
                          Last sent: {formatDateTime(report.lastRunAt)}
                          {report.lastRunStatus === 'failed' && (
                            <span className="text-red-500 ml-1">— Failed: {report.lastRunError}</span>
                          )}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Next run: {report.isActive ? formatDateTime(report.nextRunAt) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Send Now */}
                    <button
                      onClick={() => handleSendNow(report._id)}
                      disabled={isSending}
                      title="Send now"
                      className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(report)}
                      title="Edit"
                      className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(report._id)}
                      title={report.isActive ? 'Pause' : 'Activate'}
                      className="p-2 rounded-lg text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                    >
                      {report.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(report._id)}
                      disabled={isDeleting}
                      title={confirmingDelete ? 'Click again to confirm' : 'Delete'}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${confirmingDelete ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Modal ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {editingReport ? 'Edit Scheduled Report' : 'New Scheduled Report'}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Configure your automated PDF report</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* ── BASIC INFO ── */}
              <AccordionSection
                title="Basic Information"
                expanded={expandedSections.basic}
                onToggle={() => toggleAccordion('basic')}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Daily Sales Overview"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={form.isActive}
                      onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Active (will run on schedule)</label>
                  </div>
                </div>
              </AccordionSection>

              {/* ── REPORT SECTIONS ── */}
              <AccordionSection
                title="Report Sections"
                expanded={expandedSections.reportSections}
                onToggle={() => toggleAccordion('reportSections')}
                subtitle="Select which sections to include in the PDF"
              >
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'overview', label: 'Executive Overview', desc: 'KPI summary cards' },
                    { key: 'leadPerformance', label: 'Lead Performance', desc: 'Status breakdown & conversion' },
                    { key: 'repPerformance', label: 'Rep Performance', desc: 'Per-rep breakdown table' },
                    { key: 'sourceAnalysis', label: 'Source Analysis', desc: 'Lead source breakdown' },
                    { key: 'appointmentAnalytics', label: 'Appointment Analytics', desc: 'Show-rate & no-shows' },
                    { key: 'branchPerformance', label: 'Branch Performance', desc: 'Per-branch breakdown' },
                    { key: 'leadAging', label: 'Lead Aging', desc: 'Open lead age buckets' },
                    { key: 'lostReasons', label: 'Lost Reasons', desc: 'Top 10 lost reasons' },
                    { key: 'quotesPerDayPerAdmin', label: 'Quotes per Day per Admin', desc: 'Daily quote counts by admin code' },
                  ].map(({ key, label, desc }) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        form.sections[key as keyof ScheduledReportSections]
                          ? 'bg-blue-50 border-blue-300'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.sections[key as keyof ScheduledReportSections]}
                        onChange={(e) => setSection(key as keyof ScheduledReportSections, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{label}</div>
                        <div className="text-xs text-gray-500">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </AccordionSection>

              {/* ── DATA FILTERS ── */}
              <AccordionSection
                title="Data Filters"
                expanded={expandedSections.filters}
                onToggle={() => toggleAccordion('filters')}
                subtitle="Leave empty to include all data"
              >
                <div className="space-y-4">
                  {/* Date range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={form.filters.dateRangeType}
                      onChange={(e) => setFilter('dateRangeType', e.target.value as ScheduledReportDateRange)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {DATE_RANGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Branches */}
                  <MultiSelectPill
                    label="Branches (empty = all branches)"
                    options={branches.map((b) => ({ _id: b._id, name: b.name }))}
                    selected={form.filters.branches}
                    onChange={(v) => setFilter('branches', v)}
                  />

                  {/* Reps */}
                  <MultiSelectPill
                    label="Sales Reps (empty = all reps)"
                    options={repCodes.map((r) => ({
                      _id: r._id,
                      name: `${r.code}${r.description ? ` – ${r.description}` : ''}`,
                    }))}
                    selected={form.filters.assignedReps}
                    onChange={(v) => setFilter('assignedReps', v)}
                  />

                  {/* Lead Sources */}
                  <StringMultiSelect
                    label="Lead Sources (empty = all sources)"
                    options={LEAD_SOURCES}
                    selected={form.filters.leadSources}
                    onChange={(v) => setFilter('leadSources', v)}
                  />

                  {/* Statuses */}
                  <MultiSelectPill
                    label="Lead Statuses (empty = all statuses)"
                    options={LEAD_STATUSES.map((s) => ({ _id: s.value, name: s.label }))}
                    selected={form.filters.statuses}
                    onChange={(v) => setFilter('statuses', v)}
                  />
                </div>
              </AccordionSection>

              {/* ── SCHEDULE ── */}
              <AccordionSection
                title="Schedule"
                expanded={expandedSections.schedule}
                onToggle={() => toggleAccordion('schedule')}
                subtitle="When should this report be sent?"
              >
                <div className="space-y-3">
                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <div className="flex gap-2">
                      {(['daily', 'weekly', 'monthly'] as ScheduledReportFrequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, frequency: f }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                            form.frequency === f
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day of week (weekly only) */}
                  {form.frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                      <select
                        value={form.dayOfWeek ?? 1}
                        onChange={(e) => setForm((p) => ({ ...p, dayOfWeek: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {DAYS_OF_WEEK.map((day, i) => (
                          <option key={i} value={i}>{day}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Day of month (monthly only) */}
                  {form.frequency === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                      <select
                        value={form.dayOfMonth ?? 1}
                        onChange={(e) => setForm((p) => ({ ...p, dayOfMonth: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Max 28 to ensure it runs every month.</p>
                    </div>
                  )}

                  {/* Send time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Send Time (SAST — South Africa Standard Time)
                    </label>
                    <input
                      type="time"
                      value={form.sendTime}
                      onChange={(e) => setForm((p) => ({ ...p, sendTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <p className="text-xs text-gray-400 mt-1">Report will be generated and emailed at this time (Africa/Johannesburg, UTC+2).</p>
                  </div>
                </div>
              </AccordionSection>

              {/* ── RECIPIENTS ── */}
              <AccordionSection
                title="Recipients"
                expanded={expandedSections.recipients}
                onToggle={() => toggleAccordion('recipients')}
                subtitle="Who should receive this report by email?"
              >
                <div className="space-y-2">
                  {/* Select all / deselect all */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, recipients: allUsers.map((u) => u._id) }))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, recipients: [] }))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Deselect all
                    </button>
                    <span className="text-xs text-gray-500 ml-auto">{form.recipients.length} selected</span>
                  </div>

                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                    {allUsers.map((user) => {
                      const checked = form.recipients.includes(user._id);
                      return (
                        <label
                          key={user._id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors ${checked ? 'bg-blue-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setForm((p) => ({
                                ...p,
                                recipients: checked
                                  ? p.recipients.filter((id) => id !== user._id)
                                  : [...p.recipients, user._id],
                              }));
                            }}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{user.email}</div>
                          </div>
                        </label>
                      );
                    })}
                    {allUsers.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-400">No users available</div>
                    )}
                  </div>
                </div>
              </AccordionSection>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setPreviewing(true);
                  try {
                    const html = await previewScheduledReport(form);
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                  } catch (err: any) {
                    alert(`Preview failed: ${err.message}`);
                  } finally {
                    setPreviewing(false);
                  }
                }}
                disabled={previewing || saving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {previewing ? 'Generating...' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-ars-primary text-white rounded-lg text-sm font-medium hover:bg-ars-primary-dark transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : editingReport ? 'Save Changes' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Accordion section helper
// ─────────────────────────────────────────────────────────────────

function AccordionSection({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          {subtitle && <span className="text-xs text-gray-500 ml-2">{subtitle}</span>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}
