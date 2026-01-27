import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { createSalesLead, updateSalesLead, getServiceDescriptions, getJobSources, type SalesLead, type Branch, type RepCode, type ServiceDescription, type JobSource } from '../lib/api';

interface SalesLeadFormProps {
  lead?: SalesLead | null;
  branches: Branch[];
  repCodes: RepCode[];
  onClose: () => void;
  onSave: () => void;
}

export function SalesLeadForm({ lead, branches, repCodes, onClose, onSave }: SalesLeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDescriptions, setServiceDescriptions] = useState<ServiceDescription[]>([]);
  const [jobSources, setJobSources] = useState<JobSource[]>([]);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    branch: '',
    assignedRep: '',
    adminCode: '', // Auto-set from rep code
    leadSource: 'Other',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedValue: '',
    serviceDescription: '', // For job conversion
    jobSource: '', // For job conversion
    notes: '',
    status: 'new' as SalesLead['status'],
  });

  useEffect(() => {
    // Load service descriptions and job sources
    async function loadReferenceData() {
      try {
        const [descriptionsData, sourcesData] = await Promise.all([
          getServiceDescriptions(),
          getJobSources(),
        ]);
        setServiceDescriptions(descriptionsData.descriptions);
        setJobSources(sourcesData.sources);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    }
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (lead) {
      setFormData({
        companyName: lead.companyName || '',
        contactPerson: lead.contactPerson || '',
        contactPhone: lead.contactPhone || '',
        contactEmail: lead.contactEmail || '',
        contactAddress: lead.contactAddress || '',
        branch: typeof lead.branch === 'object' ? lead.branch._id : lead.branch,
        assignedRep: lead.assignedRep ? (typeof lead.assignedRep === 'object' ? lead.assignedRep._id : lead.assignedRep) : '',
        adminCode: (lead as any).adminCode || '',
        leadSource: lead.leadSource || 'Other',
        priority: lead.priority || 'medium',
        estimatedValue: lead.estimatedValue?.toString() || '',
        serviceDescription: (lead as any).serviceDescription || '',
        jobSource: (lead as any).jobSource || '',
        notes: lead.notes || '',
        status: lead.status,
      });
    }
  }, [lead]);

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactAddress: formData.contactAddress.trim(),
        branch: formData.branch,
        leadSource: formData.leadSource,
        priority: formData.priority,
        notes: formData.notes.trim(),
      };

      if (formData.assignedRep) {
        payload.assignedRep = formData.assignedRep;
      }

      if (formData.adminCode) {
        payload.adminCode = formData.adminCode;
      }

      if (formData.estimatedValue) {
        payload.estimatedValue = parseFloat(formData.estimatedValue);
      }

      if (formData.serviceDescription) {
        payload.serviceDescription = formData.serviceDescription;
      }

      if (formData.jobSource) {
        payload.jobSource = formData.jobSource;
      }

      if (lead) {
        // Update existing lead
        payload.status = formData.status;
        await updateSalesLead(lead._id, payload);
      } else {
        // Create new lead
        await createSalesLead(payload);
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving sales lead:', err);
      setError(err.message || 'Failed to save sales lead');
    } finally {
      setLoading(false);
    }
  }

  const isEditMode = !!lead;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ars-heading">
            {isEditMode ? 'Edit Sales Lead' : 'New Sales Lead'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Company Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="e.g., 011 123 4567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="email@company.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.contactAddress}
                  onChange={(e) => handleChange('contactAddress', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="Enter physical address"
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Lead Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.branch}
                  onChange={(e) => handleChange('branch', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Rep <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.assignedRep}
                  onChange={(e) => {
                    const selectedRepId = e.target.value;
                    const selectedRep = repCodes.find(rc => rc._id === selectedRepId);
                    
                    // Auto-populate branch and admin code if rep has them linked (same as LeadForm logic)
                    if (selectedRep) {
                      const updates: any = { assignedRep: selectedRepId };
                      
                      if (selectedRep.adminCode) {
                        updates.adminCode = selectedRep.adminCode;
                      }
                      
                      if (selectedRep.branch) {
                        const branchId = typeof selectedRep.branch === 'object' 
                          ? selectedRep.branch._id 
                          : selectedRep.branch;
                        updates.branch = branchId;
                      }
                      
                      setFormData({ ...formData, ...updates });
                    } else {
                      handleChange('assignedRep', selectedRepId);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                >
                  <option value="">Select Rep</option>
                  {repCodes.map((rep) => (
                    <option key={rep._id} value={rep._id}>
                      {rep.code} - {rep.description || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Source <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.leadSource}
                  onChange={(e) => handleChange('leadSource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                >
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Website">Website</option>
                  <option value="Trade Show">Trade Show</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Partner">Partner</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value (R)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimatedValue}
                  onChange={(e) => handleChange('estimatedValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Description <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-1">(Required for job conversion)</span>
                </label>
                <select
                  required
                  value={formData.serviceDescription}
                  onChange={(e) => handleChange('serviceDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                >
                  <option value="">Select Service Description</option>
                  {serviceDescriptions.map((desc) => (
                    <option key={desc._id} value={desc._id}>
                      {desc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Source <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-1">(Required for job conversion)</span>
                </label>
                <select
                  required
                  value={formData.jobSource}
                  onChange={(e) => handleChange('jobSource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                >
                  <option value="">Select Job Source</option>
                  {jobSources.map((source) => (
                    <option key={source._id} value={source._id}>
                      {source.name}{source.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                  >
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="contacted">Contacted</option>
                    <option value="appointment_set">Appointment Set</option>
                    <option value="appointment_attended">Appointment Attended</option>
                    <option value="rfc_requested">RFC Requested</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              placeholder="Add any additional notes about this lead..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-ars-secondary text-ars-heading px-6 py-2 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEditMode ? 'Save Changes' : 'Create Lead'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
