import { useState, useEffect } from 'react';
import { ClipboardList, Edit, Trash2, Eye, X, CheckCircle, Lock, FileCheck, Plus } from 'lucide-react';
import {
  getJobCardTemplates,
  updateJobCardTemplate,
  createJobCardTemplate,
  deleteJobCardTemplate,
  type JobCardTemplate,
} from '../lib/api';
import { JobCardFormBuilder } from './JobCardFormBuilder';
import { JobCardPreview } from './JobCardPreview';
import { FixedJobCardPrintView } from './FixedJobCardPrintView';
import { SystemJobCardTemplateEditor } from './SystemJobCardTemplateEditor';
import { countVisibleTemplateFields, countAllTemplateFields } from '../utils/fixedJobCardSections';
import { generateDummyJobCardPreviewData } from '../utils/fixedJobCardDummyData';

/**
 * Job Card Templates component.
 * System forms (seeded) show all PDF questions read-only; legacy builder remains for custom templates.
 */
export function JobCardTemplates() {
  const [templates, setTemplates] = useState<JobCardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobCardTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<JobCardTemplate | null>(null);
  const [systemViewTemplate, setSystemViewTemplate] = useState<JobCardTemplate | null>(null);
  const [filledPreviewTemplate, setFilledPreviewTemplate] = useState<JobCardTemplate | null>(null);
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
   * Opens configure editor for system templates.
   */
  const handleEdit = (template: JobCardTemplate) => {
    if (template.isSystemTemplate) {
      setSystemViewTemplate(template);
      return;
    }
    setEditingTemplate(template);
    setShowBuilder(true);
  };

  /**
   * Opens preview — system templates use the question viewer.
   */
  const handlePreview = (template: JobCardTemplate) => {
    if (template.isSystemTemplate || (template.sections && template.sections.length > 0)) {
      setSystemViewTemplate(template);
      return;
    }
    setPreviewTemplate(template);
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

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      setLoading(true);
      await deleteJobCardTemplate(templateId);
      await loadTemplates();
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
        reportNumber={dummy.reportNumber}
        isPreviewSample
        onClose={() => setFilledPreviewTemplate(null)}
      />
    );
  }

  if (systemViewTemplate) {
    return (
      <SystemJobCardTemplateEditor
        template={systemViewTemplate}
        onClose={() => setSystemViewTemplate(null)}
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
  const customTemplates = templates.filter((t) => !t.isSystemTemplate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#383838] mb-2 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-[#0969a9]" />
            Job Card Forms
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            Configure which sections and questions appear on each standard form. Technicians only see what you
            turn on. Click <strong>Configure form</strong> to show/hide questions or add custom ones.
          </p>
        </div>

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
                          onClick={() => handlePreviewFilled(template)}
                          className="w-full px-4 py-2.5 border-2 border-amber-500 text-amber-900 bg-amber-50 rounded-[6px] hover:bg-amber-100 flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <FileCheck className="w-4 h-4" />
                          Preview filled form (sample)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Templates Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Custom Templates</h2>
                  <p className="text-sm text-gray-500">Build your own job card templates with custom sections and questions.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[8px] hover:shadow-md transition-all text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </button>
              </div>

              {customTemplates.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-[8px]">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4">No custom templates yet.</p>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[8px] hover:shadow-md transition-all text-sm mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTemplates.map((template) => (
                    <div key={template._id} className="bg-white border rounded-[8px] p-4">
                      <h3 className="font-semibold mb-2">{template.name}</h3>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEdit(template)} className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm">
                          Edit
                        </button>
                        <button type="button" onClick={() => handlePreview(template)} className="px-3 py-2 bg-gray-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => template._id && handleDelete(template._id)} className="px-3 py-2 bg-red-50 rounded">
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
                Standard forms are configured per report type (not per technician). Assign them from{' '}
                <strong>Parts Ready – Job Cards</strong>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
