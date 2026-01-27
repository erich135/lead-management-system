import React from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

const WeeklyPlanner: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Weekly Planner</h2>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Previous Week
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-ars-primary rounded-lg hover:bg-ars-primary/90 transition-colors">
            This Week
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Next Week
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
          <div key={day} className="border border-gray-200 rounded-lg p-3 min-h-[200px]">
            <h3 className="font-semibold text-gray-900 mb-2">{day}</h3>
            <div className="text-xs text-gray-500">No appointments</div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Weekly planner functionality will be fully implemented in Phase 3 (Task 21).
          This will include appointment scheduling, rep filtering, and daily summary counts.
        </p>
      </div>
    </div>
  );
};

export default WeeklyPlanner;
