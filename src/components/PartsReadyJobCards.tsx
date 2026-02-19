import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Bell,
  Eye,
  Trash2,
  Plus,
  X,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import {
  getPartsReadyJobs,
  getJobCardTemplates,
  createJobCardAssignment,
  updateJobCardAssignment,
  deleteJobCardAssignment,
  type PartsReadyItem,
  type JobCardTemplate,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Formats a date string for display.
 */
function formatDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Parts Ready – Job Cards queue.
 * Shows all jobs with status "Parts Ready". Admins can assign a job card template,
 * notify the technician, and see when they started or submitted.
 */
export function PartsReadyJobCards() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<PartsReadyItem[]>([]);
  const [templates, setTemplates] = useState<JobCardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = isSuperAdmin || hasPermission('job_card_templates.read');

  /**
   * Loads Parts Ready jobs and job card templates.
   */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [partsRes, templatesRes] = await Promise.all([
        getPartsReadyJobs(),
        getJobCardTemplates(),
      ]);
      setItems(partsRes.items || []);
      setTemplates(templatesRes.templates || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Parts Ready jobs');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * Opens the assign-template modal for a job.
   */
  const openAssign = (jobId: string) => {
    setAssigningJobId(jobId);
    setSelectedTemplateId(templates[0]?._id ?? '');
  };

  /**
   * Assigns the selected template to the job and closes the modal.
   */
  const handleAssign = async () => {
    if (!assigningJobId || !selectedTemplateId) return;
    try {
      await createJobCardAssignment({
        jobId: assigningJobId,
        templateId: selectedTemplateId,
      });
      setAssigningJobId(null);
      setSelectedTemplateId('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to assign template');
    }
  };

  /**
   * Marks the assignment as notified (sets notifiedAt). No in-app notification or email is sent.
   */
  const handleNotify = async (assignmentId: string) => {
    setNotifyingId(assignmentId);
    try {
      await updateJobCardAssignment(assignmentId, { notifyTechnician: true });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to notify technician');
    } finally {
      setNotifyingId(null);
    }
  };

  /**
   * Removes an assignment (soft delete).
   */
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('Remove this job card assignment? The technician will no longer see it as assigned.')) return;
    setRemovingId(assignmentId);
    try {
      await deleteJobCardAssignment(assignmentId);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to remove assignment');
    } finally {
      setRemovingId(null);
    }
  };

  const customerName = (job: PartsReadyItem['job']) => {
    const c = job.customer as any;
    if (c?.name) return c.name;
    if (job.cashCustomer) return job.cashCustomer;
    return '—';
  };

  const technicianNames = (job: PartsReadyItem['job']) => {
    const bookings = job.bookings || [];
    if (bookings.length === 0) return '—';
    return bookings
      .map((b) => b.technicianName || b.technicianId || '')
      .filter(Boolean)
      .join(', ') || '—';
  };

  const statusLabel = (item: PartsReadyItem) => {
    if (item.submission) return 'Submitted';
    if (item.assignment?.status === 'started') return 'In progress';
    if (item.assignment?.status === 'assigned') return 'Not started';
    return '—';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-amber-500" />
            Parts Ready – Job Cards
          </h1>
          <p className="text-gray-600 mt-1">
            Jobs with status &quot;Parts Ready&quot;. Assign a job card template and mark when the technician was notified (no in-app or email notifications are sent).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center text-gray-600">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No jobs with status &quot;Parts Ready&quot; right now.</p>
          <p className="text-sm mt-1">When jobs move to Parts Ready, they will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Job #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Technician(s)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Template</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Notified</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Submitted</th>
                  {canManage && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const job = item.job as any;
                  const jobId = job._id ?? job.id;
                  const assignment = item.assignment;
                  const submission = item.submission;
                  const templateName = assignment?.template?.name ?? (assignment?.template as any)?.name ?? '—';
                  return (
                    <tr
                      key={jobId}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs?job=${jobId}`)}
                          className="text-amber-600 hover:underline font-medium"
                        >
                          {job.jobNumber || jobId}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{customerName(item.job)}</td>
                      <td className="py-3 px-4 text-gray-600">{technicianNames(item.job)}</td>
                      <td className="py-3 px-4">{templateName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            submission
                              ? 'text-green-700 font-medium'
                              : assignment?.status === 'started'
                                ? 'text-amber-700'
                                : 'text-gray-600'
                          }
                        >
                          {statusLabel(item)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {assignment?.notifiedAt
                          ? formatDate(assignment.notifiedAt)
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {submission ? (
                          <span className="text-green-700">
                            {formatDate(submission.submittedAt)}
                            {submission.reportNumber && (
                              <span className="text-gray-500 ml-1">#{submission.reportNumber}</span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {!assignment ? (
                              <button
                                type="button"
                                onClick={() => openAssign(jobId)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-500 text-amber-700 hover:bg-amber-50 text-xs font-medium"
                              >
                                <Plus className="w-3 h-3" />
                                Assign
                              </button>
                            ) : (
                              <>
                                {!assignment.notifiedAt && (
                                  <button
                                    type="button"
                                    onClick={() => handleNotify(assignment._id)}
                                    disabled={notifyingId === assignment._id}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-400 text-gray-700 hover:bg-gray-100 text-xs font-medium disabled:opacity-50"
                                    title="Record that the technician was notified (no message or email is sent)"
                                  >
                                    <Bell className="w-3 h-3" />
                                    {notifyingId === assignment._id ? 'Saving…' : 'Mark notified'}
                                  </button>
                                )}
                                {submission && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/job-card-submissions?submission=${submission._id}`)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-400 text-gray-700 hover:bg-gray-100 text-xs font-medium"
                                    title="View submission"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignment(assignment._id)}
                                  disabled={removingId === assignment._id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium disabled:opacity-50"
                                  title="Remove assignment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign template modal */}
      {assigningJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Assign job card template</h2>
              <button
                type="button"
                onClick={() => setAssigningJobId(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select a template to assign to this job. The technician can then be notified to complete it.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
            >
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningJobId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-600 flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
