import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, Profile, Branch } from '../types';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  Banknote
} from 'lucide-react';

interface ReportsProps {
  statuses: LeadStatus[];
  users: Profile[];
  branches: Branch[];
}

export function Reports({ statuses, users, branches }: ReportsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: 'all',
    branch: 'all',
    assigned: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, filters]);

  async function loadLeads() {
    try {
      const { data } = await supabase
        .from('leads')
        .select(`
          *,
          branch:branches(*),
          current_status:lead_statuses(*),
          assigned_rep_user:profiles!leads_assigned_rep_fkey(*),
          assigned_admin_user:profiles!leads_assigned_admin_fkey(*)
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

    if (filters.status !== 'all') {
      filtered = filtered.filter((lead) => lead.current_status_id === filters.status);
    }

    if (filters.branch !== 'all') {
      filtered = filtered.filter((lead) => lead.branch_id === filters.branch);
    }

    if (filters.assigned !== 'all') {
      filtered = filtered.filter((lead) => 
        lead.assigned_rep === filters.assigned || lead.assigned_admin === filters.assigned
      );
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter((lead) => new Date(lead.created_at).getTime() >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime();
      filtered = filtered.filter((lead) => new Date(lead.created_at).getTime() <= to);
    }

    setFilteredLeads(filtered);
  }

  function calculateStats() {
    const totalValue = filteredLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
    const avgValue = filteredLeads.length > 0 ? totalValue / filteredLeads.length : 0;

    const statusBreakdown = filteredLeads.reduce((acc, lead) => {
      const statusName = lead.current_status?.name || 'Unknown';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const branchBreakdown = filteredLeads.reduce((acc, lead) => {
      const branchName = lead.branch?.name || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userBreakdown = filteredLeads.reduce((acc, lead) => {
      const repName = lead.assigned_rep_user?.full_name;
      const adminName = lead.assigned_admin_user?.full_name;
      if (repName) acc[`${repName} (Rep)`] = (acc[`${repName} (Rep)`] || 0) + 1;
      if (adminName) acc[`${adminName} (Admin)`] = (acc[`${adminName} (Admin)`] || 0) + 1;
      if (!repName && !adminName) acc['Unassigned'] = (acc['Unassigned'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalValue,
      avgValue,
      statusBreakdown,
      branchBreakdown,
      userBreakdown,
    };
  }

  function exportToCSV() {
    const headers = [
      'Lead Number',
      'Client Name',
      'Contact Person',
      'Contact Email',
      'Contact Phone',
      'Status',
      'Branch',
      'Assigned To',
      'Estimated Value',
      'Quote Number',
      'Order Number',
      'Invoice Number',
      'Created Date',
      'Updated Date',
    ];

    const rows = filteredLeads.map((lead) => [
      lead.lead_number,
      lead.client_name,
      lead.contact_person || '',
      lead.contact_email || '',
      lead.contact_phone || '',
      lead.current_status?.name || '',
      lead.branch?.name || '',
      lead.assigned_rep_user?.full_name || '',
      lead.assigned_admin_user?.full_name || '',
      lead.estimated_value || '',
      lead.quote_number || '',
      lead.order_number || '',
      lead.invoice_number || '',
      new Date(lead.created_at).toLocaleDateString(),
      new Date(lead.updated_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading report data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
        <button
          onClick={exportToCSV}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Assigned To</label>
            <select
              value={filters.assigned}
              onChange={(e) => setFilters({ ...filters, assigned: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">Total Leads</p>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{filteredLeads.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">Total Value</p>
            <Banknote className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">R{stats.totalValue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">Average Value</p>
            <Banknote className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            R{Math.round(stats.avgValue).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">By Status</h3>
          <div className="space-y-3">
            {Object.entries(stats.statusBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{status}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{
                          width: `${(count / filteredLeads.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">By Branch</h3>
          <div className="space-y-3">
            {Object.entries(stats.branchBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([branch, count]) => (
                <div key={branch} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{branch}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{
                          width: `${(count / filteredLeads.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">By User</h3>
          <div className="space-y-3">
            {Object.entries(stats.userBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([user, count]) => (
                <div key={user} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{user}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{
                          width: `${(count / filteredLeads.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
