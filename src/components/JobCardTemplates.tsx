import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Edit,
  Trash2,
  Eye,
  X,
  CheckCircle,
  Lock,
  FileCheck,
  Copy,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  getJobCardTemplates,
  updateJobCardTemplate,
  createJobCardTemplate,
  deleteJobCardTemplate,
  duplicateJobCardTemplate,
  createBlankJobCardTemplate,
  type JobCardTemplate,
} from '../lib/api';
import { JobCardFormBuilder } from './JobCardFormBuilder';
import { JobCardPreview } from './JobCardPreview';
import { FixedJobCardPrintView } from './FixedJobCardPrintView';
import { SystemJobCardTemplateEditor } from './SystemJobCardTemplateEditor';
import { countVisibleTemplateFields, countAllTemplateFields } from '../utils/fixedJobCardSections';
import { generateDummyJobCardPreviewData } from '../utils/fixedJobCardDummyData';

/**
 * Returns whether a template uses the mobile section-based form structure.
 */
function isSectionBasedTemplate(template: JobCardTemplate): boolean {
  return Boolean(
    template.isSystemTemplate || (template.sections && template.sections.length > 0)
  );
}

/**
 * Resolves sample report number for print preview.
 */
function previewReportNumber(template: JobCardTemplate): string {
  if (template.reportPrefix === 'MCC' || template.templateKey === 'mechanical_checklist') {
    return 'MCC000001';
  }
  return 'RSR000001';
}

/**
 * Job Card Templates component.
 * System forms can be configured or duplicated; custom section forms work on the technician app.
 */
export function JobCardTemplates() {
  const [templates, setTemplates] = useState<JobCardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobCardTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<JobCardTemplate | null>(null);
  const [systemViewTemplate, setSystemViewTemplate] = useState<JobCardTemplate | null>(null);
  const [filledPreviewTemplate, setFilledPreviewTemplate] = useState<JobCardTemplate | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<JobCardTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateDescription, setDuplicateDescription] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Loads templates from the API.
   */
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getJobCardTemplates();
      setTemplates(response.templates || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowBuilder(true);
  };

  /**
   * Opens the section-based editor for system and custom mobile forms.
   */
  const handleEdit = (template: JobCardTemplate) => {
    if (isSectionBasedTemplate(template)) {
      setSystemViewTemplate(template);
      return;
    }
    setEditingTemplate(template);
    setShowBuilder(true);
  };

  /**
   * Opens preview for legacy grid-based templates only.
   */
  const handlePreview = (template: JobCardTemplate) => {
    if (isSectionBasedTemplate(template)) {
      setSystemViewTemplate(template);
      return;
    }
    setPreviewTemplate(template);
  };

  /**
   * Opens the duplicate modal with a suggested name.
   */
  const openDuplicateModal = (template: JobCardTemplate) => {
    setDuplicateSource(template);
    setDuplicateName(`${template.name} (copy)`);
    setDuplicateDescription(template.description || '');
    setError(null);
  };

  /**
   * Creates a copy of a section-based template and opens it for editing.
   */
  const handleDuplicate = async () => {
    if (!duplicateSource?._id || !duplicateName.trim()) return;
    setDuplicating(true);
    setError(null);
    try {
      const res = await duplicateJobCardTemplate(duplicateSource._id, {
        name: duplicateName.trim(),
        description: duplicateDescription.trim() || undefined,
      });
      await loadTemplates();
      setDuplicateSource(null);
      setSuccessMessage(`Created "${res.template.name}"`);
      setSystemViewTemplate(res.template);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template');
    } finally {
      setDuplicating(false);
    }
  };

  /**
   * Creates a blank form with job header and sign-off only.
   */
  const handleCreateBlank = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createBlankJobCardTemplate({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      });
      await loadTemplates();
      setShowCreateModal(false);
      setCreateName('');
      setCreateDescription('');
      setSuccessMessage(`Created "${res.template.name}"`);
      setSystemViewTemplate(res.template);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setCreating(false);
    }
  };

  /**
   * Handles saving a template from the legacy builder.
   */
  const handleSave = async (templateData: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      let saved: { template: JobCardTemplate };
      if (templateData._id) {
        saved = await updateJobCardTemplate(String(templateData._id), templateData);
      } else {
        saved = await createJobCardTemplate(templateData);
      }
      await loadTemplates();
      setEditingTemplate(saved.template);
      setSuccessMessage('Template saved successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Soft-deletes a custom template.
   */
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      setLoading(true);
      await deleteJobCardTemplate(templateId);
      await loadTemplates();
      setSuccessMessage('Template deleted');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens filled print preview with dummy technician data.
   */
  const handlePreviewFilled = (template: JobCardTemplate) => {
    setFilledPreviewTemplate(template);
  };

  if (filledPreviewTemplate) {
    const sections = (filledPreviewTemplate.sections || []) as Parameters<
      typeof generateDummyJobCardPreviewData
    >[0];
    const dummy = generateDummyJobCardPreviewData(sections, filledPreviewTemplate.templateKey);
    return (
      <FixedJobCardPrintView
        template={filledPreviewTemplate}
        fieldValues={dummy.fieldValues}
        job={dummy.job}
        machine={dummy.machine}
        reportNumber={previewReportNumber(filledPreviewTemplate)}
        isPreviewSample
        onClose={() => setFilledPreviewTemplate(null)}
      />
    );
  }

  if (systemViewTemplate) {
    return (
      <SystemJobCardTemplateEditor
        template={systemViewTemplate}
        onClose={() => {
          setSystemViewTemplate(null);
          loadTemplates();
        }}
        onSaved={(updated) => {
          setTemplates((prev) => prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t)));
          setSystemViewTemplate((prev) => (prev ? { ...prev, ...updated } : prev));
        }}
      />
    );
  }

  if (previewTemplate) {
    return (
      <JobCardPreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
    );
  }

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-[8px] mx-4 mt-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {successMessage}
            </span>
            <button type="button" onClick={() => setSuccessMessage(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <JobCardFormBuilder
          template={editingTemplate || undefined}
          onSave={handleSave}
          onCancel={() => {
            setShowBuilder(false);
            setEditingTemplate(null);
          }}
        />
      </div>
    );
  }

  const systemTemplates = templates.filter((t) => t.isSystemTemplate);
  const customSectionTemplates = templates.filter(
    (t) => !t.isSystemTemplate && t.sections && t.sections.length > 0
  );
  const legacyTemplates = templates.filter(
    (t) => !t.isSystemTemplate && (!t.sections || t.sections.length === 0)
  );

  /**
   * Renders action buttons shared by section-based template cards.
   */
  const renderSectionFormActions = (template: JobCardTemplate, variant: 'system' | 'custom') => (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => handleEdit(template)}
        className="w-full px-4 py-2.5 bg-[#0969a9] text-white rounded-[6px] hover:bg-[#075a8f] flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Edit className="w-4 h-4" />
        Configure form
      </button>
      <button
        type="button"
        onClick={() => openDuplicateModal(template)}
        className="w-full px-4 py-2.5 border border-[#0969a9] text-[#0969a9] bg-white rounded-[6px] hover:bg-blue-50 flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Copy className="w-4 h-4" />
        Duplicate as new form
      </button>
      <button
        type="button"
        onClick={() => handlePreviewFilled(template)}
        className={`w-full px-4 py-2.5 border-2 rounded-[6px] flex items-center justify-center gap-2 text-sm font-medium ${
          variant === 'system'
            ? 'border-amber-500 text-amber-900 bg-amber-50 hover:bg-amber-100'
            : 'border-gray-300 text-gray-800 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <FileCheck className="w-4 h-4" />
        Preview filled form (sample)
      </button>
      {variant === 'custom' && template._id && (
        <button
          type="button"
          onClick={() => handleDelete(template._id!)}
          className="w-full px-4 py-2.5 border border-red-200 text-red-700 bg-red-50 rounded-[6px] hover:bg-red-100 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete form
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#383838] mb-2 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-[#0969a9]" />
            Job Card Forms
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl">
            Configure which sections and questions appear on each form. Job and machine details stay
            the same — create a new blank form or duplicate a standard form, then add sections and
            questions. Technicians fill these in on the mobile app.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreateName('');
              setCreateDescription('');
              setError(null);
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#0969a9] text-white rounded-[6px] hover:bg-[#075a8f] text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create new form
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-[8px] mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {successMessage}
            </span>
            <button type="button" onClick={() => setSuccessMessage(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[8px] mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 bg-white rounded-[8px] shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4" />
            <p className="text-gray-600">Loading forms...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Standard forms (from your PDFs)</h2>
              <p className="text-sm text-gray-600 mb-4">
                These are the two base reports. Use <strong>Duplicate as new form</strong> to create a
                copy with a new name — then adjust sections and questions without changing the original.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemTemplates.map((template) => {
                  const fieldCount = countVisibleTemplateFields(template.sections as never[]);
                  const totalFields = countAllTemplateFields(template.sections as never[]);
                  return (
                    <div
                      key={template._id}
                      className="border-2 border-amber-200 bg-amber-50/30 rounded-[8px] p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">{template.name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                          System
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <p className="text-sm font-medium text-[#0969a9] mb-4">
                        {fieldCount > 0
                          ? `${fieldCount} of ${totalFields} questions visible to technicians`
                          : 'Questions not loaded — re-run npm run seed:job-card-templates'}
                      </p>
                      {renderSectionFormActions(template, 'system')}
                    </div>
                  );
                })}
              </div>
            </div>

            {customSectionTemplates.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Custom forms (mobile-ready)</h2>
                <p className="text-sm text-gray-600 mb-4">
                  These are copies or variants based on the standard forms. Assign them from{' '}
                  <strong>Parts Ready – Job Cards</strong> like the system forms.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customSectionTemplates.map((template) => {
                    const fieldCount = countVisibleTemplateFields(template.sections as never[]);
                    const totalFields = countAllTemplateFields(template.sections as never[]);
                    return (
                      <div
                        key={template._id}
                        className="border-2 border-blue-200 bg-blue-50/20 rounded-[8px] p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-gray-800">{template.name}</h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                            Custom
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        )}
                        <p className="text-sm font-medium text-[#0969a9] mb-4">
                          {fieldCount} of {totalFields} questions visible to technicians
                        </p>
                        {renderSectionFormActions(template, 'custom')}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Custom Templates (legacy builder)</h2>
                  <p className="text-sm text-gray-500">
                    Older grid-based templates — not available on the technician mobile app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[8px] hover:shadow-md transition-all text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New legacy template
                </button>
              </div>

              {legacyTemplates.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-[8px]">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4">No legacy templates yet.</p>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[8px] hover:shadow-md transition-all text-sm mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create legacy template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {legacyTemplates.map((template) => (
                    <div key={template._id} className="bg-white border rounded-[8px] p-4">
                      <h3 className="font-semibold mb-2">{template.name}</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(template)}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreview(template)}
                          className="px-3 py-2 bg-gray-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => template._id && handleDelete(template._id)}
                          className="px-3 py-2 bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-gray-50 border rounded-lg flex items-start gap-3">
              <Lock className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                Standard and custom mobile forms are assigned per job from{' '}
                <strong>Parts Ready – Job Cards</strong>. Duplicating a form keeps job/machine auto-fill
                and gives you a separate copy to customise.
              </p>
            </div>
          </>
        )}
      </div>

      {duplicateSource && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Duplicate as new form</h3>
            <p className="text-sm text-gray-600 mb-4">
              Creates a copy of <strong>{duplicateSource.name}</strong> with the same sections and
              questions. You can then rename it and add or hide items.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form name</label>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
              placeholder="e.g. Repair Status – Site A"
              autoFocus
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={duplicateDescription}
              onChange={(e) => setDuplicateDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 min-h-[72px]"
              placeholder="Short note for your team"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDuplicateSource(null)}
                disabled={duplicating}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={duplicating || !duplicateName.trim()}
                className="px-4 py-2 rounded-lg bg-[#0969a9] text-white text-sm font-medium hover:bg-[#075a8f] disabled:opacity-60 flex items-center gap-2"
              >
                {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Create copy
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Create new form</h3>
            <p className="text-sm text-gray-600 mb-4">
              Starts with <strong>Job & Machine Information</strong> and <strong>Sign-off</strong>{' '}
              only. Add your own sections and questions in between.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form name</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
              placeholder="e.g. Compressor Service Report"
              autoFocus
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 min-h-[72px]"
              placeholder="Short note for your team"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBlank}
                disabled={creating || !createName.trim()}
                className="px-4 py-2 rounded-lg bg-[#0969a9] text-white text-sm font-medium hover:bg-[#075a8f] disabled:opacity-60 flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
