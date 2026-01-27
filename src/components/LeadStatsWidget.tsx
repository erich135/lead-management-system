import { useEffect, useState } from 'react';
import { TrendingUp, Users, Calendar, Target, Banknote, AlertCircle } from 'lucide-react';
import { getSalesLeadStats } from '../lib/api';

export function LeadStatsWidget() {
  const [stats, setStats] = useState<{
    totalLeads: number;
    openLeads: number;
    pendingConversions: number;
    conversionRate: number;
    appointmentsThisWeek: number;
    upcomingAppointments: number;
    totalEstimatedValue: number;
    convertedValue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSalesLeadStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading lead stats:', err);
      setError(err.message || 'Failed to load lead statistics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ars-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Open Leads',
      value: stats.openLeads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Active leads in pipeline',
    },
    {
      title: 'Upcoming Appointments',
      value: stats.upcomingAppointments,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Next 7 days',
    },
    {
      title: 'Pending Conversions',
      value: stats.pendingConversions,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'RFC requested',
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Leads to jobs',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Sales Lead Metrics</h3>
        <button
          onClick={loadStats}
          className="text-sm text-ars-primary hover:text-ars-primary/80 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 font-medium">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Banknote className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-xs text-gray-600 font-medium">Pipeline Value</p>
            <p className="text-lg font-bold text-gray-900">
              R{(stats.totalEstimatedValue || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Banknote className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs text-gray-600 font-medium">Converted Value</p>
            <p className="text-lg font-bold text-green-700">
              R{(stats.convertedValue || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
