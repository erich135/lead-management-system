import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Edit, Trash2, Eye, X } from 'lucide-react';
import { 
  getJobCardTemplates, 
  createJobCardTemplate, 
  updateJobCardTemplate, 
  deleteJobCardTemplate,
  type JobCardTemplate 
} from '../lib/api';
import { JobCardFormBuilder } from './JobCardFormBuilder';
import { JobCardPreview } from './JobCardPreview';

/**
 * Job Card Templates component.
 * Allows super admins to create and manage job card templates.
 */
export function JobCardTemplates() {
  const [templates, setTemplates] = useState<JobCardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobCardTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<JobCardTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads templates from the API.
   */
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getJobCardTemplates();
      setTemplates(response.templates || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles creating a new template.
   */
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowBuilder(true);
  };

  /**
   * Handles editing a template.
   */
  const handleEdit = (template: JobCardTemplate) => {
    setEditingTemplate(template);
    setShowBuilder(true);
  };

  /**
   * Handles saving a template.
   */
  const handleSave = async (templateData: any) => {
    try {
      setLoading(true);
      setError(null);

      if (templateData._id) {
        // Update existing template
        await updateJobCardTemplate(templateData._id, templateData);
      } else {
        // Create new template
        await createJobCardTemplate(templateData);
      }

      await loadTemplates();
      setShowBuilder(false);
      setEditingTemplate(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
      console.error('Error saving template:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles deleting a template.
   */
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteJobCardTemplate(templateId);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
      console.error('Error deleting template:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles canceling the builder.
   */
  const handleCancel = () => {
    setShowBuilder(false);
    setEditingTemplate(null);
  };

  /**
   * Handles previewing a template.
   */
  const handlePreview = (template: JobCardTemplate) => {
    setPreviewTemplate(template);
  };

  /**
   * Handles closing the preview.
   */
  const handleClosePreview = () => {
    setPreviewTemplate(null);
  };

  // Show preview if active
  if (previewTemplate) {
    return (
      <JobCardPreview
        template={previewTemplate}
        onClose={handleClosePreview}
      />
    );
  }

  // Show form builder if active
  if (showBuilder) {
    return (
      <JobCardFormBuilder
        template={editingTemplate || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#383838] mb-2 flex items-center gap-3">
                <ClipboardList className="w-7 h-7 text-[#0969a9]" />
                Job Card Templates
              </h1>
              <p className="text-sm text-gray-600">
                Create and manage templates for job cards that technicians will fill out
              </p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[8px] hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[8px] mb-4">
            {error}
          </div>
        )}

        {/* Templates List */}
        <div className="bg-white rounded-[8px] shadow-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No templates yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Create your first job card template to get started
              </p>
              <button 
                onClick={handleCreateNew}
                className="px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d548] text-[#383838] font-semibold rounded-[8px] hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template._id} className="border border-gray-200 rounded-[8px] p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(template)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-[6px] hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handlePreview(template)}
                      className="px-3 py-2 bg-gray-50 text-gray-700 rounded-[6px] hover:bg-gray-100 transition-colors"
                      title="Preview Template"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => template._id && handleDelete(template._id)}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded-[6px] hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

