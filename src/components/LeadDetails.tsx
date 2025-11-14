import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getJob, updateJob, type Job, type Status, type Branch } from '../lib/api';
import {
  X,
  Calendar,
  User,
  Building2,
  Banknote,
  FileText,
  Edit,
  Save,
  Tag,
  Package,
  Receipt,
  MessageSquare,
} from 'lucide-react';

interface LeadDetailsProps {
  lead: Job;
  statuses: Status[];
  branches: Branch[];
  adminCodes?: string[];
  onClose: () => void;
  onUpdate: () => void;
}

/**
 * Displays detailed information about a job and allows editing.
 * Shows all job fields including the newly added ones.
 */
export function LeadDetails({ lead: initialLead, statuses, branches, adminCodes = [], onClose, onUpdate }: LeadDetailsProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [job, setJob] = useState<Job>(initialLead);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobDetails();
  }, [initialLead._id]);

  async function loadJobDetails() {
    try {
      const response = await getJob(initialLead._id);
      setJob(response.job);
    } catch (err: any) {
      console.error('Error loading job details:', err);
      setError(err.message || 'Failed to load job details');
    }
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await updateJob(job._id, job);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update job');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Super admin and admin users can edit
  const canEdit = isAdmin || isSuperAdmin;

  // Debug logging
  useEffect(() => {
    console.log('LeadDetails - isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, 'canEdit:', canEdit, 'isEditing:', isEditing);
  }, [isAdmin, isSuperAdmin, canEdit, isEditing]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-1">{job.jobNumber}</h3>
              <p className="text-white/90 text-sm">Job Details</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditing) {
                    handleSave();
                  } else {
                    setIsEditing(true);
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save'}
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    Edit
                  </>
                )}
              </button>
              {isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(false);
                    loadJobDetails(); // Reload to reset changes
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                  type="button"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }} 
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Basic Information</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Status</label>
                  {isEditing ? (
                    <select
                      value={job.status?._id || ''}
                      onChange={(e) => {
                        const status = statuses.find(s => s._id === e.target.value);
                        setJob({ ...job, status: status ? { _id: status._id, name: status.name, sortOrder: status.sortOrder } : undefined });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      {statuses.map((status) => (
                        <option key={status._id} value={status._id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.status?.name || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Branch</label>
                  {isEditing ? (
                    <select
                      value={job.branch._id}
                      onChange={(e) => {
                        const branch = branches.find(b => b._id === e.target.value);
                        if (branch) {
                          setJob({ ...job, branch: { _id: branch._id, name: branch.name } });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    >
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.branch?.name || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Customer</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl">
                    <span className="text-ars-heading">{job.customer?.name || '-'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Cash Customer</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.cashCustomer || ''}
                      onChange={(e) => setJob({ ...job, cashCustomer: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      placeholder="Enter cash customer name"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.cashCustomer || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Admin (ADM)</label>
                  {isEditing ? (
                    adminCodes.length > 0 ? (
                      <select
                        value={job.adm || ''}
                        onChange={(e) => setJob({ ...job, adm: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">Select Admin</option>
                        {adminCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={job.adm || ''}
                        onChange={(e) => setJob({ ...job, adm: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                        placeholder="Enter admin code"
                      />
                    )
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.adm || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Value (ex VAT)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={job.valueExVat || ''}
                      onChange={(e) => setJob({ ...job, valueExVat: parseFloat(e.target.value) || undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading font-medium">{job.valueExVat ? `R${job.valueExVat.toLocaleString()}` : '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Technician</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl">
                    <span className="text-ars-heading">{job.techBooked?.name || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Dates</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Start Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={job.startDate ? (typeof job.startDate === 'string' ? job.startDate.split('T')[0] : new Date(job.startDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setJob({ ...job, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.startDate)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Date Quoted</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={job.dateQuoted ? (typeof job.dateQuoted === 'string' ? job.dateQuoted.split('T')[0] : new Date(job.dateQuoted).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setJob({ ...job, dateQuoted: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.dateQuoted)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Register Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={job.registerDate ? (typeof job.registerDate === 'string' ? job.registerDate.split('T')[0] : new Date(job.registerDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setJob({ ...job, registerDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.registerDate)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Date Booked</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={job.dateBooked ? (typeof job.dateBooked === 'string' ? job.dateBooked.split('T')[0] : new Date(job.dateBooked).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setJob({ ...job, dateBooked: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.dateBooked)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">PO Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={job.poDate ? (typeof job.poDate === 'string' ? job.poDate.split('T')[0] : new Date(job.poDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setJob({ ...job, poDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.poDate)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Invoice Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={job.invoiceDate ? (typeof job.invoiceDate === 'string' ? job.invoiceDate.split('T')[0] : new Date(job.invoiceDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setJob({ ...job, invoiceDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.invoiceDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Additional Information</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Rep Code</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl">
                    <span className="text-ars-heading">{job.repCode?.code || '-'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">RSR #</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.rsrNumber || ''}
                      onChange={(e) => setJob({ ...job, rsrNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.rsrNumber || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">PO Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.poNumber || ''}
                      onChange={(e) => setJob({ ...job, poNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.poNumber || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Oil Sample #</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.oilSampleNumber || ''}
                      onChange={(e) => setJob({ ...job, oilSampleNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.oilSampleNumber || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Store Pack</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.storePack || ''}
                      onChange={(e) => setJob({ ...job, storePack: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.storePack || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Inv #</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.invNumber || ''}
                      onChange={(e) => setJob({ ...job, invNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.invNumber || '-'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Description & Feedback</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl">
                    <span className="text-ars-heading">{job.description?.name || '-'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Feedback</label>
                  {isEditing ? (
                    <textarea
                      rows={6}
                      value={job.feedback || ''}
                      onChange={(e) => setJob({ ...job, feedback: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent resize-none"
                      placeholder="Enter feedback..."
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl min-h-[100px]">
                      <span className="text-ars-heading whitespace-pre-wrap">{job.feedback || '-'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Statuses */}
          {(job.followUp1 || job.followUp2 || job.followUp3 || job.followUp4) && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Follow-up Statuses</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {job.followUp1 && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 1</p>
                    <p className="text-sm text-slate-900">{job.followUp1.name}</p>
                  </div>
                )}
                {job.followUp2 && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 2</p>
                    <p className="text-sm text-slate-900">{job.followUp2.name}</p>
                  </div>
                )}
                {job.followUp3 && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 3</p>
                    <p className="text-sm text-slate-900">{job.followUp3.name}</p>
                  </div>
                )}
                {job.followUp4 && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 4</p>
                    <p className="text-sm text-slate-900">{job.followUp4.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
