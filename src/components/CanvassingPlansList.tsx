import React from 'react';
import { MapPin } from 'lucide-react';

const CanvassingPlansList: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Canvassing Plans</h2>
        <button className="px-4 py-2 text-sm font-medium text-white bg-ars-primary rounded-lg hover:bg-ars-primary/90 transition-colors">
          + Create Canvassing Plan
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent">
          <option value="">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent">
          <option value="">All Reps</option>
        </select>
      </div>

      <div className="space-y-4">
        {/* Placeholder empty state */}
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Canvassing Plans Yet</h3>
          <p className="text-gray-500 mb-4">Create your first canvassing plan to get started</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Canvassing plans functionality will be fully implemented in Phase 2 (Tasks 22-23).
          This will include plan creation, approval workflow, and tracking of field sales activities.
        </p>
      </div>
    </div>
  );
};

export default CanvassingPlansList;
