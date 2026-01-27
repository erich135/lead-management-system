import { useState } from 'react';
import {
  X,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  Building2,
  Calendar,
  TrendingUp,
  FileText,
  CheckCircle,
  UserCheck,
  Package,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  updateSalesLead,
  deleteSalesLead,
  assignSalesLead,
  convertSalesLeadToJob,
  type SalesLead,
  type Branch,
  type RepCode,
} from '../lib/api';
import { AppointmentScheduler } from './AppointmentScheduler';

interface SalesLeadDetailsProps {
  lead: SalesLead;
  branches: Branch[];
  repCodes: RepCode[];
  onClose: () => void;
  onEdit: (lead: SalesLead) => void;
  onRefresh: () => void;
}

export function SalesLeadDetails({ lead, branches, repCodes, onClose, onEdit, onRefresh }: SalesLeadDetailsProps) {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [selectedRep, setSelectedRep] = useState('');
  const [conversionNotes, setConversionNotes] = useState('');

  const canUpdate = hasPermission('sales_leads.update');
  const canDelete = hasPermission('sales_leads.delete');
  const canAssign = hasPermission('sales_leads.assign');
  const canConvert = hasPermission('sales_leads.convert');
  const canManageAppointments = hasPermission('appointments.create');

  function getBranchName(): string {
    if (typeof lead.branch === 'object') return lead.branch.name;
    const branch = branches.find((b) => b._id === lead.branch);
    return branch?.name || 'Unknown';
  }

  function getRepName(): string {
    if (!lead.assignedRep) return 'Unassigned';
    if (typeof lead.assignedRep === 'object') return lead.assignedRep.name || lead.assignedRep.code;
    const rep = repCodes.find((r) => r._id === lead.assignedRep);
    return rep?.description || rep?.code || 'Unknown';
  }

  function formatCurrency(value?: number): string {
    if (!value) return '-';
    return `R${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this sales lead? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteSalesLead(lead._id);
      onRefresh();
      onClose();
    } catch (err: any) {
      console.error('Error deleting sales lead:', err);
      setError(err.message || 'Failed to delete sales lead');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedRep) {
      setError('Please select a rep to assign');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await assignSalesLead(lead._id, selectedRep);
      setShowAssignDialog(false);
      onRefresh();
    } catch (err: any) {
      console.error('Error assigning sales lead:', err);
      setError(err.message || 'Failed to assign sales lead');
    } finally {
      setLoading(false);
    }
  }

  async function handleConvert() {
    setLoading(true);
    setError(null);

    try {
      const result = await convertSalesLeadToJob(lead._id, { notes: conversionNotes });
      alert(`Successfully converted to Job: ${result.job.jobNumber}`);
      setShowConvertDialog(false);
      onRefresh();
      onClose();
    } catch (err: any) {
      console.error('Error converting sales lead:', err);
      setError(err.message || 'Failed to convert sales lead to job');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: SalesLead['status']) {
    setLoading(true);
    setError(null);

    try {
      await updateSalesLead(lead._id, { status: newStatus });
      onRefresh();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<SalesLead['status'], string> = {
    new: 'bg-blue-100 text-blue-800',
    assigned: 'bg-purple-100 text-purple-800',
    contacted: 'bg-cyan-100 text-cyan-800',
    appointment_set: 'bg-orange-100 text-orange-800',
    appointment_attended: 'bg-yellow-100 text-yellow-800',
    rfc_requested: 'bg-green-100 text-green-800',
    converted: 'bg-emerald-100 text-emerald-800',
    lost: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<SalesLead['status'], string> = {
    new: 'New',
    assigned: 'Assigned',
    contacted: 'Contacted',
    appointment_set: 'Appointment Set',
    appointment_attended: 'Appointment Attended',
    rfc_requested: 'RFC Requested',
    converted: 'Converted',
    lost: 'Lost',
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-ars-heading">{lead.companyName}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status]}`}>
                    {statusLabels[lead.status]}
                  </span>
                  {lead.priority && lead.priority !== 'medium' && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        lead.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lead.priority.toUpperCase()} PRIORITY
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{lead.leadNumber}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {canUpdate && (
                <button
                  onClick={() => onEdit(lead)}
                  className="bg-ars-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-ars-primary/90 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {canAssign && lead.status !== 'converted' && (
                <button
                  onClick={() => setShowAssignDialog(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Assign Rep
                </button>
              )}
              {canManageAppointments && lead.status !== 'converted' && lead.status !== 'lost' && (
                <button
                  onClick={() => setShowAppointmentScheduler(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule Appointment
                </button>
              )}
              {canConvert && lead.status !== 'converted' && lead.status !== 'lost' && (
                <button
                  onClick={() => setShowConvertDialog(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Convert to Job
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-ars-primary" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-medium text-gray-900">{lead.contactPerson}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-ars-primary" />
                    {lead.contactPhone}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-ars-primary" />
                    {lead.contactEmail}
                  </p>
                </div>
                {lead.contactAddress && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-gray-900">{lead.contactAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-ars-primary" />
                Lead Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Branch</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-ars-primary" />
                    {getBranchName()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned Rep</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-ars-primary" />
                    {getRepName()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lead Source</p>
                  <p className="font-medium text-gray-900">{lead.leadSource}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimated Value</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    {formatCurrency(lead.estimatedValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">{formatDate(lead.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium text-gray-900">{formatDate(lead.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            {/* Conversion Info */}
            {lead.convertedJobNumber && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-emerald-900">Converted to Job</h3>
                </div>
                <p className="text-emerald-800 font-medium">Job Number: {lead.convertedJobNumber}</p>
                {lead.convertedAt && (
                  <p className="text-sm text-emerald-700 mt-1">
                    Converted on {formatDate(lead.convertedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Status Management */}
            {canUpdate && lead.status !== 'converted' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Update Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['new', 'assigned', 'contacted', 'appointment_set', 'appointment_attended', 'rfc_requested', 'lost'] as SalesLead['status'][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={loading || lead.status === status}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        lead.status === status
                          ? statusColors[status]
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign to Rep</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Rep</label>
              <select
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="">Choose a rep...</option>
                {repCodes.map((rep) => (
                  <option key={rep._id} value={rep._id}>
                    {rep.description || rep.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAssignDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={loading || !selectedRep}
                className="bg-ars-secondary text-ars-heading px-4 py-2 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Dialog */}
      {showConvertDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              Convert to Job
            </h3>
            <p className="text-gray-700 mb-4">
              This will create a new customer and job based on this sales lead. The lead status will be updated to "Converted".
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Conversion Notes (Optional)</label>
              <textarea
                value={conversionNotes}
                onChange={(e) => setConversionNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Add any notes about the conversion..."
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConvertDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Converting...' : 'Convert to Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Scheduler */}
      {showAppointmentScheduler && (
        <AppointmentScheduler
          leadId={lead._id}
          leadCompanyName={lead.companyName}
          repCodes={repCodes}
          onClose={() => setShowAppointmentScheduler(false)}
          onSave={() => {
            setShowAppointmentScheduler(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
