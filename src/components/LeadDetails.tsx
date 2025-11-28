import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getJob, updateJob, getMachinesByCustomer, createMachine, getTechnicians, getRepCodes, getCustomers, getActivities, getServiceDescriptions, deleteJob, uploadRSRDocument, getRSRDocuments, getRSRDocumentUrl, deleteRSRDocument, createJobNote, getJobNotes, uploadJobNoteAttachment, getJobNoteAttachmentUrl, deleteJobNote, type Job, type Status, type Branch, type Machine, type Technician, type RepCode, type Customer, type Activity, type ServiceDescription, type OverdueJob, type JobRSRDocument, type JobNote, type JobNoteAttachment } from '../lib/api';
import { X, Edit, Save, Clock, User, Trash2, FileText, Paperclip, Upload, Download, Plus, ChevronDown, ChevronUp } from 'lucide-react';

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
function normalizeJob(jobData: Job): Job {
  let normalized: Job = { ...jobData };

  if (normalized?.techBooked && typeof normalized.techBooked === 'string') {
    normalized = {
      ...normalized,
      techBooked: {
        _id: normalized.techBooked,
        name: '',
      },
    };
  }

  if (normalized?.status && typeof normalized.status === 'string') {
    normalized = {
      ...normalized,
      status: {
        _id: normalized.status,
        name: '',
      },
    };
  }

  if (normalized?.repCode && typeof normalized.repCode === 'string') {
    normalized = {
      ...normalized,
      repCode: {
        _id: normalized.repCode,
        code: '',
      },
    };
  }

  return normalized;
}

export function LeadDetails({ lead: initialLead, statuses, branches, adminCodes = [], onClose, onUpdate }: LeadDetailsProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [job, setJob] = useState<Job>(normalizeJob(initialLead));
  const [error, setError] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showNewMachineForm, setShowNewMachineForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [newMachine, setNewMachine] = useState({
    machineType: '',
    make: '',
    model: '',
    serialNumber: '',
    machineHours: '',
    nextServiceHours: '',
  });
  const [creatingMachine, setCreatingMachine] = useState(false);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<ServiceDescription[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpReminder, setFollowUpReminder] = useState<OverdueJob | null>(null);
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [activeFollowUpLevel, setActiveFollowUpLevel] = useState<number | null>(null);
  const [rsrDocuments, setRsrDocuments] = useState<JobRSRDocument[]>([]);
  const [loadingRSR, setLoadingRSR] = useState(false);
  const [showRSRUpload, setShowRSRUpload] = useState(false);
  const [rsrTitle, setRsrTitle] = useState('');
  const [rsrVisibility, setRsrVisibility] = useState<'all' | 'private'>('all');
  const [rsrFile, setRsrFile] = useState<File | null>(null);
  const [uploadingRSR, setUploadingRSR] = useState(false);
  const [rsrDragActive, setRsrDragActive] = useState(false);
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesMinimized, setNotesMinimized] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'all' | 'private'>('all');
  const [noteAttachments, setNoteAttachments] = useState<JobNoteAttachment[]>([]);
  const [uploadingNote, setUploadingNote] = useState(false);

  useEffect(() => {
    loadJobDetails();
    loadTechnicians();
    loadRepCodes();
    loadCustomers();
    loadServiceDescriptions();
    loadActivityHistory();
    loadRSRDocuments();
    loadNotes();
  }, [initialLead._id]);

  // Reload activities when job is updated
  useEffect(() => {
    if (!isEditing) {
      loadActivityHistory();
    }
  }, [isEditing]);

  // Load machines when job has a customer or cash customer
  useEffect(() => {
    if (job.customer && typeof job.customer === 'object' && job.customer._id) {
      loadMachines(job.customer._id);
    } else if (job.cashCustomer && job.cashCustomer.trim()) {
      loadMachinesForCashCustomer(job.cashCustomer.trim());
    } else {
      setMachines([]);
    }
  }, [job.customer, job.cashCustomer]);

  async function loadJobDetails() {
    try {
      const response = await getJob(initialLead._id);
      const normalizedJob = normalizeJob(response.job);
      // Ensure bookings array exists
      if (!normalizedJob.bookings) {
        normalizedJob.bookings = [];
      }
      setJob(normalizedJob);
      if (response.reminder && response.reminder.followUpLevel) {
        setFollowUpReminder(response.reminder);
      } else {
        setFollowUpReminder(null);
      }
    } catch (err: any) {
      console.error('Error loading job details:', err);
      setError(err.message || 'Failed to load job details');
    }
  }

  /**
   * Loads machines for a regular customer.
   */
  async function loadMachines(customerId: string) {
    try {
      const response = await getMachinesByCustomer(customerId);
      setMachines(response.machines || []);
    } catch (err: any) {
      console.error('Error loading machines:', err);
      setMachines([]);
    }
  }

  /**
   * Loads machines for a cash customer.
   */
  async function loadMachinesForCashCustomer(cashCustomerName: string) {
    try {
      const response = await getMachinesByCustomer(undefined, cashCustomerName);
      setMachines(response.machines || []);
    } catch (err: any) {
      console.error('Error loading machines for cash customer:', err);
      setMachines([]);
    }
  }

  async function loadTechnicians() {
    try {
      const response = await getTechnicians();
      setTechnicians(response.technicians || []);
    } catch (err) {
      console.error('Error loading technicians:', err);
    }
  }

  async function loadRepCodes() {
    try {
      const response = await getRepCodes();
      setRepCodes(response.repCodes || []);
    } catch (err) {
      console.error('Error loading rep codes:', err);
    }
  }

  /**
   * Loads all customers for the dropdown.
   */
  async function loadCustomers() {
    try {
      const response = await getCustomers({ limit: 1000 });
      setCustomers(response.customers || []);
    } catch (err) {
      console.error('Error loading customers:', err);
      setCustomers([]);
    }
  }

  /**
   * Loads service descriptions for the dropdown.
   */
  async function loadServiceDescriptions() {
    try {
      const response = await getServiceDescriptions();
      setServiceDescriptions(response.descriptions || []);
    } catch (err) {
      console.error('Error loading service descriptions:', err);
      setServiceDescriptions([]);
    }
  }

  /**
   * Loads activity history for this job.
   */
  async function loadActivityHistory() {
    setLoadingActivities(true);
    try {
      const jobId = job._id || initialLead._id;
      if (!jobId) return;
      
      const response = await getActivities({
        resourceType: 'Job',
        resourceId: jobId,
        limit: 50,
        sortOrder: 'desc'
      });
      setActivities(response.activities || []);
    } catch (err) {
      console.error('Error loading activity history:', err);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }

  /**
   * Loads RSR documents for the current job.
   */
  async function loadRSRDocuments() {
    if (!job._id) return;
    setLoadingRSR(true);
    try {
      const documents = await getRSRDocuments(job._id);
      setRsrDocuments(documents);
    } catch (err: any) {
      console.error('Error loading RSR documents:', err);
    } finally {
      setLoadingRSR(false);
    }
  }

  /**
   * Handles uploading an RSR document.
   */
  async function handleUploadRSR() {
    if (!job._id || !rsrFile || !rsrTitle.trim()) {
      setError('Please provide a title and select a PDF file');
      return;
    }

    if (rsrFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed for RSR documents');
      return;
    }

    setUploadingRSR(true);
    setError(null);
    try {
      await uploadRSRDocument(job._id, rsrFile, rsrTitle.trim(), rsrVisibility);
      await loadRSRDocuments();
      setShowRSRUpload(false);
      setRsrTitle('');
      setRsrFile(null);
      setRsrVisibility('all');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to upload RSR document');
    } finally {
      setUploadingRSR(false);
    }
  }

  /**
   * Handles deleting an RSR document (super admin only).
   */
  async function handleDeleteRSR(documentId: string) {
    if (!window.confirm('Are you sure you want to delete this RSR document?')) return;

    try {
      await deleteRSRDocument(documentId);
      await loadRSRDocuments();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to delete RSR document');
    }
  }

  /**
   * Loads notes for the current job.
   */
  async function loadNotes() {
    if (!job._id) return;
    setLoadingNotes(true);
    try {
      const notesData = await getJobNotes(job._id);
      setNotes(notesData);
    } catch (err: any) {
      console.error('Error loading notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  }

  /**
   * Handles uploading an attachment for a note.
   */
  async function handleUploadNoteAttachment(file: File) {
    try {
      const attachment = await uploadJobNoteAttachment(file);
      setNoteAttachments(prev => [...prev, attachment]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment');
    }
  }

  /**
   * Handles creating a note.
   */
  async function handleCreateNote() {
    if (!job._id || !noteText.trim()) {
      setError('Please enter note text');
      return;
    }

    setUploadingNote(true);
    setError(null);
    try {
      const attachmentIds = noteAttachments.map(a => a._id);
      await createJobNote(job._id, noteText.trim(), noteVisibility, attachmentIds);
      await loadNotes();
      setShowNoteForm(false);
      setNoteText('');
      setNoteAttachments([]);
      setNoteVisibility('all');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to create note');
    } finally {
      setUploadingNote(false);
    }
  }

  /**
   * Handles deleting a note (super admin only).
   */
  async function handleDeleteNote(noteId: string) {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteJobNote(noteId);
      await loadNotes();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
    }
  }

  /**
   * Handles marking a follow-up level as completed and refreshes the job details.
   *
   * @param level - Follow-up stage to complete (1, 2, or 3)
   */
  async function handleFollowUpCompletion(level: number) {
    if (!job?._id) return;
    setFollowUpSubmitting(true);
    setActiveFollowUpLevel(level);
    setError(null);

    try {
      const payloadKey = `followUp${level}Date` as const;
      await updateJob(job._id, {
        [payloadKey]: new Date().toISOString(),
      } as Partial<Job>);
      await loadJobDetails();
      onUpdate();
    } catch (err: any) {
      console.error('Error completing follow-up:', err);
      setError(err.message || `Failed to mark Follow-up ${level} as completed.`);
    } finally {
      setFollowUpSubmitting(false);
      setActiveFollowUpLevel(null);
    }
  }

  /**
   * Handles selecting a customer from the dropdown. Clears machines and loads new ones for the selected customer.
   */
  async function handleCustomerSelect(customerId: string) {
    if (!customerId) {
      // If no customer selected, clear customer and machines
      setJob({ 
        ...job, 
        customer: undefined,
        machines: []
      });
      setMachines([]);
      return;
    }

    const selectedCustomer = customers.find(c => c._id === customerId);
    if (!selectedCustomer) return;

    setJob({ 
      ...job, 
      customer: { _id: selectedCustomer._id, name: selectedCustomer.name },
      cashCustomer: undefined, // Clear cash customer when selecting regular customer
      machines: [] // Reset machines when customer changes
    });
    
    // Load machines for this customer
    try {
      const machinesData = await getMachinesByCustomer(selectedCustomer._id);
      setMachines(machinesData.machines || []);
    } catch (err) {
      console.error('Error loading machines:', err);
      setMachines([]);
    }
  }

  /**
   * Handles creating a new machine for either a regular customer or cash customer.
   */
  async function handleCreateMachine() {
    const hasCustomer = job.customer && typeof job.customer === 'object' && job.customer._id;
    const hasCashCustomer = job.cashCustomer && job.cashCustomer.trim();

    if (!hasCustomer && !hasCashCustomer) {
      setError('Customer or cash customer is required to create a machine');
      return;
    }

    if (!newMachine.make.trim() || !newMachine.model.trim() || !newMachine.serialNumber.trim()) {
      setError('Make, Model, and Serial Number are required');
      return;
    }

    setCreatingMachine(true);
    setError(null);
    try {
      if (editingMachine) {
        // Update existing machine
        const updatedData = {
          make: newMachine.make.trim(),
          model: newMachine.model.trim(),
          serialNumber: newMachine.serialNumber.trim(),
          machineHours: parseFloat(newMachine.machineHours) || 0,
          nextServiceHours: parseFloat(newMachine.nextServiceHours) || 0,
        };
        
        const response = await updateMachine(editingMachine._id, updatedData);
        
        // Update machine in list
        const updatedMachines = machines.map(m => 
          m._id === editingMachine._id ? response.machine : m
        );
        setMachines(updatedMachines);
        
        // Update machine in job's machines array if it's there
        const currentMachines = Array.isArray(job.machines) ? job.machines : [];
        const updatedJobMachines = currentMachines.map(m => {
          if (typeof m === 'object' && m !== null && m._id === editingMachine._id) {
            return response.machine;
          }
          return m;
        });
        setJob({ ...job, machines: updatedJobMachines });
        
        setEditingMachine(null);
      } else {
        // Create new machine
        const machineData: any = {
          make: newMachine.make.trim(),
          model: newMachine.model.trim(),
          serialNumber: newMachine.serialNumber.trim(),
          machineHours: parseFloat(newMachine.machineHours) || 0,
          nextServiceHours: parseFloat(newMachine.nextServiceHours) || 0,
        };

        if (hasCustomer && job.customer && typeof job.customer === 'object') {
          machineData.customer = job.customer._id;
        } else if (hasCashCustomer && job.cashCustomer) {
          machineData.cashCustomer = job.cashCustomer.trim();
        }

        const response = await createMachine(machineData);

        // Add new machine to list and add it to job's machines array
        const updatedMachines = [...machines, response.machine];
        setMachines(updatedMachines);
        const currentMachines = Array.isArray(job.machines) ? job.machines : [];
        const machineIds = currentMachines.map(m => typeof m === 'object' && m !== null ? m._id : m).filter(Boolean);
        setJob({ ...job, machines: [...machineIds, response.machine._id] });
      }
      
      setNewMachine({
        machineType: '',
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

  /**
   * Handles saving the job with all updates including machines.
   * Ensures empty dates are properly sent as null/undefined to clear them.
   */
  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const payload: any = { ...job };
      if (payload.techBooked && typeof payload.techBooked === 'object') {
        payload.techBooked = payload.techBooked._id;
      }
      if (payload.status && typeof payload.status === 'object') {
        payload.status = payload.status._id;
      }
      if (payload.repCode && typeof payload.repCode === 'object') {
        payload.repCode = payload.repCode._id;
      }
      // Serialize description to ID if it's an object
      if (payload.description && typeof payload.description === 'object') {
        payload.description = payload.description._id;
      }
      // If description is cleared, set to null
      if (!payload.description) {
        payload.description = null;
      }
      // Serialize machines array to IDs only
      if (Array.isArray(payload.machines)) {
        payload.machines = payload.machines.map((m: any) => 
          typeof m === 'object' && m !== null ? m._id : m
        ).filter(Boolean);
      }
      // Explicitly handle date fields - ensure undefined/null dates are sent as null to clear them
      const dateFields = ['startDate', 'registerDate', 'dateBooked', 'dateQuoted', 'poDate', 'invoiceDate'];
      dateFields.forEach(field => {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
          payload[field] = null;
        }
      });
      // Handle customer - serialize to ID if it's an object
      if (payload.customer && typeof payload.customer === 'object') {
        payload.customer = payload.customer._id;
      }
      // If customer is cleared, set to null
      if (!payload.customer) {
        payload.customer = null;
      }
      // If cash customer is set, clear regular customer
      if (payload.cashCustomer && payload.cashCustomer.trim()) {
        payload.customer = null;
      } else if (payload.customer) {
        payload.cashCustomer = null;
      }
      // Include bookings array (ensure it's properly formatted)
      if (payload.bookings && Array.isArray(payload.bookings)) {
        payload.bookings = payload.bookings.map((b: any) => ({
          technicianId: b.technicianId,
          startDate: b.startDate,
          endDate: b.endDate,
          startTime: b.startTime,
          endTime: b.endTime,
          location: b.location,
          notes: b.notes
        }));
        console.log('Sending bookings to API:', payload.bookings);
      } else {
        console.log('No bookings in payload or not an array:', payload.bookings);
      }
      console.log('Full payload being sent:', payload);
      const response = await updateJob(job._id, payload);
      console.log('Update job response:', response);
      
      // Update local job state with the response which includes bookings
      if (response?.job) {
        const normalizedJob = normalizeJob(response.job);
        if (!normalizedJob.bookings) {
          normalizedJob.bookings = [];
        }
        setJob(normalizedJob);
        console.log('Job state updated with bookings:', normalizedJob.bookings);
      }
      
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update job');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles deleting the job.
   */
  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteJob(job._id);
      setShowDeleteConfirm(false);
      onUpdate(); // Refresh the job list
      onClose(); // Close the details modal
    } catch (err: any) {
      setError(err.message || 'Failed to delete job');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
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
              {canEdit && (
                <>
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
                  {isSuperAdmin && !isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      disabled={loading || deleting}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-red-100 hover:text-white"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Job
                    </button>
                  )}
                </>
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

        {followUpReminder?.followUpLevel && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Follow-up {followUpReminder.followUpLevel} {followUpReminder.isOverdue ? 'is overdue' : 'is due soon'}.
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Expected next status: {followUpReminder.expectedNextStatus}. Days in current stage: {followUpReminder.daysInStatus}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFollowUpCompletion(followUpReminder.followUpLevel!)}
              disabled={followUpSubmitting}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {followUpSubmitting && activeFollowUpLevel === followUpReminder.followUpLevel ? 'Saving…' : `Follow Up ${followUpReminder.followUpLevel}`}
            </button>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                  {isEditing && (isAdmin || isSuperAdmin) ? (
                    <select
                      value={job.customer && typeof job.customer === 'object' ? job.customer._id : ''}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    >
                      <option value="">Select Customer</option>
                      {customers && customers.length > 0 ? (
                        customers.map((customer) => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading customers...</option>
                      )}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.customer?.name || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Cash Customer</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.cashCustomer || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setJob({ 
                          ...job, 
                          cashCustomer: newValue,
                          customer: newValue.trim() ? undefined : job.customer, // Clear regular customer if cash customer is set
                          machines: newValue.trim() ? [] : job.machines // Clear machines if switching to cash customer
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading font-medium">{job.valueExVat ? `R${job.valueExVat.toLocaleString()}` : '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Technician Bookings</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {(job.bookings || []).map((booking, idx) => (
                        <div key={idx} className="flex gap-2 items-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={booking.technicianId || ''}
                            onChange={e => {
                              const updated = [...(job.bookings || [])];
                              updated[idx].technicianId = e.target.value;
                              setJob({ ...job, bookings: updated });
                            }}
                            onClick={e => e.stopPropagation()}
                            onFocus={e => e.stopPropagation()}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-shrink-0"
                          >
                            <option value="">Select Technician</option>
                            {technicians.map(tech => (
                              <option key={tech._id} value={tech._id}>{tech.name}</option>
                            ))}
                          </select>
                          <label className="text-xs text-gray-600 flex-shrink-0">From:</label>
                          <input
                            type="date"
                            value={booking.startDate ? booking.startDate.split('T')[0] : ''}
                            onChange={e => {
                              const updated = [...(job.bookings || [])];
                              updated[idx].startDate = e.target.value;
                              setJob({ ...job, bookings: updated });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <label className="text-xs text-gray-600 flex-shrink-0">To:</label>
                          <input
                            type="date"
                            value={booking.endDate ? booking.endDate.split('T')[0] : ''}
                            onChange={e => {
                              const updated = [...(job.bookings || [])];
                              updated[idx].endDate = e.target.value;
                              setJob({ ...job, bookings: updated });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40"
                          />
                          <button 
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Remove button clicked for booking index:', idx);
                              const updated = (job.bookings || []).filter((_, i) => i !== idx);
                              setJob({ ...job, bookings: updated });
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex-shrink-0 cursor-pointer"
                            style={{ pointerEvents: 'auto', zIndex: 10 }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                        setJob({ ...job, bookings: [...(job.bookings || []), { technicianId: '', startDate: '', endDate: '' }] });
                      }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Add Booking</button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      {(job.bookings || []).length > 0 ? (
                        <ul className="space-y-1">
                          {job.bookings.map((booking, idx) => {
                            const tech = technicians.find(t => t._id === booking.technicianId);
                            const startDate = booking.startDate ? booking.startDate.split('T')[0] : '';
                            const endDate = booking.endDate ? booking.endDate.split('T')[0] : '';
                            return (
                              <li key={idx} className="text-ars-heading">
                                <span className="font-medium">{tech?.name || 'Unknown'}</span> - {startDate} to {endDate}
                              </li>
                            );
                          })}
                        </ul>
                      ) : <span className="text-ars-heading">No bookings</span>}
                    </div>
                  )}
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{formatDate(job.registerDate)}</span>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                  {isEditing ? (
                    <select
                      value={
                        typeof job.repCode === 'string'
                          ? job.repCode
                          : job.repCode?._id || ''
                      }
                      onChange={(e) => {
                        const selectedId = e.target.value || '';
                        if (!selectedId) {
                          setJob({ ...job, repCode: undefined });
                          return;
                        }
                        const rep = repCodes.find((code) => code._id === selectedId);
                        setJob({
                          ...job,
                          repCode: rep
                            ? { _id: rep._id, code: rep.code }
                            : {
                                _id: selectedId,
                                code: '',
                              },
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    >
                      <option value="">Select Rep Code</option>
                      {repCodes.length > 0 ? (
                        repCodes
                          .filter((code) => code.isActive && code.dbStatus !== 'deleted')
                          .map((code) => (
                            <option key={code._id} value={code._id}>
                              {code.code} {code.description ? `- ${code.description}` : ''}
                            </option>
                          ))
                      ) : (
                        <option value="" disabled>
                          Loading rep codes...
                        </option>
                      )}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.repCode?.code || '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">RSR #</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={job.rsrNumber || ''}
                      onChange={(e) => setJob({ ...job, rsrNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
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
                  {isEditing && (isAdmin || isSuperAdmin) ? (
                    <select
                      value={job.description && typeof job.description === 'object' ? job.description._id : (typeof job.description === 'string' ? job.description : '')}
                      onChange={(e) => {
                        const selectedId = e.target.value || '';
                        if (!selectedId) {
                          setJob({ ...job, description: undefined });
                          return;
                        }
                        const selectedDescription = serviceDescriptions.find((desc) => desc._id === selectedId);
                        setJob({
                          ...job,
                          description: selectedDescription ? { _id: selectedDescription._id, name: selectedDescription.name } : undefined,
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    >
                      <option value="">Select Description</option>
                      {serviceDescriptions && serviceDescriptions.length > 0 ? (
                        serviceDescriptions.map((desc) => (
                          <option key={desc._id} value={desc._id}>
                            {desc.name}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading descriptions...</option>
                      )}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-ars-heading">{job.description?.name || '-'}</span>
                    </div>
                  )}
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
          {((job.customer && typeof job.customer === 'object' && job.customer._id) || (job.cashCustomer && job.cashCustomer.trim())) && (
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
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMachine(machine);
                                  setNewMachine({
                                    machineType: machine.machineType || '',
                                    make: machine.make || '',
                                    model: machine.model || '',
                                    serialNumber: machine.serialNumber || '',
                                    machineHours: machine.machineHours || 0,
                                    nextServiceHours: machine.nextServiceHours || 0,
                                  });
                                  setShowNewMachineForm(true);
                                }}
                                className="px-2 py-1 text-ars-primary hover:bg-blue-50 rounded transition-colors"
                              >
                                Edit
                              </button>
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
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
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
                      onClick={() => {
                        setEditingMachine(null);
                        setNewMachine({
                          machineType: '',
                          make: '',
                          model: '',
                          serialNumber: '',
                          machineHours: '',
                          nextServiceHours: '',
                        });
                        setShowNewMachineForm(!showNewMachineForm);
                      }}
                      className="px-4 py-3 bg-ars-primary text-white rounded-xl hover:bg-ars-primary/90 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {showNewMachineForm ? 'Cancel' : '+ New'}
                    </button>
                  </div>
                  
                  {/* New Machine Form */}
                  {showNewMachineForm && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <h4 className="font-semibold text-ars-heading">{editingMachine ? 'Edit Machine' : 'Add New Machine'}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-ars-body mb-1">Machine Type *</label>
                          <select
                            value={newMachine.machineType}
                            onChange={e => setNewMachine({ ...newMachine, machineType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                          >
                            <option value="">Select type</option>
                            <option value="Generator">Generator</option>
                            <option value="Genset">Genset</option>
                            <option value="Compressor oil free">Compressor oil free</option>
                            <option value="Compressor oil injection">Compressor oil injection</option>
                            <option value="Diesel reciprocating compressor">Diesel reciprocating compressor</option>
                            <option value="Dryer">Dryer</option>
                            <option value="Blower">Blower</option>
                            <option value="Vacuum pump">Vacuum pump</option>
                          </select>
                        </div>
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
                        {creatingMachine ? (editingMachine ? 'Updating...' : 'Creating...') : (editingMachine ? 'Update Machine' : 'Create Machine')}
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

          {/* Follow-up Dates */}
          {(job.followUp1Date || job.followUp2Date || job.followUp3Date || job.followUp4Date) && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Follow-up Dates</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {job.followUp1Date && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 1</p>
                    <p className="text-sm text-slate-900">{formatDate(job.followUp1Date)}</p>
                  </div>
                )}
                {job.followUp2Date && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 2</p>
                    <p className="text-sm text-slate-900">{formatDate(job.followUp2Date)}</p>
                  </div>
                )}
                {job.followUp3Date && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 3</p>
                    <p className="text-sm text-slate-900">{formatDate(job.followUp3Date)}</p>
                  </div>
                )}
                {job.followUp4Date && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Follow-up 4</p>
                    <p className="text-sm text-slate-900">{formatDate(job.followUp4Date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RSR Documents Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                RSR Documents {rsrDocuments.length > 0 && <span className="text-sm font-normal text-gray-500">({rsrDocuments.length})</span>}
              </h3>
              {isEditing && (
                <button
                  onClick={() => setShowRSRUpload(!showRSRUpload)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  type="button"
                >
                  <Upload className="w-4 h-4" />
                  Upload RSR
                </button>
              )}
            </div>

            {showRSRUpload && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={rsrTitle}
                      onChange={(e) => setRsrTitle(e.target.value)}
                      placeholder="Enter RSR document title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      PDF File <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                        rsrDragActive
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                      }`}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRsrDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRsrDragActive(false);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRsrDragActive(false);
                        
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          if (file.type === 'application/pdf') {
                            setRsrFile(file);
                          } else {
                            setError('Only PDF files are allowed for RSR documents');
                          }
                        }
                      }}
                    >
                      <div className="text-center">
                        <Upload className={`mx-auto h-10 w-10 mb-3 ${rsrDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        <div className="flex text-sm text-gray-600 justify-center items-center gap-1">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 px-2 py-1">
                            <span>Click to upload</span>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.type === 'application/pdf') {
                                    setRsrFile(file);
                                  } else {
                                    setError('Only PDF files are allowed for RSR documents');
                                  }
                                }
                              }}
                              className="sr-only"
                            />
                          </label>
                          <span>or drag and drop</span>
                        </div>
                        {rsrFile && (
                          <p className="text-sm text-gray-700 mt-2 font-medium">
                            Selected: {rsrFile.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">PDF files only</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Visibility
                    </label>
                    <select
                      value={rsrVisibility}
                      onChange={(e) => setRsrVisibility(e.target.value as 'all' | 'private')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Show to everyone</option>
                      <option value="private">Show to me and super admin only</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUploadRSR}
                      disabled={uploadingRSR || !rsrTitle.trim() || !rsrFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      type="button"
                    >
                      {uploadingRSR ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRSRUpload(false);
                        setRsrTitle('');
                        setRsrFile(null);
                        setRsrVisibility('all');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingRSR ? (
              <div className="text-center py-8 text-gray-500">Loading RSR documents...</div>
            ) : rsrDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm">No RSR documents uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">At least one RSR document is required before sending to invoice</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rsrDocuments.map((doc) => {
                  const uploadedBy = typeof doc.uploadedBy === 'object' ? doc.uploadedBy : null;
                  
                  return (
                    <div key={doc._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">{doc.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            doc.visibility === 'private' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {doc.visibility === 'private' ? 'Private' : 'All'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 ml-7">
                          {uploadedBy && `${uploadedBy.firstName} ${uploadedBy.lastName}`} • {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={getRSRDocumentUrl(doc._id)}
                          download={doc.originalName}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteRSR(doc._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                  Notes {notes.length > 0 && <span className="text-sm font-normal text-gray-500">({notes.length})</span>}
                </h3>
                <button
                  onClick={() => setNotesMinimized(!notesMinimized)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  type="button"
                  title={notesMinimized ? 'Expand Notes' : 'Minimize Notes'}
                >
                  {notesMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
              {isEditing && !notesMinimized && (
                <button
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Add Note
                </button>
              )}
            </div>

            {!notesMinimized && showNoteForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Note Text <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Enter your note..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Attachments (Optional)
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            Array.from(e.target.files).forEach(file => handleUploadNoteAttachment(file));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {noteAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {noteAttachments.map((att) => (
                            <div key={att._id} className="flex items-center gap-2 text-sm text-gray-600 bg-white p-2 rounded border">
                              <Paperclip className="w-4 h-4" />
                              <span className="flex-1 truncate">{att.originalName}</span>
                              <button
                                onClick={() => setNoteAttachments(prev => prev.filter(a => a._id !== att._id))}
                                className="text-red-600 hover:text-red-700"
                                type="button"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Visibility
                      </label>
                      <select
                        value={noteVisibility}
                        onChange={(e) => setNoteVisibility(e.target.value as 'all' | 'private')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Show to everyone</option>
                        <option value="private">Show to me and super admin only</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateNote}
                        disabled={uploadingNote || !noteText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        type="button"
                      >
                        {uploadingNote ? 'Creating...' : 'Create Note'}
                      </button>
                      <button
                        onClick={() => {
                          setShowNoteForm(false);
                          setNoteText('');
                          setNoteAttachments([]);
                          setNoteVisibility('all');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {!notesMinimized && (
              <>
                {showNoteForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Note Text <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Enter your note..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Attachments (Optional)
                        </label>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              Array.from(e.target.files).forEach(file => handleUploadNoteAttachment(file));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {noteAttachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {noteAttachments.map((att) => (
                              <div key={att._id} className="flex items-center gap-2 text-sm text-gray-600 bg-white p-2 rounded border">
                                <Paperclip className="w-4 h-4" />
                                <span className="flex-1 truncate">{att.originalName}</span>
                                <button
                                  onClick={() => setNoteAttachments(prev => prev.filter(a => a._id !== att._id))}
                                  className="text-red-600 hover:text-red-700"
                                  type="button"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Visibility
                        </label>
                        <select
                          value={noteVisibility}
                          onChange={(e) => setNoteVisibility(e.target.value as 'all' | 'private')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="all">Show to everyone</option>
                          <option value="private">Show to me and super admin only</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCreateNote}
                          disabled={uploadingNote || !noteText.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          type="button"
                        >
                          {uploadingNote ? 'Creating...' : 'Create Note'}
                        </button>
                        <button
                          onClick={() => {
                            setShowNoteForm(false);
                            setNoteText('');
                            setNoteAttachments([]);
                            setNoteVisibility('all');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {loadingNotes ? (
                  <div className="text-center py-8 text-gray-500">Loading notes...</div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => {
                      const createdBy = typeof note.createdBy === 'object' ? note.createdBy : null;
                      
                      return (
                        <div key={note._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-gray-900">
                                  {createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  note.visibility === 'private' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {note.visibility === 'private' ? 'Private' : 'All'}
                                </span>
                              </div>
                            </div>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteNote(note._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Note"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap ml-6 mb-2">{note.text}</p>
                          {note.attachments && note.attachments.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {note.attachments.map((att) => (
                                <a
                                  key={att._id}
                                  href={getJobNoteAttachmentUrl(att._id)}
                                  download={att.originalName}
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                  <Paperclip className="w-4 h-4" />
                                  <span className="flex-1 truncate">{att.originalName}</span>
                                  <Download className="w-4 h-4" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Activity History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 flex-1">Activity History</h3>
              <button
                onClick={() => setShowActivityHistory(!showActivityHistory)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {showActivityHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
            
            {showActivityHistory && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loadingActivities ? (
                  <div className="text-center py-8 text-ars-body">Loading activity history...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-ars-body">No activity history found for this job.</div>
                ) : (
                  activities.map((activity) => {
                    const userName = activity.userId
                      ? `${activity.userId.firstName || ''} ${activity.userId.lastName || ''}`.trim() || activity.userId.email
                      : 'System';
                    const formattedDate = formatDateTime(activity.createdAt);

                    return (
                      <div
                        key={activity._id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-ars-primary" />
                              <span className="font-semibold text-ars-heading">{userName}</span>
                              <span className="text-xs text-ars-body">•</span>
                              <span className="text-xs text-ars-body">{formattedDate}</span>
                            </div>
                            <p className="text-sm text-ars-body mb-2">{activity.description}</p>
                            {activity.metadata?.changes && Array.isArray(activity.metadata.changes) && activity.metadata.changes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-semibold text-ars-heading">Changes:</p>
                                <ul className="list-disc list-inside text-xs text-ars-body space-y-0.5">
                                  {activity.metadata.changes.map((change: string, idx: number) => (
                                    <li key={idx}>{change}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-ars-body">
                            <Clock className="w-3 h-3" />
                            <span>{activity.action}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Job</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete job <strong>{job.jobNumber}</strong>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently delete the job and all associated data. This action cannot be reversed.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      DELETING...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      DELETE JOB
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
