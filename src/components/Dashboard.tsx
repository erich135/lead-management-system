import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardStats, Lead, LeadStatus, Profile, Branch, Notification } from '../types';
import {
  LogOut,
  Users,
  Bell,
  LayoutDashboard,
  FileText,
  BarChart3,
  Plus,
  AlertCircle,
  TrendingUp,
  Banknote,
  Calendar
} from 'lucide-react';
import { LeadsList } from './LeadsList';
import { LeadForm } from './LeadForm';
import { LeadDetails } from './LeadDetails';
import { UserManagement } from './UserManagement';
import { Reports } from './Reports';
import { Diary } from './Diary';

type View = 'dashboard' | 'leads' | 'reports' | 'users' | 'diary';

export function Dashboard() {
  const { profile, signOut, isAdmin } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    await Promise.all([
      loadStats(),
      loadNotifications(),
      loadStatuses(),
      loadUsers(),
      loadBranches()
    ]);
  }

  async function loadStats() {
    try {
      // Demo data - replace with real data when Supabase is connected
      const demoStats: DashboardStats = {
        total_leads: 47,
        active_leads: 34,
        overdue_quotes: 8,
        pending_installation: 5,
        total_value: 1847500,
        leads_by_status: {
          'In Progress': 12,
          'Quoted': 8,
          'Sent to Client': 6,
          'Await PO': 4,
          'Register': 3,
          'Parts Ready': 2,
          'Job Done': 5,
          'Invoiced': 4,
          'Paid': 3
        },
        leads_by_branch: {
          'Main Office': 25,
          'North Branch': 12,
          'South Branch': 10
        }
      };
      setStats(demoStats);

      const { data: leads } = await supabase
        .from('leads')
        .select('*, current_status:lead_statuses(*)');

      if (leads && leads.length > 0) {
        const stats: DashboardStats = {
          total_leads: leads.length,
          active_leads: leads.filter(l =>
            l.current_status?.name !== 'Paid' &&
            l.current_status?.name !== 'Lost'
          ).length,
          overdue_quotes: 0,
          pending_installation: leads.filter(l =>
            l.current_status?.name === 'Ready for Installation'
          ).length,
          total_value: leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
          leads_by_status: {},
          leads_by_branch: {}
        };

        leads.forEach(lead => {
          const statusName = lead.current_status?.name || 'Unknown';
          stats.leads_by_status[statusName] = (stats.leads_by_status[statusName] || 0) + 1;

          if (lead.branch_id) {
            stats.leads_by_branch[lead.branch_id] = (stats.leads_by_branch[lead.branch_id] || 0) + 1;
          }
        });

        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadNotifications() {
    try {
      // Demo notifications
      const demoNotifications: Notification[] = [
        {
          id: '1',
          user_id: profile?.id || '',
          lead_id: 'demo-lead-1',
          type: 'overdue',
          message: 'Lead JHB-2025-0023 has been waiting for quote for 3 days',
          is_read: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        },
        {
          id: '2',
          user_id: profile?.id || '',
          lead_id: 'demo-lead-2',
          type: 'status_change',
          message: 'Lead JHB-2025-0045 status changed to "Quoted"',
          is_read: false,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: 'medium'
        },
        {
          id: '3',
          user_id: profile?.id || '',
          lead_id: 'demo-lead-3',
          type: 'overdue',
          message: 'Lead JHB-2025-0018 is overdue for follow-up',
          is_read: false,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        }
      ];
      setNotifications(demoNotifications);

      const { data } = await supabase
        .from('notifications')
        .select('*, lead:leads(*)')
        .eq('user_id', profile?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function loadStatuses() {
    try {
      const { data } = await supabase
        .from('lead_statuses')
        .select('*')
        .order('sort_order');

      if (data) setStatuses(data);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }

  async function loadUsers() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, branch:branches(*)')
        .order('full_name');

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function loadBranches() {
    try {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (data) setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function markNotificationRead(id: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    loadNotifications();
  }

  function handleLeadClick(lead: Lead) {
    setSelectedLead(lead);
  }

  function handleLeadSaved() {
    setShowLeadForm(false);
    setSelectedLead(null);
    loadStats();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-blue-600 font-bold text-sm">ARS</span>
                </div>
                <h1 className="text-xl font-bold text-white">ARS Customer Management</h1>
              </div>

              <div className="hidden md:flex gap-1">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    view === 'dashboard'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setView('leads')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    view === 'leads'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Leads
                </button>
                <button
                  onClick={() => setView('reports')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    view === 'reports'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />
                  Reports
                </button>
                <button
                  onClick={() => setView('diary')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    view === 'diary'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Diary
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setView('users')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      view === 'users'
                        ? 'bg-white/20 text-white shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Users
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full shadow-md"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-2 max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-slate-500 text-sm">
                        No new notifications
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100"
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          <p className="text-sm text-slate-900 font-medium mb-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 border-l border-white/20 pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                  <p className="text-xs text-white/70 capitalize">{profile?.role}</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' && stats && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
              <button
                onClick={() => setShowLeadForm(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Lead
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <button 
                onClick={() => setView('leads')}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">Total Leads</p>
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.total_leads}</p>
              </button>

              <button 
                onClick={() => setView('leads')}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">Active Leads</p>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.active_leads}</p>
              </button>

              <button 
                onClick={() => setView('leads')}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-red-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">Overdue Tasks</p>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.overdue_quotes}</p>
              </button>

              <button 
                onClick={() => setView('reports')}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">Total Value</p>
                  <Banknote className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  R{stats.total_value.toLocaleString()}
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Leads by Status</h3>
                <div className="space-y-3">
                  {Object.entries(stats.leads_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{status}</span>
                      <span className="text-sm font-semibold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {notifications.slice(0, 5).map((notif) => (
                    <div key={notif.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                      <div className="w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{notif.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'leads' && (
          <LeadsList
            onLeadClick={handleLeadClick}
            onCreateNew={() => setShowLeadForm(true)}
            statuses={statuses}
            users={users}
            branches={branches}
          />
        )}

        {view === 'reports' && (
          <Reports
            statuses={statuses}
            users={users}
            branches={branches}
          />
        )}

        {view === 'diary' && (
          <Diary users={users} />
        )}

        {view === 'users' && isAdmin && (
          <UserManagement
            users={users}
            branches={branches}
            onUpdate={loadUsers}
          />
        )}
      </main>

      {showLeadForm && (
        <LeadForm
          statuses={statuses}
          users={users}
          branches={branches}
          onClose={() => setShowLeadForm(false)}
          onSaved={handleLeadSaved}
        />
      )}

      {selectedLead && (
        <LeadDetails
          lead={selectedLead}
          statuses={statuses}
          users={users}
          onClose={() => setSelectedLead(null)}
          onUpdate={loadStats}
        />
      )}
    </div>
  );
}
