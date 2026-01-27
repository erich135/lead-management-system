import React, { useState } from 'react';
import { TrendingUp, Users, Target, Calendar, MapPin, DollarSign, Download, Filter } from 'lucide-react';

type ReportCategory = 'overview' | 'performance' | 'sources' | 'reps' | 'appointments' | 'branches' | 'canvassing';

const SalesLeadReports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('overview');
  const [dateRange, setDateRange] = useState('thisMonth');

  const categories = [
    { id: 'overview' as ReportCategory, label: 'Executive Overview', icon: TrendingUp },
    { id: 'performance' as ReportCategory, label: 'Lead Performance', icon: Target },
    { id: 'sources' as ReportCategory, label: 'Source Analysis', icon: MapPin },
    { id: 'reps' as ReportCategory, label: 'Rep Performance', icon: Users },
    { id: 'appointments' as ReportCategory, label: 'Appointment Analytics', icon: Calendar },
    { id: 'branches' as ReportCategory, label: 'Branch Performance', icon: MapPin },
    { id: 'canvassing' as ReportCategory, label: 'Canvassing Reports', icon: MapPin },
  ];

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
          {selectedCategory === 'overview' && <ExecutiveOverview />}
          {selectedCategory === 'performance' && <LeadPerformanceReport />}
          {selectedCategory === 'sources' && <SourceAnalysisReport />}
          {selectedCategory === 'reps' && <RepPerformanceReport />}
          {selectedCategory === 'appointments' && <AppointmentAnalyticsReport />}
          {selectedCategory === 'branches' && <BranchPerformanceReport />}
          {selectedCategory === 'canvassing' && <CanvassingReport />}
        </div>
      </div>
    </div>
  );
};

// Placeholder components for each report type
const ExecutiveOverview: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">247</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↑ 12%</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">34%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↑ 5%</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Days to Convert</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">14</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↓ 2 days</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Converted Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">R 1.2M</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↑ 18%</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-md font-semibold text-gray-900 mb-4">Sales Pipeline Funnel</h4>
      <p className="text-gray-500">Pipeline visualization chart will be implemented here.</p>
    </div>
  </div>
);

const LeadPerformanceReport: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Performance Metrics</h3>
    <p className="text-gray-500">Detailed lead performance metrics will be implemented here.</p>
    <ul className="mt-4 space-y-2 text-sm text-gray-600">
      <li>• Total leads by status breakdown</li>
      <li>• Conversion rate analysis (overall and by period)</li>
      <li>• Average days from lead creation to conversion</li>
      <li>• Lost lead analysis with reasons</li>
      <li>• Lead value metrics (estimated vs converted)</li>
    </ul>
  </div>
);

const SourceAnalysisReport: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Analysis</h3>
    <p className="text-gray-500">Lead source performance analysis will be implemented here.</p>
    <ul className="mt-4 space-y-2 text-sm text-gray-600">
      <li>• Leads by source (Website, Referral, Cold Call, Canvassing, etc.)</li>
      <li>• Conversion rate by source</li>
      <li>• Average estimated value by source</li>
      <li>• ROI by source (converted value vs effort)</li>
      <li>• Source performance trends over time</li>
    </ul>
  </div>
);

const RepPerformanceReport: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rep Performance Report</h3>
    <p className="text-gray-500">Sales rep performance metrics will be implemented here.</p>
    <ul className="mt-4 space-y-2 text-sm text-gray-600">
      <li>• Leads assigned per rep</li>
      <li>• Conversion rate by rep</li>
      <li>• Appointments scheduled per rep</li>
      <li>• Appointment attendance rate (attended vs no-show)</li>
      <li>• Average days to conversion by rep</li>
      <li>• Total converted value by rep</li>
      <li>• Rep leaderboard (by conversions, value, speed)</li>
    </ul>
  </div>
);

const AppointmentAnalyticsReport: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Analytics</h3>
    <p className="text-gray-500">Appointment performance metrics will be implemented here.</p>
    <ul className="mt-4 space-y-2 text-sm text-gray-600">
      <li>• Total appointments scheduled</li>
      <li>• Appointment show rate (attended vs no-show vs pending)</li>
      <li>• No-show reasons breakdown</li>
      <li>• Appointments by rep</li>
      <li>• Appointments by day of week/time analysis</li>
      <li>• Follow-up appointment rate</li>
      <li>• Average appointments per lead before conversion</li>
    </ul>
  </div>
);

const BranchPerformanceReport: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Performance</h3>
    <p className="text-gray-500">Branch-wise performance metrics will be implemented here.</p>
    <ul className="mt-4 space-y-2 text-sm text-gray-600">
      <li>• Leads by branch</li>
      <li>• Conversion rate by branch</li>
      <li>• Average lead value by branch</li>
      <li>• Total converted value by branch</li>
      <li>• Active leads per branch</li>
    </ul>
  </div>
);

const CanvassingReport: React.FC = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Canvassing Reports</h3>
    <p className="text-gray-500">Canvassing activity analysis will be implemented here.</p>
    <ul className="mt-4 space-y-2 text-sm text-gray-600">
      <li>• Canvassing plans submitted (by rep, by period)</li>
      <li>• Canvassing plan approval rate</li>
      <li>• Leads generated from canvassing</li>
      <li>• Canvassing ROI (leads/conversions vs travel costs)</li>
      <li>• Areas covered</li>
    </ul>
  </div>
);

export default SalesLeadReports;
