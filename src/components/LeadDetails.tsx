import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getJob, updateJob, getMachinesByCustomer, createMachine, type Job, type Status, type Branch, type Machine } from '../lib/api';
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
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showNewMachineForm, setShowNewMachineForm] = useState(false);
  const [newMachine, setNewMachine] = useState({
    make: '',
    model: '',
    serialNumber: '',
    machineHours: '',
    nextServiceHours: '',
  });
  const [creatingMachine, setCreatingMachine] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [initialLead._id]);

  // Load machines when job has a customer
  useEffect(() => {
    if (job.customer && typeof job.customer === 'object' && job.customer._id) {
      loadMachines(job.customer._id);
    } else {
      setMachines([]);
    }
  }, [job.customer]);

  async function loadJobDetails() {
    try {
      const response = await getJob(initialLead._id);
      setJob(response.job);
    } catch (err: any) {
      console.error('Error loading job details:', err);
      setError(err.message || 'Failed to load job details');
    }
  }

  async function loadMachines(customerId: string) {
    try {
      const response = await getMachinesByCustomer(customerId);
      setMachines(response.machines || []);
    } catch (err: any) {
      console.error('Error loading machines:', err);
      setMachines([]);
    }
  }

  async function handleCreateMachine() {
    if (!job.customer || typeof job.customer !== 'object' || !job.customer._id) {
      setError('Customer is required to create a machine');
      return;
    }

    if (!newMachine.make.trim() || !newMachine.model.trim() || !newMachine.serialNumber.trim()) {
      setError('Make, Model, and Serial Number are required');
      return;
    }

    setCreatingMachine(true);
    setError(null);
    try {
      const response = await createMachine({
        make: newMachine.make.trim(),
        model: newMachine.model.trim(),
        serialNumber: newMachine.serialNumber.trim(),
        customer: job.customer._id,
        machineHours: parseFloat(newMachine.machineHours) || 0,
        nextServiceHours: parseFloat(newMachine.nextServiceHours) || 0,
      });

      // Add new machine to list and add it to job's machines array
      const updatedMachines = [...machines, response.machine];
      setMachines(updatedMachines);
      const currentMachines = Array.isArray(job.machines) ? job.machines : [];
      const machineIds = currentMachines.map(m => typeof m === 'object' && m !== null ? m._id : m).filter(Boolean);
      setJob({ ...job, machines: [...machineIds, response.machine._id] });
      setNewMachine({
        make: '',
        model: '',
        serialNumber: '',
        machineHours: '',
        nextServiceHours: '',
      });
      setShowNewMachineForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create machine');
    } finally {
      setCreatingMachine(false);
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

          {/* Machines Section - Full Width Block */}
          {job.customer && typeof job.customer === 'object' && job.customer._id && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Machines</h3>
              {isEditing ? (
                <div className="space-y-3">
                  {/* Display selected machines */}
                  {Array.isArray(job.machines) && job.machines.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {job.machines.map((machineRef, index) => {
                        const machine = typeof machineRef === 'object' && machineRef !== null
                          ? machineRef
                          : machines.find(m => m._id === machineRef);
                        if (!machine) return null;
                        return (
                          <div key={machine._id || index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-ars-heading">
                                {machine.make} {machine.model}
                              </div>
                              <div className="text-xs text-ars-body mt-1">
                                Serial: {machine.serialNumber} • Hours: {machine.machineHours.toLocaleString()} • Next: {machine.nextServiceHours.toLocaleString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedMachines = job.machines?.filter((m) => {
                                  const mId = typeof m === 'object' && m !== null ? m._id : m;
                                  const refId = typeof machineRef === 'object' && machineRef !== null ? machineRef._id : machineRef;
                                  return mId !== refId;
                                }) || [];
                                setJob({ ...job, machines: updatedMachines });
                              }}
                              className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Add machine dropdown and button - Always visible */}
                  <div className="flex gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const currentMachines = Array.isArray(job.machines) ? job.machines : [];
                          const machineIds = currentMachines.map(m => typeof m === 'object' && m !== null ? m._id : m).filter(Boolean);
                          if (!machineIds.includes(e.target.value)) {
                            setJob({ ...job, machines: [...machineIds, e.target.value] });
                          }
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                    >
                      <option value="">Select Machine to Add</option>
                      {machines
                        .filter(m => {
                          if (!m.isActive) return false;
                          const currentMachines = Array.isArray(job.machines) ? job.machines : [];
                          const machineIds = currentMachines.map(m => typeof m === 'object' && m !== null ? m._id : m).filter(Boolean);
                          return !machineIds.includes(m._id);
                        })
                        .map((machine) => (
                          <option key={machine._id} value={machine._id}>
                            {machine.make} {machine.model} - {machine.serialNumber} ({machine.machineHours} hrs)
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewMachineForm(!showNewMachineForm)}
                      className="px-4 py-3 bg-ars-primary text-white rounded-xl hover:bg-ars-primary/90 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {showNewMachineForm ? 'Cancel' : '+ New'}
                    </button>
                  </div>
                  
                  {/* New Machine Form */}
                  {showNewMachineForm && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="font-semibold text-ars-heading">Add New Machine</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Make *</label>
                          <input
                            type="text"
                            value={newMachine.make}
                            onChange={(e) => setNewMachine({ ...newMachine, make: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                            placeholder="e.g., Caterpillar"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Model *</label>
                          <input
                            type="text"
                            value={newMachine.model}
                            onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                            placeholder="e.g., CAT 320"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Serial Number *</label>
                          <input
                            type="text"
                            value={newMachine.serialNumber}
                            onChange={(e) => setNewMachine({ ...newMachine, serialNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                            placeholder="Serial number"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Machine Hours</label>
                          <input
                            type="number"
                            value={newMachine.machineHours}
                            onChange={(e) => setNewMachine({ ...newMachine, machineHours: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Next Service Hours</label>
                          <input
                            type="number"
                            value={newMachine.nextServiceHours}
                            onChange={(e) => setNewMachine({ ...newMachine, nextServiceHours: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateMachine}
                        disabled={creatingMachine}
                        className="w-full px-4 py-2 bg-ars-primary text-white rounded-lg hover:bg-ars-primary/90 transition-colors disabled:opacity-50"
                      >
                        {creatingMachine ? 'Creating...' : 'Create Machine'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.isArray(job.machines) && job.machines.length > 0 ? (
                    job.machines.map((machineRef, index) => {
                      const machine = typeof machineRef === 'object' && machineRef !== null
                        ? machineRef
                        : machines.find(m => m._id === machineRef);
                      if (!machine) return null;
                      return (
                        <div key={machine._id || index} className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="space-y-1">
                            <div className="text-ars-heading font-semibold">
                              {machine.make} {machine.model}
                            </div>
                            <div className="text-sm text-ars-body">
                              Serial: {machine.serialNumber}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-ars-body">
                              <span>Hours: <span className="font-medium">{machine.machineHours.toLocaleString()}</span></span>
                              <span>Next Service: <span className="font-medium">{machine.nextServiceHours.toLocaleString()}</span></span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">-</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
