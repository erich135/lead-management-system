import { useMemo, useState } from 'react';
import {
  X,
  Eye,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
} from 'lucide-react';
import type { JobCardTemplate } from '../lib/api';
import { updateJobCardTemplate } from '../lib/api';
import { FixedJobCardPrintView } from './FixedJobCardPrintView';
import { generateDummyJobCardPreviewData } from '../utils/fixedJobCardDummyData';
import {
  type FixedFormSection,
  type ChecklistItem,
  type AddableSectionType,
  isTemplateItemVisible,
  filterVisibleSections,
  countVisibleTemplateFields,
  countSectionVisibleItems,
  generateCustomFieldId,
  getNextChecklistNumber,
  canDeleteTemplateSection,
  createEmptyCustomSection,
  insertSectionBeforeSignOff,
} from '../utils/fixedJobCardSections';

interface SystemJobCardTemplateEditorProps {
  template: JobCardTemplate & {
    sections?: FixedFormSection[];
    templateKey?: string;
  };
  onClose: () => void;
  onSaved?: (template: JobCardTemplate) => void;
}

type QuestionDraft = {
  label: string;
  type: string;
  inputType: string;
  required: boolean;
  unit: string;
  options: string;
  rowId: string;
};

const EMPTY_DRAFT: QuestionDraft = {
  label: '',
  type: 'text',
  inputType: 'pass_fail',
  required: false,
  unit: '',
  options: '',
  rowId: '',
};

/**
 * Returns a human-readable label for a field input type.
 */
function fieldTypeLabel(type: string, inputType?: string): string {
  if (inputType === 'pass_fail') return 'Pass / Fail / N/A';
  if (inputType === 'number') return 'Number';
  if (type === 'yesno') return 'Yes / No';
  if (type === 'textarea') return 'Text area';
  if (type === 'signature') return 'Signature';
  if (type === 'jobField' || type === 'machineField') return 'Auto-filled';
  if (type === 'select') return 'Select one';
  return 'Text';
}

/**
 * Admin editor for system job card templates — toggle sections/questions and add custom items.
 */
export function SystemJobCardTemplateEditor({
  template,
  onClose,
  onSaved,
}: SystemJobCardTemplateEditorProps) {
  const [sections, setSections] = useState<FixedFormSection[]>(
    () => JSON.parse(JSON.stringify(template.sections || [])) as FixedFormSection[]
  );
  const [templateName, setTemplateName] = useState(template.name);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilledPreview, setShowFilledPreview] = useState(false);
  const [modal, setModal] = useState<
    | { mode: 'add'; sectionId: string }
    | { mode: 'edit'; sectionId: string; itemKind: 'field' | 'item' | 'rowField'; itemId: string; rowId?: string }
    | null
  >(null);
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_DRAFT);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionDraft, setSectionDraft] = useState<{ title: string; type: AddableSectionType }>({
    title: '',
    type: 'fields',
  });

  const isSystemTemplate = Boolean(template.isSystemTemplate);

  const visibleCount = useMemo(() => countVisibleTemplateFields(sections), [sections]);
  const totalCount = useMemo(
    () => countVisibleTemplateFields(sections.map((s) => ({ ...s, visible: true }))),
    [sections]
  );

  /**
   * Persists section configuration to the backend.
   */
  const handleSave = async () => {
    if (!template._id) return;
    setSaving(true);
    setError(null);
    try {
      const payload: { sections: FixedFormSection[]; name?: string } = { sections };
      if (!template.isSystemTemplate && templateName.trim()) {
        payload.name = templateName.trim();
      }
      const res = await updateJobCardTemplate(template._id, payload);
      setSuccess('Form configuration saved. Technicians will see the updated questions.');
      onSaved?.(res.template);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Toggles visibility for a section or nested question.
   */
  const setItemVisible = (
    sectionId: string,
    visible: boolean,
    target?: { kind: 'field' | 'item' | 'row'; id: string; rowId?: string }
  ) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        if (!target) {
          return { ...section, visible };
        }
        if (target.kind === 'field' && target.rowId && section.rows) {
          return {
            ...section,
            rows: section.rows.map((row) =>
              row.id === target.rowId
                ? {
                    ...row,
                    fields: row.fields.map((field) =>
                      field.id === target.id ? { ...field, visible } : field
                    ),
                  }
                : row
            ),
          };
        }
        if (target.kind === 'field' && section.fields) {
          return {
            ...section,
            fields: section.fields.map((field) =>
              field.id === target.id ? { ...field, visible } : field
            ),
          };
        }
        if (target.kind === 'item' && section.items) {
          return {
            ...section,
            items: section.items.map((item) =>
              item.id === target.id ? { ...item, visible } : item
            ),
          };
        }
        if (target.kind === 'row' && section.rows) {
          return {
            ...section,
            rows: section.rows.map((row) =>
              row.id === target.id ? { ...row, visible } : row
            ),
          };
        }
        return section;
      })
    );
  };

  /**
   * Opens the add-question modal for a section.
   */
  const openAddModal = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const defaultDraft: QuestionDraft = {
      ...EMPTY_DRAFT,
      rowId: section?.rows?.[0]?.id || '',
    };

    if (section?.type === 'yesno_list') {
      defaultDraft.type = 'yesno';
    } else if (section?.type === 'checklist') {
      defaultDraft.inputType = 'pass_fail';
    }

    setDraft(defaultDraft);
    setModal({ mode: 'add', sectionId });
  };

  /**
   * Opens the edit modal for an existing question.
   */
  const openEditModal = (
    sectionId: string,
    itemKind: 'field' | 'item' | 'rowField',
    itemId: string,
    rowId?: string
  ) => {
    const section = sections.find((s) => s.id === sectionId);
    let nextDraft = { ...EMPTY_DRAFT };

    if (itemKind === 'field' && section?.fields) {
      const field = section.fields.find((f) => f.id === itemId);
      if (field) {
        nextDraft = {
          label: field.label,
          type: field.type,
          inputType: 'pass_fail',
          required: Boolean(field.required),
          unit: field.unit || '',
          options: field.options?.join(', ') || '',
          rowId: '',
        };
      }
    }

    if (itemKind === 'item' && section?.items) {
      const item = section.items.find((i) => i.id === itemId);
      if (item) {
        nextDraft = {
          label: item.label,
          type: 'checklist',
          inputType: item.inputType || 'pass_fail',
          required: false,
          unit: item.unit || '',
          options: '',
          rowId: '',
        };
      }
    }

    if (itemKind === 'rowField' && rowId && section?.rows) {
      const row = section.rows.find((r) => r.id === rowId);
      const field = row?.fields.find((f) => f.id === itemId);
      if (field) {
        nextDraft = {
          label: field.label,
          type: field.type,
          inputType: 'number',
          required: Boolean(field.required),
          unit: field.unit || '',
          options: '',
          rowId,
        };
      }
    }

    setDraft(nextDraft);
    setModal({ mode: 'edit', sectionId, itemKind, itemId, rowId });
  };

  /**
   * Saves a new or edited question into the working section state.
   */
  const saveQuestion = () => {
    if (!modal || !draft.label.trim()) return;

    if (modal.mode === 'add') {
      setSections((prev) =>
        prev.map((section) => {
          if (section.id !== modal.sectionId) return section;

          if (section.type === 'checklist') {
            const items = [...(section.items || [])];
            items.push({
              id: generateCustomFieldId('mc'),
              number: getNextChecklistNumber(items),
              label: draft.label.trim(),
              inputType: draft.inputType as ChecklistItem['inputType'],
              unit: draft.unit || undefined,
              isCustom: true,
              visible: true,
            });
            return { ...section, items };
          }

          if (section.type === 'measurement_table' && section.rows?.length) {
            const rowId = draft.rowId || section.rows[0].id;
            return {
              ...section,
              rows: section.rows.map((row) =>
                row.id === rowId
                  ? {
                      ...row,
                      fields: [
                        ...row.fields,
                        {
                          id: generateCustomFieldId('reading'),
                          label: draft.label.trim(),
                          type: 'number',
                          unit: draft.unit || undefined,
                          isCustom: true,
                          visible: true,
                        },
                      ],
                    }
                  : row
              ),
            };
          }

          const fields = [...(section.fields || [])];
          fields.push({
            id: generateCustomFieldId('field'),
            label: draft.label.trim(),
            type: section.type === 'yesno_list' ? 'yesno' : draft.type,
            required: draft.required,
            options:
              draft.type === 'select'
                ? draft.options
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean)
                : undefined,
            unit: draft.unit || undefined,
            isCustom: true,
            visible: true,
          });
          return { ...section, fields };
        })
      );
    } else {
      setSections((prev) =>
        prev.map((section) => {
          if (section.id !== modal.sectionId) return section;

          if (modal.itemKind === 'item' && section.items) {
            return {
              ...section,
              items: section.items.map((item) =>
                item.id === modal.itemId
                  ? {
                      ...item,
                      label: draft.label.trim(),
                      inputType: draft.inputType as ChecklistItem['inputType'],
                      unit: draft.unit || undefined,
                    }
                  : item
              ),
            };
          }

          if (modal.itemKind === 'field' && section.fields) {
            return {
              ...section,
              fields: section.fields.map((field) =>
                field.id === modal.itemId
                  ? {
                      ...field,
                      label: draft.label.trim(),
                      type: draft.type,
                      required: draft.required,
                      unit: draft.unit || undefined,
                      options:
                        draft.type === 'select'
                          ? draft.options
                              .split(',')
                              .map((o) => o.trim())
                              .filter(Boolean)
                          : field.options,
                    }
                  : field
              ),
            };
          }

          if (modal.itemKind === 'rowField' && modal.rowId && section.rows) {
            return {
              ...section,
              rows: section.rows.map((row) =>
                row.id === modal.rowId
                  ? {
                      ...row,
                      fields: row.fields.map((field) =>
                        field.id === modal.itemId
                          ? {
                              ...field,
                              label: draft.label.trim(),
                              unit: draft.unit || undefined,
                            }
                          : field
                      ),
                    }
                  : row
              ),
            };
          }

          return section;
        })
      );
    }

    setModal(null);
    setDraft(EMPTY_DRAFT);
  };

  /**
   * Deletes a custom question from the section.
   */
  const deleteQuestion = (
    sectionId: string,
    itemKind: 'field' | 'item' | 'rowField',
    itemId: string,
    rowId?: string
  ) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;

        if (itemKind === 'item' && section.items) {
          return { ...section, items: section.items.filter((item) => item.id !== itemId) };
        }

        if (itemKind === 'field' && section.fields) {
          return { ...section, fields: section.fields.filter((field) => field.id !== itemId) };
        }

        if (itemKind === 'rowField' && rowId && section.rows) {
          return {
            ...section,
            rows: section.rows.map((row) =>
              row.id === rowId
                ? { ...row, fields: row.fields.filter((field) => field.id !== itemId) }
                : row
            ),
          };
        }

        return section;
      })
    );
  };

  /**
   * Updates the title of an editable section.
   */
  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, title } : section))
    );
  };

  /**
   * Inserts a new custom section before the sign-off block.
   */
  const addSection = () => {
    if (!sectionDraft.title.trim()) return;
    const newSection = createEmptyCustomSection(sectionDraft.type, sectionDraft.title);
    setSections((prev) => insertSectionBeforeSignOff(prev, newSection));
    setExpanded((prev) => ({ ...prev, [newSection.id]: true }));
    setShowSectionModal(false);
    setSectionDraft({ title: '', type: 'fields' });
  };

  /**
   * Removes a section when allowed (not header/sign-off).
   */
  const deleteSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || !canDeleteTemplateSection(section, isSystemTemplate)) return;
    if (!confirm(`Delete section "${section.title}"? Questions in this section will be removed.`)) {
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  /**
   * Returns whether the section title can be edited in the UI.
   */
  const canEditSectionTitle = (section: FixedFormSection): boolean => {
    if (section.type === 'header' || section.type === 'signatures') return false;
    if (isSystemTemplate) return Boolean(section.isCustom);
    return true;
  };

  if (showFilledPreview) {
    const visibleSections = filterVisibleSections(sections);
    const dummy = generateDummyJobCardPreviewData(visibleSections, template.templateKey);
    return (
      <FixedJobCardPrintView
        template={{ ...template, sections: visibleSections }}
        fieldValues={dummy.fieldValues}
        job={dummy.job}
        machine={dummy.machine}
        reportNumber={
          template.reportPrefix === 'MCC' || template.templateKey === 'mechanical_checklist'
            ? 'MCC000001'
            : 'RSR000001'
        }
        isPreviewSample
        onClose={() => setShowFilledPreview(false)}
      />
    );
  }

  const activeSection = modal ? sections.find((s) => s.id === modal.sectionId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {template.isSystemTemplate ? (
                <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
              ) : (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-xl font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 max-w-full"
                />
              )}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  template.isSystemTemplate
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-blue-100 text-blue-900'
                }`}
              >
                {template.isSystemTemplate ? 'System form' : 'Custom form'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {visibleCount} of {totalCount} questions visible to technicians
              {template.isSystemTemplate ? ' · Applies to this report only' : ' · Assign from Parts Ready'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowFilledPreview(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0969a9] text-white text-sm font-medium hover:bg-[#075a8f] disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-4">
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          Toggle sections or individual questions on/off. Use <strong>Add section</strong> to insert new
          blocks above sign-off. Job information and sign-off stay on every form. Hidden items won&apos;t
          appear on the technician app or printed report.
        </div>

        {sections.map((section) => {
          const sectionVisible = isTemplateItemVisible(section);
          const counts = countSectionVisibleItems(section);
          const isOpen = expanded[section.id] ?? true;
          const deletable = canDeleteTemplateSection(section, isSystemTemplate);
          const titleEditable = canEditSectionTitle(section);

          return (
            <div key={section.id}>
              {section.type === 'signatures' && (
                <button
                  type="button"
                  onClick={() => setShowSectionModal(true)}
                  className="w-full mb-4 py-3 px-4 rounded-lg border-2 border-dashed border-[#0969a9] text-[#0969a9] bg-blue-50/50 hover:bg-blue-50 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add section (above sign-off)
                </button>
              )}

              <div
                className={`bg-white rounded-lg border shadow-sm overflow-hidden mb-4 ${
                  !sectionVisible ? 'opacity-60' : ''
                }`}
              >
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !isOpen }))}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  {titleEditable ? (
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      className="font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 w-full max-w-md text-sm"
                    />
                  ) : (
                    <h2 className="font-semibold text-gray-900">{section.title}</h2>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {section.type === 'header'
                      ? 'Auto-filled job & machine details'
                      : section.type === 'signatures'
                        ? 'Technician & customer sign-off'
                        : `${counts.visible}/${counts.total} questions visible`}
                    {section.isCustom ? ' · Custom section' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setItemVisible(section.id, !sectionVisible)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    sectionVisible ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {sectionVisible ? (
                    <>
                      <ToggleRight className="w-4 h-4" /> Section on
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" /> Section off
                    </>
                  )}
                </button>
                {deletable && (
                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50"
                    title="Delete section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                {canAddToSection(section) && (
                  <button
                    type="button"
                    onClick={() => openAddModal(section.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0969a9] text-[#0969a9] text-xs font-medium hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add question
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="p-4 space-y-2">
                  {renderSectionQuestions(section, setItemVisible, openEditModal, deleteQuestion)}
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && activeSection && (
        <QuestionModal
          mode={modal.mode}
          section={activeSection}
          draft={draft}
          setDraft={setDraft}
          onClose={() => {
            setModal(null);
            setDraft(EMPTY_DRAFT);
          }}
          onSave={saveQuestion}
        />
      )}

      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Add section</h3>
            <p className="text-sm text-gray-600 mb-4">
              New sections are inserted above sign-off. Add questions inside the section after creating it.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section title</label>
            <input
              type="text"
              value={sectionDraft.title}
              onChange={(e) => setSectionDraft((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="e.g. Site safety checks"
              autoFocus
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Section type</label>
            <select
              value={sectionDraft.type}
              onChange={(e) =>
                setSectionDraft((prev) => ({
                  ...prev,
                  type: e.target.value as AddableSectionType,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="fields">Questions (text, yes/no, numbers)</option>
              <option value="checklist">Checklist (pass / fail / N/A)</option>
              <option value="yesno_list">Yes / No list</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSectionModal(false);
                  setSectionDraft({ title: '', type: 'fields' });
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addSection}
                disabled={!sectionDraft.title.trim()}
                className="px-4 py-2 rounded-lg bg-[#0969a9] text-white text-sm font-medium hover:bg-[#075a8f] disabled:opacity-60"
              >
                Add section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Returns whether admins can add questions to this section type.
 */
function canAddToSection(section: FixedFormSection): boolean {
  return ['checklist', 'yesno_list', 'fields', 'measurement_table'].includes(section.type);
}

/**
 * Renders editable question rows for a section.
 */
function renderSectionQuestions(
  section: FixedFormSection,
  setItemVisible: (
    sectionId: string,
    visible: boolean,
    target?: { kind: 'field' | 'item' | 'row'; id: string; rowId?: string }
  ) => void,
  openEditModal: (
    sectionId: string,
    itemKind: 'field' | 'item' | 'rowField',
    itemId: string,
    rowId?: string
  ) => void,
  deleteQuestion: (
    sectionId: string,
    itemKind: 'field' | 'item' | 'rowField',
    itemId: string,
    rowId?: string
  ) => void
) {
  if (section.type === 'checklist' && section.items) {
    if (section.items.length === 0) {
      return (
        <p className="text-sm text-gray-500 italic">
          No checklist items yet — click <strong>Add question</strong> above.
        </p>
      );
    }
    return section.items.map((item) => (
      <QuestionRow
        key={item.id}
        label={`${item.number}. ${item.label}`}
        meta={fieldTypeLabel('', item.inputType)}
        visible={isTemplateItemVisible(item)}
        isCustom={item.isCustom}
        onToggle={() => setItemVisible(section.id, !isTemplateItemVisible(item), { kind: 'item', id: item.id })}
        onEdit={() => openEditModal(section.id, 'item', item.id)}
        onDelete={() => deleteQuestion(section.id, 'item', item.id)}
      />
    ));
  }

  if (section.type === 'measurement_table' && section.rows) {
    return section.rows.flatMap((row) =>
      row.fields.map((field) => (
        <QuestionRow
          key={field.id}
          label={`${row.label ? `${row.label} · ` : ''}${field.label}`}
          meta={fieldTypeLabel(field.type)}
          visible={isTemplateItemVisible(field) && isTemplateItemVisible(row)}
          isCustom={field.isCustom}
          onToggle={() =>
            setItemVisible(section.id, !isTemplateItemVisible(field), {
              kind: 'field',
              id: field.id,
              rowId: row.id,
            })
          }
          onEdit={() => openEditModal(section.id, 'rowField', field.id, row.id)}
          onDelete={() => deleteQuestion(section.id, 'rowField', field.id, row.id)}
        />
      ))
    );
  }

  if (section.fields) {
    if (section.fields.length === 0 && section.type !== 'header' && section.type !== 'signatures') {
      return (
        <p className="text-sm text-gray-500 italic">
          No questions yet — click <strong>Add question</strong> above.
        </p>
      );
    }
    return section.fields.map((field) => (
      <QuestionRow
        key={field.id}
        label={field.label}
        meta={fieldTypeLabel(field.type)}
        visible={isTemplateItemVisible(field)}
        isCustom={field.isCustom}
        locked={field.type === 'jobField' || field.type === 'machineField'}
        onToggle={() =>
          setItemVisible(section.id, !isTemplateItemVisible(field), { kind: 'field', id: field.id })
        }
        onEdit={() => openEditModal(section.id, 'field', field.id)}
        onDelete={() => deleteQuestion(section.id, 'field', field.id)}
      />
    ));
  }

  return <p className="text-sm text-gray-500">No editable questions in this section.</p>;
}

interface QuestionRowProps {
  label: string;
  meta: string;
  visible: boolean;
  isCustom?: boolean;
  locked?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Single question row with show/hide and edit/delete actions.
 */
function QuestionRow({
  label,
  meta,
  visible,
  isCustom,
  locked,
  onToggle,
  onEdit,
  onDelete,
}: QuestionRowProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        visible ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          visible ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {visible ? 'On' : 'Off'}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${visible ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{label}</p>
        <p className="text-xs text-gray-400">
          {meta}
          {isCustom ? ' · Custom' : ''}
          {locked ? ' · Auto-filled' : ''}
        </p>
      </div>
      {!locked && (
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onEdit} className="p-2 rounded hover:bg-gray-100" title="Edit">
            <Pencil className="w-4 h-4 text-gray-600" />
          </button>
          {isCustom ? (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded hover:bg-red-50"
              title="Delete custom question"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface QuestionModalProps {
  mode: 'add' | 'edit';
  section: FixedFormSection;
  draft: QuestionDraft;
  setDraft: (draft: QuestionDraft) => void;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Modal for adding or editing a template question.
 */
function QuestionModal({ mode, section, draft, setDraft, onClose, onSave }: QuestionModalProps) {
  const isChecklist = section.type === 'checklist';
  const isYesNoList = section.type === 'yesno_list';
  const isMeasurement = section.type === 'measurement_table';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {mode === 'add' ? 'Add question' : 'Edit question'}
        </h3>

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Question / label</span>
            <input
              type="text"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter the question text"
            />
          </label>

          {isChecklist && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Answer type</span>
              <select
                value={draft.inputType}
                onChange={(e) => setDraft({ ...draft, inputType: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="pass_fail">Pass / Fail / N/A</option>
                <option value="number">Number reading</option>
                <option value="text">Text</option>
              </select>
            </label>
          )}

          {!isChecklist && !isYesNoList && !isMeasurement && mode === 'add' && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Field type</span>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="yesno">Yes / No</option>
                <option value="textarea">Text area</option>
                <option value="select">Select one</option>
              </select>
            </label>
          )}

          {isMeasurement && mode === 'add' && section.rows && section.rows.length > 1 && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Measurement group</span>
              <select
                value={draft.rowId}
                onChange={(e) => setDraft({ ...draft, rowId: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                {section.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label || row.id}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(draft.type === 'number' || draft.inputType === 'number' || isMeasurement) && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Unit (optional)</span>
              <input
                type="text"
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. °C, PSI"
              />
            </label>
          )}

          {draft.type === 'select' && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Options (comma separated)</span>
              <input
                type="text"
                value={draft.options}
                onChange={(e) => setDraft({ ...draft, options: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Option A, Option B, Option C"
              />
            </label>
          )}

          {!isChecklist && !isMeasurement && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
              />
              Required on mobile form
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.label.trim()}
            className="px-4 py-2 rounded-lg bg-[#0969a9] text-white text-sm font-medium hover:bg-[#075a8f] disabled:opacity-50"
          >
            {mode === 'add' ? 'Add question' : 'Save question'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use countVisibleTemplateFields from fixedJobCardSections */
export function countSystemTemplateFields(sections: FixedFormSection[] | undefined): number {
  return countVisibleTemplateFields(sections);
}
