import { useState } from 'react';
import { FileText, Eye, Download, Calendar, User } from 'lucide-react';

/**
 * Job Card Submissions component.
 * Allows super admins to view job card submissions from technicians.
 */
export function JobCardSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#383838] mb-2 flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#0969a9]" />
                Job Card Submissions
              </h1>
              <p className="text-sm text-gray-600">
                View and manage job card submissions from technicians
              </p>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-[8px] shadow-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No submissions yet</h3>
              <p className="text-sm text-gray-500">
                Submissions from technicians will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission._id} className="border border-gray-200 rounded-[8px] p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">
                          {submission.job?.jobNumber || 'N/A'}
                        </h3>
                        <span className="text-sm text-gray-600">
                          Template: {submission.template?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>
                            {submission.submittedBy?.firstName} {submission.submittedBy?.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-[6px] hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button className="px-4 py-2 bg-gray-50 text-gray-700 rounded-[6px] hover:bg-gray-100 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

