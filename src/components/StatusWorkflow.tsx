import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, Attachment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  ChevronRight,
  Upload,
  FileText,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface StatusWorkflowProps {
  lead: Lead;
  statuses: LeadStatus[];
  onStatusChange: (leadId: string, newStatusId: string, referenceNumber?: string, notes?: string) => Promise<void>;
  onClose: () => void;
}

export function StatusWorkflow({ lead, statuses, onStatusChange, onClose }: StatusWorkflowProps) {
  const { profile } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(lead.current_status_id || '');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStatus = statuses.find(s => s.id === lead.current_status_id);
  const newStatus = statuses.find(s => s.id === selectedStatus);

  useEffect(() => {
    loadAttachments();
  }, [lead.id, selectedStatus]);

  async function loadAttachments() {
    try {
      const { data } = await supabase
        .from('attachments')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('status_id', selectedStatus || lead.current_status_id);

      if (data) setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // Create a unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${lead.id}/${selectedStatus || lead.current_status_id}/${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('lead-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('attachments')
          .insert({
            lead_id: lead.id,
            status_id: selectedStatus || lead.current_status_id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: profile?.id
          });

        if (dbError) throw dbError;

        return true;
      } catch (error) {
        console.error('Error uploading file:', error);
        return false;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      loadAttachments();
    }

    setIsUploading(false);
  }

  async function handleDeleteAttachment(attachmentId: string, filePath: string) {
    try {
      // Delete from storage
      await supabase.storage
        .from('lead-attachments')
        .remove([filePath]);

      // Delete from database
      await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  }

  async function handleDownloadAttachment(filePath: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from('lead-attachments')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }

  function validateStatusChange(): string[] {
    const errors: string[] = [];

    if (!newStatus) {
      errors.push('Please select a status');
      return errors;
    }

    // Check if attachment is required for current status
    if (currentStatus?.requires_attachment) {
      const currentStatusAttachments = attachments.filter(a => a.status_id === currentStatus.id);
      if (currentStatusAttachments.length === 0) {
        errors.push(`Attachment required for current status: ${currentStatus.name}`);
      }
    }

    // Check if reference number is required for current status
    if (currentStatus?.requires_reference_number) {
      const hasReferenceNumber = 
        (currentStatus.name === 'Quoted' && lead.quote_number) ||
        (currentStatus.name === 'Order Received' && lead.order_number) ||
        (currentStatus.name === 'Invoiced' && lead.invoice_number) ||
        referenceNumber;

      if (!hasReferenceNumber) {
        errors.push(`Reference number required for current status: ${currentStatus.name}`);
      }
    }

    // Check if attachment will be required for new status
    if (newStatus.requires_attachment && newStatus.id !== currentStatus?.id) {
      const newStatusAttachments = attachments.filter(a => a.status_id === newStatus.id);
      if (newStatusAttachments.length === 0) {
        errors.push(`Attachment required for new status: ${newStatus.name}`);
      }
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validateStatusChange();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onStatusChange(lead.id, selectedStatus, referenceNumber || undefined, notes || undefined);
      onClose();
    } catch (error: any) {
      setErrors([error.message || 'Failed to update status']);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Update Status - {lead.lead_number}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">{lead.client_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-medium text-red-800">Validation Errors</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Status Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Current Status</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">{currentStatus?.name}</span>
              </div>
              {currentStatus?.requires_attachment && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Attachment Required
                </span>
              )}
              {currentStatus?.requires_reference_number && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Reference Required
                </span>
              )}
            </div>

            {/* Current Status Attachments */}
            {currentStatus && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Attachments for {currentStatus.name}
                </h4>
                <div className="space-y-2">
                  {attachments
                    .filter(a => a.status_id === currentStatus.id)
                    .map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{attachment.file_name}</span>
                          <span className="text-xs text-gray-500">
                            ({((attachment.file_size || 0) / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(attachment.file_path, attachment.file_name)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(attachment.id, attachment.file_path)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {attachments.filter(a => a.status_id === currentStatus.id).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No attachments</p>
                  )}
                </div>

                {/* Upload for current status */}
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Add Attachment'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select status...</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                  {status.requires_attachment && ' (Attachment Required)'}
                  {status.requires_reference_number && ' (Reference Required)'}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          {newStatus?.requires_reference_number && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
                {newStatus.name === 'Quoted' && ' (Quote Number)'}
                {newStatus.name === 'Order Received' && ' (Order Number)'}
                {newStatus.name === 'Invoiced' && ' (Invoice Number)'}
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter reference number"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any relevant notes about this status change..."
            />
          </div>

          {/* New Status Attachments Preview */}
          {newStatus && newStatus.requires_attachment && newStatus.id !== currentStatus?.id && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">
                Attachment Required for {newStatus.name}
              </h4>
              <div className="space-y-2">
                {attachments
                  .filter(a => a.status_id === newStatus.id)
                  .map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{attachment.file_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                {attachments.filter(a => a.status_id === newStatus.id).length === 0 && (
                  <p className="text-sm text-yellow-700">
                    No attachment uploaded for this status yet. You'll need to upload one before changing to this status.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Update Status
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}