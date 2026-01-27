import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, Calendar, MapPin, Banknote, Download, AlertCircle, Loader2 } from 'lucide-react';
import { getSalesLeadAnalytics } from '../lib/api';

type ReportCategory = 'overview' | 'performance' | 'sources' | 'reps' | 'appointments' | 'branches' | 'canvassing';

interface AnalyticsData {
  leadPerformance: {
    totalLeads: number;
    statusBreakdown: Record<string, number>;
    conversionRate: number;
    avgDaysToConversion: number;
    valueMetrics: {
      totalPipelineValue: number;
      totalConvertedValue: number;
      avgLeadValue: number;
      avgConvertedValue: number;
    };
  };
  sourceAnalysis: {
    leadsBySource: Array<{
      source: string;
      count: number;
      totalValue: number;
    }>;
    sourceConversionRates: Array<{
      source: string;
      conversionRate: number;
      totalLeads: number;
      convertedLeads: number;
    }>;
  };
  repPerformance: {
    reps: Array<{
      repId: string;
      repName: string;
      totalLeads: number;
      convertedLeads: number;
      conversionRate: number;
      totalValue: number;
      avgLeadValue: number;
    }>;
  };
  appointmentAnalytics: {
    totalAppointments: number;
    attendedAppointments: number;
    noShowAppointments: number;
    appointmentShowRate: number;
  };
  branchPerformance: Array<{
    branch: string;
    totalLeads: number;
    convertedLeads: number;
    totalValue: number;
    avgValue: number;
  }>;
  leadAging: {
    ranges: Array<{
      range: string;
      count: number;
    }>;
  };
  lostReasons: Array<{
    reason: string;
    count: number;
  }>;
}

const SalesLeadReports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('overview');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on selection
  const getDateRangeFilters = () => {
    const now = new Date();
    const filters: { startDate?: string; endDate?: string } = {};

    switch (dateRange) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filters.startDate = today.toISOString().split('T')[0];
        filters.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      }
      case 'thisWeek': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        filters.startDate = startOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filters.startDate = startOfMonth.toISOString().split('T')[0];
        break;
      }
      case 'thisQuarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
        filters.startDate = startOfQuarter.toISOString().split('T')[0];
        break;
      }
      case 'thisYear': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filters.startDate = startOfYear.toISOString().split('T')[0];
        break;
      }
      case 'custom': {
        if (customStartDate) filters.startDate = customStartDate;
        if (customEndDate) filters.endDate = customEndDate;
        break;
      }
    }

    return filters;
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = getDateRangeFilters();
      const data = await getSalesLeadAnalytics(filters);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, customStartDate, customEndDate]);


  const categories = [
    { id: 'overview' as ReportCategory, label: 'Executive Overview', icon: TrendingUp },
    { id: 'performance' as ReportCategory, label: 'Lead Performance', icon: Target },
    { id: 'sources' as ReportCategory, label: 'Source Analysis', icon: MapPin },
    { id: 'reps' as ReportCategory, label: 'Rep Performance', icon: Users },
    { id: 'appointments' as ReportCategory, label: 'Appointment Analytics', icon: Calendar },
    { id: 'branches' as ReportCategory, label: 'Branch Performance', icon: MapPin },
  ];

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R ${(value / 1000).toFixed(0)}K`;
    }
    return `R ${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ars-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Error Loading Analytics</h3>
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 px-4 py-2 bg-ars-primary text-white rounded-lg hover:bg-ars-primary-dark transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }


  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Report Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Sales Lead Reports & Analytics</h2>
          
          <div className="flex items-center gap-3">
            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="End Date"
                />
              </>
            )}

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Report Categories */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Report Categories
            </h3>
            <nav className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        selectedCategory === category.id
                          ? 'bg-ars-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content - Report Display */}
        <div className="flex-1 overflow-auto p-6">
          {selectedCategory === 'overview' && <ExecutiveOverview data={analyticsData} formatCurrency={formatCurrency} />}
          {selectedCategory === 'performance' && <LeadPerformanceReport data={analyticsData} formatCurrency={formatCurrency} />}
          {selectedCategory === 'sources' && <SourceAnalysisReport data={analyticsData} formatCurrency={formatCurrency} />}
          {selectedCategory === 'reps' && <RepPerformanceReport data={analyticsData} formatCurrency={formatCurrency} />}
          {selectedCategory === 'appointments' && <AppointmentAnalyticsReport data={analyticsData} />}
          {selectedCategory === 'branches' && <BranchPerformanceReport data={analyticsData} formatCurrency={formatCurrency} />}
        </div>
      </div>
    </div>
  );
};

// Report components with real data
const ExecutiveOverview: React.FC<{ data: AnalyticsData; formatCurrency: (value: number) => string }> = ({ data, formatCurrency }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.leadPerformance.totalLeads}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.leadPerformance.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Avg Days to Convert */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Days to Convert</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.leadPerformance.avgDaysToConversion > 0 ? Math.round(data.leadPerformance.avgDaysToConversion) : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Converted Value */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Converted Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.leadPerformance.valueMetrics.totalConvertedValue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Status Breakdown */}
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-md font-semibold text-gray-900 mb-4">Lead Status Breakdown</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(data.leadPerformance.statusBreakdown).map(([status, count]) => (
          <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 capitalize">{status.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Value Metrics */}
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-md font-semibold text-gray-900 mb-4">Value Metrics</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Pipeline Value</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.totalPipelineValue)}
          </p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Avg Lead Value</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.avgLeadValue)}
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Avg Converted Value</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.avgConvertedValue)}
          </p>
        </div>
      </div>
    </div>

    {/* Lead Aging */}
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-md font-semibold text-gray-900 mb-4">Lead Aging Analysis</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.leadAging.ranges.map((range) => (
          <div key={range.range} className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{range.range}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{range.count}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LeadPerformanceReport: React.FC<{ data: AnalyticsData; formatCurrency: (value: number) => string }> = ({ data, formatCurrency }) => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Performance Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Total Leads</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.leadPerformance.totalLeads}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.leadPerformance.conversionRate.toFixed(1)}%</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Avg Days to Conversion</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {data.leadPerformance.avgDaysToConversion > 0 ? Math.round(data.leadPerformance.avgDaysToConversion) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Status Distribution</h4>
        <div className="space-y-3">
          {Object.entries(data.leadPerformance.statusBreakdown).map(([status, count]) => {
            const percentage = data.leadPerformance.totalLeads > 0 
              ? (count / data.leadPerformance.totalLeads * 100).toFixed(1) 
              : 0;
            return (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 capitalize font-medium">{status.replace(/_/g, ' ')}</span>
                  <span className="text-gray-900 font-semibold">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-ars-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Value Metrics */}
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-4">Value Analysis</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Pipeline Value</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.totalPipelineValue)}
          </p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Converted Value</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.totalConvertedValue)}
          </p>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-gray-600">Avg Lead Value</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.avgLeadValue)}
          </p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Avg Converted Value</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {formatCurrency(data.leadPerformance.valueMetrics.avgConvertedValue)}
          </p>
        </div>
      </div>
    </div>

    {/* Lost Reasons */}
    {data.lostReasons.length > 0 && (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Top Lost Reasons</h4>
        <div className="space-y-2">
          {data.lostReasons.map((reason, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{reason.reason || 'No reason provided'}</span>
              <span className="text-sm font-semibold text-gray-900">{reason.count}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const SourceAnalysisReport: React.FC<{ data: AnalyticsData; formatCurrency: (value: number) => string }> = ({ data, formatCurrency }) => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Source</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Count</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Value</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Value</th>
            </tr>
          </thead>
          <tbody>
            {data.sourceAnalysis.leadsBySource.map((source) => (
              <tr key={source.source} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-900 capitalize">{source.source || 'Not Specified'}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{source.count}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatCurrency(source.totalValue)}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right">
                  {formatCurrency(source.count > 0 ? source.totalValue / source.count : 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Conversion Rates</h3>
      <div className="space-y-4">
        {data.sourceAnalysis.sourceConversionRates.map((source) => (
          <div key={source.source}>
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {source.source || 'Not Specified'}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({source.convertedLeads} / {source.totalLeads} converted)
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {source.conversionRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(source.conversionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RepPerformanceReport: React.FC<{ data: AnalyticsData; formatCurrency: (value: number) => string }> = ({ data, formatCurrency }) => {
  // Sort reps by converted value (descending)
  const sortedReps = [...data.repPerformance.reps].sort((a, b) => b.totalValue - a.totalValue);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rep Performance Leaderboard</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rep Name</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Leads</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Converted</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Conv. Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Value</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {sortedReps.map((rep, index) => {
                const isMedal = index < 3;
                const medalColors = ['bg-yellow-100', 'bg-gray-100', 'bg-orange-100'];
                
                return (
                  <tr 
                    key={rep.repId} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${isMedal ? medalColors[index] : ''}`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 font-bold">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && index + 1}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{rep.repName}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">{rep.totalLeads}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{rep.convertedLeads}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${rep.conversionRate >= 30 ? 'bg-green-100 text-green-800' : 
                          rep.conversionRate >= 20 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}
                      `}>
                        {rep.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(rep.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">
                      {formatCurrency(rep.avgLeadValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Top Performer</p>
          {sortedReps[0] && (
            <div className="mt-2">
              <p className="text-lg font-bold text-gray-900">{sortedReps[0].repName}</p>
              <p className="text-sm text-gray-600">
                {formatCurrency(sortedReps[0].totalValue)} converted
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Highest Conversion Rate</p>
          {(() => {
            const topConverter = [...sortedReps].sort((a, b) => b.conversionRate - a.conversionRate)[0];
            return topConverter && (
              <div className="mt-2">
                <p className="text-lg font-bold text-gray-900">{topConverter.repName}</p>
                <p className="text-sm text-gray-600">
                  {topConverter.conversionRate.toFixed(1)}% conversion rate
                </p>
              </div>
            );
          })()}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total Reps</p>
          <div className="mt-2">
            <p className="text-lg font-bold text-gray-900">{data.repPerformance.reps.length}</p>
            <p className="text-sm text-gray-600">
              {data.repPerformance.reps.filter(r => r.convertedLeads > 0).length} with conversions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentAnalyticsReport: React.FC<{ data: AnalyticsData }> = ({ data }) => {
  const { appointmentAnalytics } = data;
  const pendingAppointments = appointmentAnalytics.totalAppointments - 
    appointmentAnalytics.attendedAppointments - 
    appointmentAnalytics.noShowAppointments;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Total Appointments</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{appointmentAnalytics.totalAppointments}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Attended</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{appointmentAnalytics.attendedAppointments}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">No Show</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{appointmentAnalytics.noShowAppointments}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{pendingAppointments}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Appointment Show Rate</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all"
                  style={{ width: `${appointmentAnalytics.appointmentShowRate}%` }}
                >
                  {appointmentAnalytics.appointmentShowRate > 10 && `${appointmentAnalytics.appointmentShowRate.toFixed(1)}%`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {appointmentAnalytics.appointmentShowRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Show Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Breakdown</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">Attended</span>
              <span className="text-gray-900 font-semibold">
                {appointmentAnalytics.attendedAppointments} 
                ({appointmentAnalytics.totalAppointments > 0 
                  ? ((appointmentAnalytics.attendedAppointments / appointmentAnalytics.totalAppointments) * 100).toFixed(1) 
                  : 0}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ 
                  width: `${appointmentAnalytics.totalAppointments > 0 
                    ? (appointmentAnalytics.attendedAppointments / appointmentAnalytics.totalAppointments) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">No Show</span>
              <span className="text-gray-900 font-semibold">
                {appointmentAnalytics.noShowAppointments} 
                ({appointmentAnalytics.totalAppointments > 0 
                  ? ((appointmentAnalytics.noShowAppointments / appointmentAnalytics.totalAppointments) * 100).toFixed(1) 
                  : 0}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full"
                style={{ 
                  width: `${appointmentAnalytics.totalAppointments > 0 
                    ? (appointmentAnalytics.noShowAppointments / appointmentAnalytics.totalAppointments) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">Pending</span>
              <span className="text-gray-900 font-semibold">
                {pendingAppointments} 
                ({appointmentAnalytics.totalAppointments > 0 
                  ? ((pendingAppointments / appointmentAnalytics.totalAppointments) * 100).toFixed(1) 
                  : 0}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full"
                style={{ 
                  width: `${appointmentAnalytics.totalAppointments > 0 
                    ? (pendingAppointments / appointmentAnalytics.totalAppointments) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BranchPerformanceReport: React.FC<{ data: AnalyticsData; formatCurrency: (value: number) => string }> = ({ data, formatCurrency }) => {
  // Sort branches by total value (descending)
  const sortedBranches = [...data.branchPerformance].sort((a, b) => b.totalValue - a.totalValue);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Leads</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Converted</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Conv. Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Value</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.map((branch) => {
                const conversionRate = branch.totalLeads > 0 
                  ? (branch.convertedLeads / branch.totalLeads * 100) 
                  : 0;
                
                return (
                  <tr key={branch.branch} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {branch.branch || 'Not Specified'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">{branch.totalLeads}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {branch.convertedLeads}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${conversionRate >= 30 ? 'bg-green-100 text-green-800' : 
                          conversionRate >= 20 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}
                      `}>
                        {conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(branch.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">
                      {formatCurrency(branch.avgValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-2">Highest Revenue</p>
          {sortedBranches[0] && (
            <div>
              <p className="text-lg font-bold text-gray-900">{sortedBranches[0].branch || 'Not Specified'}</p>
              <p className="text-2xl font-bold text-ars-primary mt-1">
                {formatCurrency(sortedBranches[0].totalValue)}
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-2">Most Leads</p>
          {(() => {
            const topByLeads = [...sortedBranches].sort((a, b) => b.totalLeads - a.totalLeads)[0];
            return topByLeads && (
              <div>
                <p className="text-lg font-bold text-gray-900">{topByLeads.branch || 'Not Specified'}</p>
                <p className="text-2xl font-bold text-ars-primary mt-1">{topByLeads.totalLeads} leads</p>
              </div>
            );
          })()}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-2">Highest Conversion Rate</p>
          {(() => {
            const topByConversion = [...sortedBranches].sort((a, b) => {
              const rateA = a.totalLeads > 0 ? (a.convertedLeads / a.totalLeads) : 0;
              const rateB = b.totalLeads > 0 ? (b.convertedLeads / b.totalLeads) : 0;
              return rateB - rateA;
            })[0];
            return topByConversion && (
              <div>
                <p className="text-lg font-bold text-gray-900">{topByConversion.branch || 'Not Specified'}</p>
                <p className="text-2xl font-bold text-ars-primary mt-1">
                  {topByConversion.totalLeads > 0 
                    ? ((topByConversion.convertedLeads / topByConversion.totalLeads) * 100).toFixed(1) 
                    : 0}%
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default SalesLeadReports;
