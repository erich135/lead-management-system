import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Eye, Download, Calendar, User, RefreshCw } from 'lucide-react';
import { getJobCardSubmissions, getJobCardSubmission, type JobCardSubmissionRecord } from '../lib/api';
import { FixedJobCardPrintView } from './FixedJobCardPrintView';

/**
 * Job Card Submissions component.
 * Allows admins to view and print job card submissions from technicians.
 */
export function JobCardSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<JobCardSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    submission: JobCardSubmissionRecord;
    machine?: Record<string, unknown>;
  } | null>(null);

  /**
   * Loads submissions from the API.
   */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJobCardSubmissions();
      setSubmissions(res.submissions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * Opens print preview when URL contains ?submission=id.
   */
  useEffect(() => {
    const submissionId = searchParams.get('submission');
    if (submissionId) {
      openPreview(submissionId);
    }
  }, [searchParams]);

  /**
   * Fetches and opens the print preview for a submission.
   */
  const openPreview = async (id: string) => {
    try {
      const data = await getJobCardSubmission(id);
      setPreviewData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    }
  };

  /**
   * Closes print preview and clears URL param.
   */
  const closePreview = () => {
    setPreviewData(null);
    searchParams.delete('submission');
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#383838] mb-2 flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#0969a9]" />
                Job Card Submissions
              </h1>
              <p className="text-sm text-gray-600">
                View and print completed job cards from technicians
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-[8px] shadow-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4" />
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No submissions yet</h3>
              <p className="text-sm text-gray-500">
                Submissions from technicians will appear here after they complete assigned job cards
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission._id}
                  className="border border-gray-200 rounded-[8px] p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">
                          {(submission.job as { jobNumber?: string })?.jobNumber || 'N/A'}
                        </h3>
                        <span className="text-sm text-gray-600">
                          {submission.template?.name || 'N/A'}
                        </span>
                        {submission.reportNumber && (
                          <span className="text-sm text-red-700 font-medium">
                            #{submission.reportNumber}
                          </span>
                        )}
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
                          <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(submission._id)}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-[6px] hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View &amp; Print
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewData && (
        <FixedJobCardPrintView
          template={previewData.submission.template}
          fieldValues={previewData.submission.fieldValues}
          job={previewData.submission.job as Record<string, unknown>}
          machine={previewData.machine}
          reportNumber={previewData.submission.reportNumber}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

