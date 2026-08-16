import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  X,
  Phone,
  Mail,
  Building2,
  User,
  Calendar,
  TrendingUp,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { getSalesLeads, type SalesLead, type SalesLeadStatus, type Branch, type RepCode } from '../lib/api';

interface SalesLeadsListProps {
  onCreateLead: () => void;
  onSelectLead: (lead: SalesLead) => void;
  branches: Branch[];
  repCodes: RepCode[];
  refreshKey: number;
}

const STATUS_COLUMNS: { status: SalesLeadStatus; label: string; shortLabel: string; color: string; chip: string }[] = [
  { status: 'new', label: 'New', shortLabel: 'New', color: 'bg-blue-50 border-blue-200', chip: 'bg-blue-100 text-blue-800' },
  {
    status: 'assigned',
    label: 'Assigned',
    shortLabel: 'Assigned',
    color: 'bg-purple-50 border-purple-200',
    chip: 'bg-purple-100 text-purple-800',
  },
  {
    status: 'contacted',
    label: 'Contacted',
    shortLabel: 'Contacted',
    color: 'bg-cyan-50 border-cyan-200',
    chip: 'bg-cyan-100 text-cyan-800',
  },
  {
    status: 'appointment_set',
    label: 'Appointment Set',
    shortLabel: 'Appt Set',
    color: 'bg-orange-50 border-orange-200',
    chip: 'bg-orange-100 text-orange-800',
  },
  {
    status: 'appointment_attended',
    label: 'Attended',
    shortLabel: 'Attended',
    color: 'bg-yellow-50 border-yellow-200',
    chip: 'bg-yellow-100 text-yellow-800',
  },
  {
    status: 'rfc_requested',
    label: 'RFC Requested',
    shortLabel: 'RFC',
    color: 'bg-green-50 border-green-200',
    chip: 'bg-green-100 text-green-800',
  },
  {
    status: 'converted',
    label: 'Converted',
    shortLabel: 'Converted',
    color: 'bg-emerald-50 border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-800',
  },
  {
    status: 'lost',
    label: 'Lost',
    shortLabel: 'Lost',
    color: 'bg-gray-50 border-gray-200',
    chip: 'bg-gray-100 text-gray-700',
  },
];

/**
 * Resolves a branch display name from an id or populated object.
 */
function getBranchName(
  branchId: string | { _id: string; name: string; code: string },
  branches: Branch[],
): string {
  if (typeof branchId === 'object') return branchId.name;
  const branch = branches.find((b) => b._id === branchId);
  return branch?.name || 'Unknown';
}

/**
 * Resolves a rep display name from an id or populated object.
 */
function getRepName(
  repId: string | { _id: string; code: string; name?: string } | undefined,
  repCodes: RepCode[],
): string {
  if (!repId) return 'Unassigned';
  if (typeof repId === 'object') return repId.name || repId.code;
  const rep = repCodes.find((r) => r._id === repId);
  return rep?.description || rep?.code || 'Unknown';
}

/**
 * Formats an estimated lead value for display.
 */
function formatCurrency(value?: number): string {
  if (!value) return '-';
  return `R${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats an appointment date for list cards.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface MobileLeadCardProps {
  lead: SalesLead;
  expanded: boolean;
  branches: Branch[];
  repCodes: RepCode[];
  onToggleExpand: () => void;
  onOpen: () => void;
}

/**
 * Compact mobile lead row — summary always visible, details expand on demand.
 */
function MobileLeadCard({
  lead,
  expanded,
  branches,
  repCodes,
  onToggleExpand,
  onOpen,
}: MobileLeadCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 px-3.5 py-3 text-left active:bg-slate-50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-[15px] font-bold leading-tight text-slate-900">
                {lead.companyName}
              </h4>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">{lead.leadNumber}</p>
            </div>
            {lead.priority && lead.priority !== 'medium' && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  lead.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {lead.priority}
              </span>
            )}
          </div>

          <p className="mt-1.5 truncate text-sm text-slate-600">
            {[lead.contactPerson, lead.contactPhone].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {getBranchName(lead.branch, branches)}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {getRepName(lead.assignedRep, repCodes)}
            </span>
          </p>
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex w-11 shrink-0 items-center justify-center border-l border-slate-100 text-slate-400 active:bg-slate-50"
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide lead details' : 'Show lead details'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-slate-100 px-3.5 py-3 text-sm text-slate-600">
          {lead.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{lead.contactEmail}</span>
            </div>
          )}
          {lead.contactPhone && (
            <a
              href={`tel:${lead.contactPhone}`}
              className="flex items-center gap-2 text-[#0969a9]"
              onClick={(event) => event.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{lead.contactPhone}</span>
            </a>
          )}
          {lead.estimatedValue ? (
            <div className="flex items-center gap-2 font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(lead.estimatedValue)}
            </div>
          ) : null}
          {lead.nextAppointmentDate ? (
            <div className="flex items-center gap-2 text-orange-600">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(lead.nextAppointmentDate)}
              {lead.nextAppointmentTime ? ` at ${lead.nextAppointmentTime}` : ''}
            </div>
          ) : lead.appointmentCount && lead.appointmentCount > 0 ? (
            <div className="flex items-center gap-2 text-[#0969a9]">
              <Calendar className="h-3.5 w-3.5" />
              {lead.appointmentCount} appointment{lead.appointmentCount > 1 ? 's' : ''}
            </div>
          ) : null}
          {lead.convertedJobNumber && (
            <p className="text-xs font-semibold text-emerald-600">→ Job: {lead.convertedJobNumber}</p>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="mt-1 w-full rounded-lg bg-[#0969a9] px-3 py-2.5 text-sm font-semibold text-white"
          >
            Open lead
          </button>
        </div>
      )}
    </article>
  );
}

/**
 * Sales leads list — desktop Kanban board; compact filterable list on mobile.
 */
export function SalesLeadsList({
  onCreateLead,
  onSelectLead,
  branches,
  repCodes,
  refreshKey,
}: SalesLeadsListProps) {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<SalesLeadStatus | 'all'>('all');
  const [expandedLeadIds, setExpandedLeadIds] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    branch: '',
    assignedRep: '',
    leadSource: '',
    priority: '',
  });

  useEffect(() => {
    void loadLeads();
  }, [refreshKey, filters]);

  /**
   * Loads sales leads for the current filters and search term.
   */
  async function loadLeads() {
    try {
      setLoading(true);
      setError(null);
      const response = await getSalesLeads({
        ...filters,
        search: searchTerm,
        limit: 500,
      });
      setLeads(response.leads);
    } catch (err: any) {
      console.error('Error loading sales leads:', err);
      setError(err.message || 'Failed to load sales leads');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Runs search using the current search box value.
   */
  function handleSearch() {
    void loadLeads();
  }

  /**
   * Clears all list filters and reloads.
   */
  function clearFilters() {
    setFilters({
      branch: '',
      assignedRep: '',
      leadSource: '',
      priority: '',
    });
    setSearchTerm('');
  }

  /**
   * Returns leads for one Kanban / filter status.
   */
  function getLeadsByStatus(status: SalesLeadStatus): SalesLead[] {
    return leads.filter((lead) => lead.status === status);
  }

  /**
   * Toggles the expanded detail panel for a mobile lead card.
   */
  function toggleLeadExpanded(leadId: string) {
    setExpandedLeadIds((current) => ({
      ...current,
      [leadId]: !current[leadId],
    }));
  }

  const mobileLeads = useMemo(() => {
    if (mobileStatus === 'all') return leads;
    return leads.filter((lead) => lead.status === mobileStatus);
  }, [leads, mobileStatus]);

  const canCreate = hasPermission('sales_leads.create');

  return (
    <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
      {/* Header / search */}
      <div className={`bg-white shadow-sm ${isMobile ? 'rounded-xl p-3' : 'rounded-lg p-6'}`}>
        {!isMobile && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-ars-heading">
                <Briefcase className="h-7 w-7 text-ars-primary" />
                Sales Leads
              </h2>
              <p className="mt-1 text-sm text-ars-body">Manage sales leads and track appointments</p>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={onCreateLead}
                className="flex items-center gap-2 rounded-lg bg-ars-secondary px-6 py-3 text-sm font-bold text-ars-heading shadow transition-all hover:scale-105 hover:shadow-lg"
              >
                <Plus className="h-5 w-5" />
                NEW LEAD
              </button>
            )}
          </div>
        )}

        <div className={isMobile ? 'space-y-2' : 'mt-4 space-y-3'}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder={isMobile ? 'Search leads…' : 'Search by company, contact, phone, or email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={`w-full rounded-lg border border-gray-300 pl-9 pr-3 focus:border-transparent focus:ring-2 focus:ring-ars-primary sm:pl-10 ${
                  isMobile ? 'py-2.5 text-sm' : 'py-2'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className={`rounded-lg bg-ars-primary font-medium text-white transition-colors hover:bg-ars-primary/90 ${
                isMobile ? 'px-3.5 py-2.5 text-sm' : 'px-6 py-2'
              }`}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg font-medium transition-colors ${
                showFilters ? 'bg-ars-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'px-3 py-2.5' : 'px-4 py-2'}`}
              aria-label="Filters"
            >
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              {!isMobile && 'Filters'}
            </button>
            {isMobile && canCreate && (
              <button
                type="button"
                onClick={onCreateLead}
                className="inline-flex items-center justify-center rounded-lg bg-ars-secondary px-3 py-2.5 text-ars-heading"
                aria-label="New lead"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Branch</label>
                  <select
                    value={filters.branch}
                    onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-ars-primary"
                  >
                    <option value="">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Assigned Rep</label>
                  <select
                    value={filters.assignedRep}
                    onChange={(e) => setFilters({ ...filters, assignedRep: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-ars-primary"
                  >
                    <option value="">All Reps</option>
                    {repCodes.map((rep) => (
                      <option key={rep._id} value={rep._id}>
                        {rep.description || rep.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Lead Source</label>
                  <select
                    value={filters.leadSource}
                    onChange={(e) => setFilters({ ...filters, leadSource: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-ars-primary"
                  >
                    <option value="">All Sources</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Website">Website</option>
                    <option value="Trade Show">Trade Show</option>
                    <option value="Email Campaign">Email Campaign</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Partner">Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-ars-primary"
                  >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats — compact on mobile */}
      <div className={`grid grid-cols-4 ${isMobile ? 'gap-1.5' : 'gap-4 md:grid-cols-4'}`}>
        {STATUS_COLUMNS.slice(0, 4).map((col) => {
          const count = getLeadsByStatus(col.status).length;
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => {
                if (isMobile) {
                  setMobileStatus((current) => (current === col.status ? 'all' : col.status));
                }
              }}
              className={`rounded-lg border-2 text-left ${col.color} ${
                isMobile ? 'p-2' : 'p-4'
              } ${
                isMobile && mobileStatus === col.status
                  ? 'ring-2 ring-[#0969a9] ring-offset-1'
                  : ''
              }`}
            >
              <p className={`font-medium text-gray-600 ${isMobile ? 'text-[10px] leading-tight' : 'text-sm'}`}>
                {isMobile ? (col.status === 'appointment_set' ? 'Appt' : col.shortLabel) : col.label}
              </p>
              <p className={`font-bold text-gray-900 ${isMobile ? 'mt-0.5 text-lg' : 'mt-1 text-2xl'}`}>
                {count}
              </p>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-ars-primary" />
            <p className="text-ars-body">Loading sales leads...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">Error: {error}</p>
          <button
            type="button"
            onClick={() => void loadLeads()}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Mobile: status chips + compact expandable list */}
      {!loading && !error && isMobile && (
        <div className="space-y-3">
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setMobileStatus('all')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                mobileStatus === 'all'
                  ? 'bg-[#0969a9] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              All · {leads.length}
            </button>
            {STATUS_COLUMNS.map((column) => {
              const count = getLeadsByStatus(column.status).length;
              const active = mobileStatus === column.status;
              return (
                <button
                  key={column.status}
                  type="button"
                  onClick={() => setMobileStatus(column.status)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    active ? 'bg-[#0969a9] text-white' : column.chip
                  }`}
                >
                  {column.shortLabel} · {count}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {mobileLeads.map((lead) => (
              <MobileLeadCard
                key={lead._id}
                lead={lead}
                expanded={Boolean(expandedLeadIds[lead._id])}
                branches={branches}
                repCodes={repCodes}
                onToggleExpand={() => toggleLeadExpanded(lead._id)}
                onOpen={() => onSelectLead(lead)}
              />
            ))}
            {mobileLeads.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No leads in this status
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Kanban */}
      {!loading && !error && !isMobile && (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {STATUS_COLUMNS.map((column) => {
              const columnLeads = getLeadsByStatus(column.status);
              return (
                <div key={column.status} className="w-80 flex-shrink-0">
                  <div className={`mb-3 rounded-lg border-2 p-3 ${column.color}`}>
                    <h3 className="flex items-center justify-between font-bold text-gray-900">
                      <span>{column.label}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-sm">{columnLeads.length}</span>
                    </h3>
                  </div>
                  <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                    {columnLeads.map((lead) => (
                      <div
                        key={lead._id}
                        onClick={() => onSelectLead(lead)}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-lg"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-bold text-gray-900">{lead.companyName}</h4>
                            <p className="mt-0.5 text-xs text-gray-500">{lead.leadNumber}</p>
                          </div>
                          {lead.priority && lead.priority !== 'medium' && (
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                lead.priority === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {lead.priority}
                            </span>
                          )}
                        </div>

                        <div className="mb-3 space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{lead.contactPerson}</span>
                          </div>
                          {lead.contactPhone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{lead.contactPhone}</span>
                            </div>
                          )}
                          {lead.contactEmail && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{lead.contactEmail}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate">{getBranchName(lead.branch, branches)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{getRepName(lead.assignedRep, repCodes)}</span>
                          </div>
                        </div>

                        {lead.estimatedValue && (
                          <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            {formatCurrency(lead.estimatedValue)}
                          </div>
                        )}

                        {lead.nextAppointmentDate ? (
                          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-orange-600">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(lead.nextAppointmentDate)}
                            {lead.nextAppointmentTime ? ` at ${lead.nextAppointmentTime}` : ''}
                          </div>
                        ) : lead.appointmentCount && lead.appointmentCount > 0 ? (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                            <Calendar className="h-3.5 w-3.5" />
                            {lead.appointmentCount} appointment
                            {lead.appointmentCount > 1 ? 's' : ''}
                          </div>
                        ) : null}

                        {lead.convertedJobNumber && (
                          <div className="mt-2 text-xs font-medium text-emerald-600">
                            → Job: {lead.convertedJobNumber}
                          </div>
                        )}
                      </div>
                    ))}
                    {columnLeads.length === 0 && (
                      <div className="py-8 text-center text-sm text-gray-400">No leads in this status</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
