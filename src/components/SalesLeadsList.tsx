import { useState, useEffect } from 'react';
import { Plus, Search, Filter, X, Phone, Mail, Building2, User, Calendar, TrendingUp, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSalesLeads, type SalesLead, type SalesLeadStatus, type Branch, type RepCode } from '../lib/api';

interface SalesLeadsListProps {
  onCreateLead: () => void;
  onSelectLead: (lead: SalesLead) => void;
  branches: Branch[];
  repCodes: RepCode[];
  refreshKey: number;
}

const STATUS_COLUMNS: { status: SalesLeadStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-blue-50 border-blue-200' },
  { status: 'assigned', label: 'Assigned', color: 'bg-purple-50 border-purple-200' },
  { status: 'contacted', label: 'Contacted', color: 'bg-cyan-50 border-cyan-200' },
  { status: 'appointment_set', label: 'Appointment Set', color: 'bg-orange-50 border-orange-200' },
  { status: 'appointment_attended', label: 'Attended', color: 'bg-yellow-50 border-yellow-200' },
  { status: 'rfc_requested', label: 'RFC Requested', color: 'bg-green-50 border-green-200' },
  { status: 'converted', label: 'Converted', color: 'bg-emerald-50 border-emerald-200' },
  { status: 'lost', label: 'Lost', color: 'bg-gray-50 border-gray-200' },
];

export function SalesLeadsList({ onCreateLead, onSelectLead, branches, repCodes, refreshKey }: SalesLeadsListProps) {
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    branch: '',
    assignedRep: '',
    leadSource: '',
    priority: '',
  });

  useEffect(() => {
    loadLeads();
  }, [refreshKey, filters]);

  async function loadLeads() {
    try {
      setLoading(true);
      setError(null);
      const response = await getSalesLeads({
        ...filters,
        search: searchTerm,
        limit: 500, // Load more for Kanban view
      });
      setLeads(response.leads);
    } catch (err: any) {
      console.error('Error loading sales leads:', err);
      setError(err.message || 'Failed to load sales leads');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    loadLeads();
  }

  function clearFilters() {
    setFilters({
      branch: '',
      assignedRep: '',
      leadSource: '',
      priority: '',
    });
    setSearchTerm('');
  }

  function getLeadsByStatus(status: SalesLeadStatus): SalesLead[] {
    return leads.filter((lead) => lead.status === status);
  }

  function getBranchName(branchId: string | { _id: string; name: string; code: string }): string {
    if (typeof branchId === 'object') return branchId.name;
    const branch = branches.find((b) => b._id === branchId);
    return branch?.name || 'Unknown';
  }

  function getRepName(repId: string | { _id: string; code: string; name?: string } | undefined): string {
    if (!repId) return 'Unassigned';
    if (typeof repId === 'object') return repId.name || repId.code;
    const rep = repCodes.find((r) => r._id === repId);
    return rep?.description || rep?.code || 'Unknown';
  }

  function formatCurrency(value?: number): string {
    if (!value) return '-';
    return `R${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const canCreate = hasPermission('sales_leads.create');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-ars-primary" />
              Sales Leads
            </h2>
            <p className="text-sm text-ars-body mt-1">
              Manage sales leads and track appointments
            </p>
          </div>
          {canCreate && (
            <button
              onClick={onCreateLead}
              className="bg-ars-secondary text-ars-heading px-6 py-3 rounded-lg font-bold text-sm shadow hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              NEW LEAD
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company, contact, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-ars-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-ars-primary/90 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showFilters ? 'bg-ars-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    value={filters.branch}
                    onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Rep</label>
                  <select
                    value={filters.assignedRep}
                    onChange={(e) => setFilters({ ...filters, assignedRep: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                  <select
                    value={filters.leadSource}
                    onChange={(e) => setFilters({ ...filters, leadSource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
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
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_COLUMNS.slice(0, 4).map((col) => {
          const count = getLeadsByStatus(col.status).length;
          return (
            <div key={col.status} className={`rounded-lg border-2 p-4 ${col.color}`}>
              <p className="text-sm font-medium text-gray-600">{col.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
            <p className="text-ars-body">Loading sales leads...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error: {error}</p>
          <button
            onClick={loadLeads}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Kanban Board */}
      {!loading && !error && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUS_COLUMNS.map((column) => {
              const columnLeads = getLeadsByStatus(column.status);
              return (
                <div key={column.status} className="w-80 flex-shrink-0">
                  <div className={`rounded-lg border-2 p-3 mb-3 ${column.color}`}>
                    <h3 className="font-bold text-gray-900 flex items-center justify-between">
                      <span>{column.label}</span>
                      <span className="text-sm bg-white px-2 py-1 rounded-full">{columnLeads.length}</span>
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {columnLeads.map((lead) => (
                      <div
                        key={lead._id}
                        onClick={() => onSelectLead(lead)}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{lead.companyName}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{lead.leadNumber}</p>
                          </div>
                          {lead.priority && lead.priority !== 'medium' && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                lead.priority === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {lead.priority}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{lead.contactPerson}</span>
                          </div>
                          {lead.contactPhone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{lead.contactPhone}</span>
                            </div>
                          )}
                          {lead.contactEmail && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{lead.contactEmail}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="truncate">{getBranchName(lead.branch)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate">{getRepName(lead.assignedRep)}</span>
                          </div>
                        </div>

                        {lead.estimatedValue && (
                          <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            {formatCurrency(lead.estimatedValue)}
                          </div>
                        )}

                        {lead.appointmentCount && lead.appointmentCount > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                            <Calendar className="w-3.5 h-3.5" />
                            {lead.appointmentCount} appointment{lead.appointmentCount > 1 ? 's' : ''}
                          </div>
                        )}

                        {lead.convertedJobNumber && (
                          <div className="mt-2 text-xs text-emerald-600 font-medium">
                            → Job: {lead.convertedJobNumber}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400">
                          Created {formatDate(lead.createdAt)}
                        </div>
                      </div>
                    ))}
                    {columnLeads.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No leads in this status
                      </div>
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
