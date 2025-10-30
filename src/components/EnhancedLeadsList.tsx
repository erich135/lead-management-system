import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, Profile, Branch } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StatusWorkflow } from './StatusWorkflow';
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  X
} from 'lucide-react';

interface LeadsListProps {
  statuses: LeadStatus[];
  users: Profile[];
  branches: Branch[];
  onLeadClick: (lead: Lead) => void;
  onCreateLead: () => void;
}

interface FilterState {
  search: string;
  status: string;
  branch: string;
  assignee: string;
  overdue: boolean;
  dateRange: 'all' | '7days' | '30days' | '90days';
}

export function LeadsList({ 
  statuses, 
  users, 
  branches, 
  onLeadClick, 
  onCreateLead 
}: LeadsListProps) {
  const { profile, isAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showStatusWorkflow, setShowStatusWorkflow] = useState(false);
  const [sortField, setSortField] = useState<keyof Lead>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    branch: 'all',
    assignee: 'all',
    overdue: false,
    dateRange: 'all'
  });

  useEffect(() => {
    loadLeads();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('leads')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' }, 
        () => loadLeads()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, filters, sortField, sortDirection]);

  async function loadLeads() {
    try {
      const { data } = await supabase
        .from('leads')
        .select(`
          *,
          branch:branches(*),
          current_status:lead_statuses(*),
          assigned_user:profiles!leads_assigned_to_fkey(*),
          created_by_user:profiles!leads_created_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (data) setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...leads];

    // Text search
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.lead_number.toLowerCase().includes(searchTerm) ||
        lead.client_name.toLowerCase().includes(searchTerm) ||
        lead.contact_person?.toLowerCase().includes(searchTerm) ||
        lead.contact_email?.toLowerCase().includes(searchTerm) ||
        lead.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(lead => 
          lead.current_status?.name !== 'Paid' && 
          lead.current_status?.name !== 'Lost'
        );
      } else {
        filtered = filtered.filter(lead => lead.current_status_id === filters.status);
      }
    }

    // Branch filter
    if (filters.branch !== 'all') {
      filtered = filtered.filter(lead => lead.branch_id === filters.branch);
    }

    // Assignee filter
    if (filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned') {
        filtered = filtered.filter(lead => !lead.assigned_to);
      } else if (filters.assignee === 'me' && profile) {
        filtered = filtered.filter(lead => lead.assigned_to === profile.id);
      } else {
        filtered = filtered.filter(lead => lead.assigned_to === filters.assignee);
      }
    }

    // Overdue filter
    if (filters.overdue) {
      // This would require checking against the lead_status_history for alert_date
      // For now, we'll filter leads that have been in current status for too long
      const now = new Date();
      filtered = filtered.filter(lead => {
        if (!lead.current_status?.days_until_alert) return false;
        const updatedAt = new Date(lead.updated_at);
        const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > lead.current_status.days_until_alert;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const days = filters.dateRange === '7days' ? 7 : 
                   filters.dateRange === '30days' ? 30 : 90;
      const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(lead => 
        new Date(lead.created_at) >= cutoff
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredLeads(filtered);
  }

  function handleSort(field: keyof Lead) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function clearFilters() {
    setFilters({
      search: '',
      status: 'all',
      branch: 'all',
      assignee: 'all',
      overdue: false,
      dateRange: 'all'
    });
  }

  async function handleStatusChange(leadId: string, newStatusId: string, referenceNumber?: string) {
    try {
      const updateData: any = {
        current_status_id: newStatusId,
        updated_at: new Date().toISOString()
      };

      // Add reference numbers if provided
      if (referenceNumber) {
        const status = statuses.find(s => s.id === newStatusId);
        if (status?.name === 'Quoted') updateData.quote_number = referenceNumber;
        if (status?.name === 'Order Received') updateData.order_number = referenceNumber;
        if (status?.name === 'Invoiced') updateData.invoice_number = referenceNumber;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;

      // The database trigger will handle creating the status history entry
      await loadLeads();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update status');
    }
  }

  async function handleDeleteLead(leadId: string) {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      await loadLeads();
    } catch (error: any) {
      alert(error.message || 'Failed to delete lead');
    }
  }

  function getStatusIndicator(lead: Lead) {
    if (!lead.current_status) return null;

    const now = new Date();
    const updatedAt = new Date(lead.updated_at);
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    const isOverdue = lead.current_status.days_until_alert && 
                     daysSinceUpdate > lead.current_status.days_until_alert;

    if (isOverdue) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }

    if (lead.current_status.name === 'Paid') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    if (lead.current_status.name === 'Lost') {
      return <X className="w-4 h-4 text-gray-500" />;
    }

    return <Clock className="w-4 h-4 text-blue-500" />;
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value.length > 0;
    if (key === 'overdue') return value;
    return value !== 'all';
  }).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-600">
            {filteredLeads.length} of {leads.length} leads
            {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'} applied)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={onCreateLead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                value={filters.branch}
                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={filters.assignee}
                onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Everyone</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterState['dateRange'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>

            {/* Overdue */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.overdue}
                  onChange={(e) => setFilters(prev => ({ ...prev, overdue: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Show overdue only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('lead_number')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Lead Number
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('client_name')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Client
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('estimated_value')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Value
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Created
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No leads found</p>
                    <p className="text-sm">
                      {activeFiltersCount > 0 
                        ? 'Try adjusting your filters or create a new lead.' 
                        : 'Get started by creating your first lead.'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onLeadClick(lead)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIndicator(lead)}
                        <span className="text-sm font-medium text-gray-900">
                          {lead.lead_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{lead.client_name}</div>
                      {lead.contact_person && (
                        <div className="text-xs text-gray-500">{lead.contact_person}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.current_status?.name === 'Paid' ? 'bg-green-100 text-green-800' :
                        lead.current_status?.name === 'Lost' ? 'bg-gray-100 text-gray-800' :
                        lead.current_status?.name === 'New Lead' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lead.current_status?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {lead.branch?.name || 'No branch'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {lead.assigned_user?.full_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {lead.estimated_value 
                          ? `$${lead.estimated_value.toLocaleString()}` 
                          : 'Not specified'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeadClick(lead);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setShowStatusWorkflow(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Update status"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Workflow Modal */}
      {showStatusWorkflow && selectedLead && (
        <StatusWorkflow
          lead={selectedLead}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          onClose={() => {
            setShowStatusWorkflow(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}