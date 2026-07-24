import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, Calendar, MapPin, Banknote, Download, AlertCircle, Loader2 } from 'lucide-react';
import { getSalesLeadAnalytics } from '../lib/api';
import { SmartDateInput } from './SmartDateInput';
import {
  calculateSalesAverage,
  buildAppointmentPresentation,
  buildBranchPerformancePresentation,
  buildCalculatedRatePresentation,
  buildRatePresentation,
  buildRepPerformancePresentation,
  formatSalesAverageDays,
  formatSalesCurrency,
  formatSalesNumber,
  formatSalesPercentage,
  getSalesRatePresentationStyle,
  normalizeSalesAnalytics,
  type SalesAnalyticsData,
} from '../utils/salesReportNumbers';

type ReportCategory = 'overview' | 'performance' | 'sources' | 'reps' | 'appointments' | 'branches' | 'canvassing';

const SalesLeadReports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('overview');
  const [dateRange, setDateRange] = useState('allTime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState<SalesAnalyticsData | null>(null);
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
      case 'allTime': {
        // No date filters — return all records
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
      setAnalyticsData(normalizeSalesAnalytics(data));
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
              <option value="allTime">All Time</option>
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
                <SmartDateInput
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="Start Date"
                />
                <SmartDateInput
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
          {analyticsData && selectedCategory === 'overview' && <ExecutiveOverview data={analyticsData} formatCurrency={formatSalesCurrency} />}
          {analyticsData && selectedCategory === 'performance' && <LeadPerformanceReport data={analyticsData} formatCurrency={formatSalesCurrency} />}
          {analyticsData && selectedCategory === 'sources' && <SourceAnalysisReport data={analyticsData} formatCurrency={formatSalesCurrency} />}
          {analyticsData && selectedCategory === 'reps' && <RepPerformanceReport data={analyticsData} formatCurrency={formatSalesCurrency} />}
          {analyticsData && selectedCategory === 'appointments' && <AppointmentAnalyticsReport data={analyticsData} />}
          {analyticsData && selectedCategory === 'branches' && <BranchPerformanceReport data={analyticsData} formatCurrency={formatSalesCurrency} />}
        </div>
      </div>
    </div>
  );
};

// Report components with real data
const ExecutiveOverview: React.FC<{ data: SalesAnalyticsData; formatCurrency: (value: unknown) => string }> = ({ data, formatCurrency }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatSalesNumber(data.leadPerformance.totalLeads)}</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatSalesPercentage(data.leadPerformance.conversionRate)}</p>
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
                {formatSalesAverageDays(data.leadPerformance.avgDaysToConversion)}
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
        {Object.entries(data.leadPerformance?.statusBreakdown ?? {}).map(([status, count]) => (
          <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 capitalize">{status.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatSalesNumber(count)}</p>
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
        {(data.leadAging?.ranges ?? []).map((range) => (
          <div key={range.range} className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{range.range}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatSalesNumber(range.count)}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LeadPerformanceReport: React.FC<{ data: SalesAnalyticsData; formatCurrency: (value: unknown) => string }> = ({ data, formatCurrency }) => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Performance Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Total Leads</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatSalesNumber(data.leadPerformance.totalLeads)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatSalesPercentage(data.leadPerformance.conversionRate)}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600">Avg Days to Conversion</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatSalesAverageDays(data.leadPerformance.avgDaysToConversion)}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Status Distribution</h4>
        <div className="space-y-3">
          {Object.entries(data.leadPerformance?.statusBreakdown ?? {}).map(([status, count]) => {
            const percentage = buildCalculatedRatePresentation(count, data.leadPerformance.totalLeads);
            return (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 capitalize font-medium">{status.replace(/_/g, ' ')}</span>
                  <span className="text-gray-900 font-semibold">{formatSalesNumber(count)} ({percentage.label})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-ars-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentage.width}%` }}
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
    {(data.lostReasons?.length ?? 0) > 0 && (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Top Lost Reasons</h4>
        <div className="space-y-2">
          {(data.lostReasons ?? []).map((reason, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{reason.reason || 'No reason provided'}</span>
              <span className="text-sm font-semibold text-gray-900">{formatSalesNumber(reason.count)}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const SourceAnalysisReport: React.FC<{ data: SalesAnalyticsData; formatCurrency: (value: unknown) => string }> = ({ data, formatCurrency }) => (
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
            {(data.sourceAnalysis?.leadsBySource ?? []).map((source) => (
              <tr key={source.source} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-900 capitalize">{source.source || 'Not Specified'}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{formatSalesNumber(source.count)}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatCurrency(source.totalValue)}</td>
                <td className="py-3 px-4 text-sm text-gray-900 text-right">
                  {formatCurrency(calculateSalesAverage(source.totalValue, source.count))}
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
        {(data.sourceAnalysis?.sourceConversionRates ?? []).map((source) => {
          const conversionRate = buildRatePresentation(source.conversionRate);
          return (
          <div key={source.source}>
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {source.source || 'Not Specified'}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({formatSalesNumber(source.convertedLeads)} / {formatSalesNumber(source.totalLeads)} converted)
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {conversionRate.label}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                style={{ width: `${conversionRate.width}%` }}
              ></div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  </div>
);

const RepPerformanceReport: React.FC<{ data: SalesAnalyticsData; formatCurrency: (value: unknown) => string }> = ({ data, formatCurrency }) => {
  const { sortedReps, convertedRepCount, topPerformer, topConverter } = buildRepPerformancePresentation(data.repPerformance?.reps ?? []);

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
                const isMedal = rep.totalValue !== null && index < 3;
                const medalColors = ['bg-yellow-100', 'bg-gray-100', 'bg-orange-100'];
                const conversionRateStyle = getSalesRatePresentationStyle(rep.conversionRate);
                
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
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatSalesNumber(rep.totalLeads)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{formatSalesNumber(rep.convertedLeads)}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${conversionRateStyle}
                      `}>
                        {formatSalesPercentage(rep.conversionRate)}
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
          {topPerformer ? (
            <div className="mt-2">
              <p className="text-lg font-bold text-gray-900">{topPerformer.repName}</p>
              <p className="text-sm text-gray-600">
                {formatCurrency(topPerformer.totalValue)} converted
              </p>
            </div>
          ) : (
            <p className="mt-2 text-lg font-bold text-gray-500">—</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Highest Conversion Rate</p>
          {topConverter ? (
              <div className="mt-2">
                <p className="text-lg font-bold text-gray-900">{topConverter.repName}</p>
                <p className="text-sm text-gray-600">
                  {formatSalesPercentage(topConverter.conversionRate)} conversion rate
                </p>
              </div>
            ) : (
              <p className="mt-2 text-lg font-bold text-gray-500">—</p>
            )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total Reps</p>
          <div className="mt-2">
            <p className="text-lg font-bold text-gray-900">{(data.repPerformance?.reps ?? []).length}</p>
            <p className="text-sm text-gray-600">
              {formatSalesNumber(convertedRepCount)} with conversions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentAnalyticsReport: React.FC<{ data: SalesAnalyticsData }> = ({ data }) => {
  const { appointmentAnalytics } = data;
  const presentation = buildAppointmentPresentation(appointmentAnalytics);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Total Appointments</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatSalesNumber(appointmentAnalytics.totalAppointments)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Attended</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatSalesNumber(presentation.attended.count)}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">No Show</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatSalesNumber(presentation.noShow.count)}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatSalesNumber(presentation.pending)}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Appointment Show Rate</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all"
                  style={{ width: `${presentation.showRate.width}%` }}
                >
                  {presentation.showRate.value !== null && presentation.showRate.value > 10 && presentation.showRate.label}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {presentation.showRate.label}
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
                {formatSalesNumber(presentation.attended.count)}
                ({presentation.attended.rate.label})
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ 
                  width: `${presentation.attended.rate.width}%`
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">No Show</span>
              <span className="text-gray-900 font-semibold">
                {formatSalesNumber(presentation.noShow.count)}
                ({presentation.noShow.rate.label})
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full"
                style={{ 
                  width: `${presentation.noShow.rate.width}%`
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">Pending</span>
              <span className="text-gray-900 font-semibold">
                {formatSalesNumber(presentation.pendingBreakdown.count)}
                ({presentation.pendingBreakdown.rate.label})
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full"
                style={{ 
                  width: `${presentation.pendingBreakdown.rate.width}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BranchPerformanceReport: React.FC<{ data: SalesAnalyticsData; formatCurrency: (value: unknown) => string }> = ({ data, formatCurrency }) => {
  const { rows, topByRevenue, topByLeads, topByConversion } = buildBranchPerformancePresentation(data.branchPerformance ?? []);

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
              {rows.map(({ branch, conversionRate }) => {
                const conversionRateStyle = getSalesRatePresentationStyle(conversionRate.value);
                
                return (
                  <tr key={branch.branch} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {branch.branch || 'Not Specified'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatSalesNumber(branch.totalLeads)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {formatSalesNumber(branch.convertedLeads)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${conversionRateStyle}
                      `}>
                        {conversionRate.label}
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
          {topByRevenue ? (
            <div>
              <p className="text-lg font-bold text-gray-900">{topByRevenue.branch.branch || 'Not Specified'}</p>
              <p className="text-2xl font-bold text-ars-primary mt-1">
                {formatCurrency(topByRevenue.branch.totalValue)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-500 mt-1">—</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-2">Most Leads</p>
          {topByLeads ? (
              <div>
                <p className="text-lg font-bold text-gray-900">{topByLeads.branch.branch || 'Not Specified'}</p>
                <p className="text-2xl font-bold text-ars-primary mt-1">{formatSalesNumber(topByLeads.branch.totalLeads)} leads</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-500 mt-1">—</p>
            )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-2">Highest Conversion Rate</p>
          {topByConversion ? (
              <div>
                <p className="text-lg font-bold text-gray-900">{topByConversion.branch.branch || 'Not Specified'}</p>
                <p className="text-2xl font-bold text-ars-primary mt-1">
                  {topByConversion.conversionRate.label}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-500 mt-1">—</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default SalesLeadReports;
