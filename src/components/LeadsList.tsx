import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, Profile, Branch } from '../types';
import { Search, Filter, Plus, AlertCircle, Calendar } from 'lucide-react';

interface LeadsListProps {
  onLeadClick: (lead: Lead) => void;
  onCreateNew: () => void;
  statuses: LeadStatus[];
  users: Profile[];
  branches: Branch[];
}

export function LeadsList({ onLeadClick, onCreateNew, statuses, users, branches }: LeadsListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [assignedRepFilter, setAssignedRepFilter] = useState<string>('all');
  const [assignedAdminFilter, setAssignedAdminFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, searchTerm, statusFilter, branchFilter, assignedRepFilter, assignedAdminFilter]);

  async function loadLeads() {
    try {
      // Demo data for demonstration
      const demoLeads: Lead[] = [
        {
          id: '1',
          lead_number: 'LEAD-20251030-0001',
          job_number: 'J2025001',
          client_name: 'Acme Manufacturing Ltd',
          contact_person: 'John Smith',
          contact_email: 'john@acme.com',
          contact_phone: '+27 11 234 5678',
          description: 'Conveyor belt automation system',
          branch_id: 'branch-1',
          current_status_id: 'status-1',
          assigned_rep: 'user-1',
          assigned_admin: 'user-2',
          created_by: 'demo-user-1',
          quote_number: 'Q-2025-0045',
          order_number: null,
          invoice_number: null,
          estimated_value: 125000,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          current_status: { id: 'status-1', name: 'Quoted', sort_order: 2, requires_attachment: true, requires_reference_number: true, days_until_alert: 2, created_at: new Date().toISOString() }
        },
        {
          id: '2',
          lead_number: 'LEAD-20251029-0012',
          job_number: null,
          client_name: 'Tech Solutions SA',
          contact_person: 'Sarah Johnson',
          contact_email: 'sarah@techsolutions.co.za',
          contact_phone: '+27 21 987 6543',
          description: 'Industrial PLC upgrade project',
          branch_id: 'branch-1',
          current_status_id: 'status-2',
          assigned_rep: 'user-2',
          assigned_admin: 'user-1',
          created_by: 'demo-user-1',
          quote_number: null,
          order_number: null,
          invoice_number: null,
          estimated_value: 87500,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          current_status: { id: 'status-2', name: 'In Progress', sort_order: 1, requires_attachment: false, requires_reference_number: false, days_until_alert: 3, created_at: new Date().toISOString() }
        },
        {
          id: '3',
          lead_number: 'LEAD-20251020-0005',
          job_number: 'D2025003',
          client_name: 'MegaCorp Industries',
          contact_person: 'Michael Brown',
          contact_email: 'mbrown@megacorp.com',
          contact_phone: '+27 12 456 7890',
          description: 'SCADA system implementation',
          branch_id: 'branch-2',
          current_status_id: 'status-3',
          assigned_rep: 'user-1',
          assigned_admin: 'user-2',
          created_by: 'demo-user-1',
          quote_number: 'Q-2025-0038',
          order_number: 'PO-2025-123',
          invoice_number: null,
          estimated_value: 245000,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          current_status: { id: 'status-3', name: 'Await PO', sort_order: 4, requires_attachment: false, requires_reference_number: false, days_until_alert: 5, created_at: new Date().toISOString() }
        },
        {
          id: '4',
          lead_number: 'LEAD-20251015-0018',
          job_number: 'C2025005',
          client_name: 'Cape Engineering Works',
          contact_person: 'Lisa Van Der Merwe',
          contact_email: 'lisa@capeeng.co.za',
          contact_phone: '+27 21 555 1234',
          description: 'Motor control panel replacement',
          branch_id: 'branch-3',
          current_status_id: 'status-4',
          assigned_rep: 'user-3',
          assigned_admin: 'user-1',
          created_by: 'demo-user-1',
          quote_number: 'Q-2025-0051',
          order_number: 'PO-2025-145',
          invoice_number: 'INV-2025-089',
          estimated_value: 56000,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          current_status: { id: 'status-4', name: 'Invoiced', sort_order: 8, requires_attachment: true, requires_reference_number: true, days_until_alert: null, created_at: new Date().toISOString() }
        },
        {
          id: '5',
          lead_number: 'LEAD-20251028-0021',
          job_number: null,
          client_name: 'AutoParts Direct',
          contact_person: 'David Wilson',
          contact_email: 'david@autoparts.co.za',
          contact_phone: '+27 11 789 4561',
          description: 'Warehouse automation sensors',
          branch_id: 'branch-1',
          current_status_id: 'status-5',
          assigned_rep: 'user-2',
          assigned_admin: 'user-1',
          created_by: 'demo-user-1',
          quote_number: null,
          order_number: null,
          invoice_number: null,
          estimated_value: 34500,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          current_status: { id: 'status-5', name: 'Sent to Client', sort_order: 3, requires_attachment: false, requires_reference_number: false, days_until_alert: 3, created_at: new Date().toISOString() }
        }
      ];
      setLeads(demoLeads);

      const { data } = await supabase
        .from('leads')
        .select(`
          *,
          branch:branches(*),
          current_status:lead_statuses(*),
          assigned_rep_user:profiles!leads_assigned_rep_fkey(*),
          assigned_admin_user:profiles!leads_assigned_admin_fkey(*),
          created_by_user:profiles!leads_created_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...leads];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.lead_number.toLowerCase().includes(search) ||
          lead.client_name.toLowerCase().includes(search) ||
          (lead.cash_customer_name?.toLowerCase().includes(search) ?? false) ||
          lead.contact_person?.toLowerCase().includes(search) ||
          lead.contact_email?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.current_status_id === statusFilter);
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.branch_id === branchFilter);
    }

    if (assignedRepFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.assigned_rep === assignedRepFilter);
    }

    if (assignedAdminFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.assigned_admin === assignedAdminFilter);
    }

    setFilteredLeads(filtered);
  }

  function getStatusColor(statusName: string) {
    const colors: Record<string, string> = {
      'New Lead': 'bg-sky-100 text-sky-800',
      'Quoted': 'bg-amber-100 text-amber-800',
      'Order Received': 'bg-green-100 text-green-800',
      'Job Scheduled': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Awaiting Materials': 'bg-orange-100 text-orange-800',
      'Ready for Installation': 'bg-teal-100 text-teal-800',
      'Installed': 'bg-green-100 text-green-800',
      'Invoiced': 'bg-emerald-100 text-emerald-800',
      'Paid': 'bg-green-100 text-green-800',
      'On Hold': 'bg-slate-100 text-slate-800',
      'Lost': 'bg-red-100 text-red-800',
    };
    return colors[statusName] || 'bg-slate-100 text-slate-800';
  }

  function getDaysInStatus(lead: Lead) {
    const days = Math.floor(
      (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  }

  function isOverdue(lead: Lead) {
    const days = getDaysInStatus(lead);
    const status = statuses.find((s) => s.id === lead.current_status_id);
    return status?.days_until_alert ? days > status.days_until_alert : false;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading leads...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">All Leads</h2>
        <button
          onClick={onCreateNew}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Lead
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Rep</label>
              <select
                value={assignedRepFilter}
                onChange={(e) => setAssignedRepFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="all">All Reps</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Admin</label>
              <select
                value={assignedAdminFilter}
                onChange={(e) => setAssignedAdminFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="all">All Admins</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Lead #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Assigned Rep
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Assigned Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Age
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onLeadClick(lead)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {lead.lead_number}
                        </span>
                        {isOverdue(lead) && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {lead.client_name === 'Cash Sales' && lead.cash_customer_name
                          ? `${lead.client_name} — ${lead.cash_customer_name}`
                          : lead.client_name}
                      </div>
                      {lead.contact_person && (
                        <div className="text-sm text-slate-500">{lead.contact_person}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          lead.current_status?.name || ''
                        )}`}
                      >
                        {lead.current_status?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {lead.assigned_rep_user?.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {lead.assigned_admin_user?.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {lead.branch?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                          <td className="px-6 py-4 text-sm text-slate-900">
                      {lead.estimated_value ? `R${lead.estimated_value.toLocaleString()}` : '-'}
                    </td>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <Calendar className="w-4 h-4" />
                        {getDaysInStatus(lead)}d
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>
    </div>
  );
}
