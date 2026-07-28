import { useState } from 'react';
import { AlertCircle, FileText, Loader2, Lock, Pencil, Save, X } from 'lucide-react';
import { updateMachineRSRMetadata, type MachineRSR } from '../lib/api';
import {
  changedFields,
  initialForm,
  missingRequiredField,
  type FormState,
} from '../lib/machineRsrMetadataEdit';

interface MachineRSRMetadataEditModalProps {
  machineId: string;
  rsr: MachineRSR;
  onCancel: () => void;
  onSaved: (updated: MachineRSR) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploaderName(rsr: MachineRSR): string {
  if (rsr.uploadedBy && typeof rsr.uploadedBy === 'object') {
    return `${rsr.uploadedBy.firstName || ''} ${rsr.uploadedBy.lastName || ''}`.trim() || '—';
  }
  return '—';
}

/**
 * Compact editor for report metadata on an already-uploaded RSR.
 *
 * The uploaded file, its title, the original uploader and the upload date are
 * shown read-only: they are upload evidence and cannot be corrected here. There
 * is deliberately no delete and no replace-file control.
 */
export function MachineRSRMetadataEditModal({
  machineId,
  rsr,
  onCancel,
  onSaved,
}: MachineRSRMetadataEditModalProps) {
  const original = initialForm(rsr);
  const [form, setForm] = useState<FormState>(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updates = changedFields(form, original);
  const hasChanges = Object.keys(updates).length > 0;

  const setField = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    if (missingRequiredField(form)) {
      setError('Date on RSR is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMachineRSRMetadata(machineId, rsr._id, updates);
      onSaved(updated);
    } catch (caught) {
      // The form keeps the user's edits so a failed save can be retried.
      setError(caught instanceof Error ? caught.message : 'Failed to update RSR metadata');
    } finally {
      setSaving(false);
    }
  };

  const textField = (
    field: keyof FormState,
    label: string,
    type: 'text' | 'date' | 'number' = 'text',
  ) => (
    <div>
      <label htmlFor={`rsr-edit-${field}`} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {field === 'workDate' && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={`rsr-edit-${field}`}
        type={type}
        value={form[field]}
        onChange={setField(field)}
        step={type === 'number' ? 'any' : undefined}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-label="Edit RSR metadata"
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-purple-600" />
            Edit RSR Details
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Upload evidence: read-only */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              <Lock className="w-3.5 h-3.5" />
              Original upload — cannot be changed
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <FileText className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-medium break-words">{rsr.fileName}</div>
                <div className="text-xs text-slate-500">
                  {formatFileSize(rsr.fileSize)} · {rsr.mimeType}
                </div>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex gap-1">
                <dt className="text-slate-500">Uploaded by:</dt>
                <dd className="text-slate-700 font-medium">{uploaderName(rsr)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-slate-500">Upload date:</dt>
                <dd className="text-slate-700 font-medium">
                  {rsr.uploadedAt ? new Date(rsr.uploadedAt).toLocaleString('en-ZA') : '—'}
                </dd>
              </div>
              {rsr.title && (
                <div className="flex gap-1 sm:col-span-2">
                  <dt className="text-slate-500">Uploaded title:</dt>
                  <dd className="text-slate-700 font-medium break-words">{rsr.title}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {textField('workDate', 'Date on RSR', 'date')}
            {textField('rsrNumber', 'RSR number')}
            {textField('jobNumber', 'Job number')}
            {textField('poNumber', 'PO number')}
            {textField('invNumber', 'Invoice number')}
            {textField('quoteDate', 'Quote date', 'date')}
            {textField('value', 'Total excl. VAT', 'number')}
            {textField('tech', 'Technician')}
            {textField('hoursWorked', 'Hours worked', 'number')}
          </div>

          <div>
            <label
              htmlFor="rsr-edit-description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="rsr-edit-description"
              value={form.description}
              onChange={setField('description')}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="rsr-edit-comments"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Comments
            </label>
            <textarea
              id="rsr-edit-comments"
              value={form.comments}
              onChange={setField('comments')}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MachineRSRMetadataEditModal;
