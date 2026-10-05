import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import type { PlannerFormContent, PlannerFormElement, PlannerFormFieldType } from '../../lib/api';
import { DynamicPlannerFormRenderer, createEmptyDynamicFormValues } from './DynamicPlannerFormRenderer';
import {
  createElementId,
  isInputElementType,
  syncContentFromElements,
} from './formBuilderUtils';

const ANSWER_TYPES: Array<{ value: PlannerFormFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Select one' },
  { value: 'checkbox', label: 'Select any' },
  { value: 'radio', label: 'Yes / No or one choice' },
];

const PROTECTED_KEYS = new Set([
  'customer',
  'companyname',
  'contactperson',
  'customername',
  'contactnumber',
  'telephone',
  'repcode',
  'branch',
]);

type QuestionDraft = {
  label: string;
  type: PlannerFormFieldType;
  required: boolean;
  options: string;
};

const EMPTY_DRAFT: QuestionDraft = {
  label: '',
  type: 'text',
  required: false,
  options: '',
};

/**
 * Customer, rep and branch questions stay linked to the existing visit and job behaviour.
 */
export function isProtectedPlannerFieldKey(key?: string | null): boolean {
  const normalized = (key || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return PROTECTED_KEYS.has(normalized);
}

/**
 * Counts questions that reps will see, including those inside switched-off sections as off.
 */
export function countRepQuestions(elements: PlannerFormElement[]): { enabled: number; total: number } {
  let enabled = 0;
  let total = 0;
  const walk = (items: PlannerFormElement[], ancestorsOn: boolean) => {
    for (const item of items) {
      const on = ancestorsOn && item.enabled !== false;
      if (item.type === 'section' && item.children?.length) {
        walk(item.children, on);
        continue;
      }
      if (!isInputElementType(item.type)) continue;
      total += 1;
      if (on) enabled += 1;
    }
  };
  walk(elements, true);
  return { enabled, total };
}

function mapElements(
  elements: PlannerFormElement[],
  id: string,
  update: (element: PlannerFormElement) => PlannerFormElement,
): PlannerFormElement[] {
  return elements.map((element) => {
    if (element.id === id) return update(element);
    if (element.children?.length) {
      return { ...element, children: mapElements(element.children, id, update) };
    }
    return element;
  });
}

function findElement(elements: PlannerFormElement[], id: string): PlannerFormElement | null {
  for (const element of elements) {
    if (element.id === id) return element;
    if (element.children?.length) {
      const nested = findElement(element.children, id);
      if (nested) return nested;
    }
  }
  return null;
}

interface RepFormQuestionEditorProps {
  draft: PlannerFormContent;
  onChange: (next: PlannerFormContent) => void;
}

/**
 * RSR-style editor for rep visit forms. It edits the existing planner element tree.
 */
export function RepFormQuestionEditor({
  draft,
  onChange,
}: RepFormQuestionEditorProps): React.ReactElement {
  const elements = draft.elements || [];
  const counts = useMemo(() => countRepQuestions(elements), [elements]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [showSection, setShowSection] = useState(false);
  const [modal, setModal] = useState<
    | { mode: 'add'; sectionId: string }
    | { mode: 'edit'; sectionId: string; elementId: string }
    | null
  >(null);
  const [question, setQuestion] = useState<QuestionDraft>(EMPTY_DRAFT);

  function commit(nextElements: PlannerFormElement[]): void {
    onChange(syncContentFromElements(draft, nextElements));
  }

  function toggle(id: string, enabled: boolean): void {
    const current = findElement(elements, id);
    if (current && isProtectedPlannerFieldKey(current.key) && !enabled) return;
    commit(mapElements(elements, id, (element) => ({ ...element, enabled })));
  }

  function openAdd(sectionId: string): void {
    setQuestion(EMPTY_DRAFT);
    setModal({ mode: 'add', sectionId });
  }

  function openEdit(sectionId: string, element: PlannerFormElement): void {
    setQuestion({
      label: element.label || '',
      type: isInputElementType(element.type) ? element.type : 'text',
      required: Boolean(element.required),
      options: (element.options || []).map((option) => option.label).join(', '),
    });
    setModal({ mode: 'edit', sectionId, elementId: element.id });
  }

  function saveQuestion(): void {
    if (!modal || !question.label.trim()) return;
    const options = question.options
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({
        label,
        value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'option',
      }));
    const needsOptions = question.type === 'dropdown' || question.type === 'checkbox' || question.type === 'radio';

    if (modal.mode === 'add') {
      const id = createElementId('fld');
      const created: PlannerFormElement = {
        id,
        type: question.type,
        order: 1,
        enabled: true,
        label: question.label.trim(),
        key: id,
        required: question.required,
        options: needsOptions ? options : [],
        width: 'full',
        settings: { visibility: true },
        children: [],
      };
      commit(
        mapElements(elements, modal.sectionId, (section) => ({
          ...section,
          children: [...(section.children || []), { ...created, order: (section.children || []).length + 1 }],
        })),
      );
    } else {
      commit(
        mapElements(elements, modal.elementId, (element) => ({
          ...element,
          label: question.label.trim(),
          type: isProtectedPlannerFieldKey(element.key) ? element.type : question.type,
          required: question.required,
          options: needsOptions ? options : element.options,
        })),
      );
    }
    setModal(null);
  }

  function addSection(): void {
    const title = sectionTitle.trim();
    if (!title) return;
    const id = createElementId('sec');
    commit([
      ...elements,
      {
        id,
        type: 'section',
        order: elements.length + 1,
        enabled: true,
        label: title,
        settings: { visibility: true },
        children: [],
      },
    ]);
    setSectionTitle('');
    setShowSection(false);
    setExpanded((current) => ({ ...current, [id]: true }));
  }

  const sections = elements.filter((element) => element.type === 'section');
  const previewValues = useMemo(
    () => createEmptyDynamicFormValues(draft.fields || []),
    [draft.fields],
  );

  if (preview) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
        >
          Back to editor
        </button>
        <DynamicPlannerFormRenderer
          schema={{ ...draft, type: 'preview' }}
          values={previewValues}
          onChange={() => undefined}
          disabled
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p>
          Switch a section or question off to leave it out of the next published version.{' '}
          <strong>
            {counts.enabled} of {counts.total} questions on
          </strong>
          .
        </p>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          <Eye className="h-4 w-4" />
          Preview as rep
        </button>
      </div>

      {sections.map((section) => {
        const sectionOn = section.enabled !== false;
        const sectionCounts = countRepQuestions(section.enabled === false ? [] : section.children || []);
        const allCounts = countRepQuestions([section]);
        const open = expanded[section.id] !== false;
        return (
          <section key={section.id} className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setExpanded((current) => ({ ...current, [section.id]: !open }))}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block font-bold text-slate-900">{section.label || 'Section'}</span>
                <span className="text-xs text-slate-500">
                  {sectionOn ? `${sectionCounts.enabled} of ${allCounts.total} questions on` : 'Section off'}
                </span>
              </button>
              <button
                type="button"
                aria-label={sectionOn ? `Switch off ${section.label}` : `Switch on ${section.label}`}
                onClick={() => toggle(section.id, !sectionOn)}
              >
                {sectionOn ? (
                  <ToggleRight className="h-7 w-7 text-[#0969a9]" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-slate-400" />
                )}
              </button>
            </div>
            {open ? (
              <div className="space-y-2 border-t border-slate-100 px-4 py-3">
                {(section.children || []).filter((child) => isInputElementType(child.type)).map((child) => {
                  const on = sectionOn && child.enabled !== false;
                  const locked = isProtectedPlannerFieldKey(child.key);
                  return (
                    <div key={child.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{child.label}</p>
                        <p className="text-xs text-slate-500">
                          {ANSWER_TYPES.find((type) => type.value === child.type)?.label || child.type}
                          {child.required ? ' · Required' : ''}
                          {locked ? ' · Linked to the customer, rep or branch' : ''}
                        </p>
                      </div>
                      <button type="button" aria-label={`Edit ${child.label}`} onClick={() => openEdit(section.id, child)}>
                        <Pencil className="h-4 w-4 text-slate-600" />
                      </button>
                      {locked ? null : (
                        <button
                          type="button"
                          aria-label={on ? `Switch off ${child.label}` : `Switch on ${child.label}`}
                          onClick={() => toggle(child.id, !on)}
                        >
                          {on ? (
                            <ToggleRight className="h-6 w-6 text-[#0969a9]" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
                {(section.children || []).filter((child) => !isInputElementType(child.type) && child.type !== 'section').length > 0 ? (
                  <p className="text-xs text-slate-500">This section also includes notes shown to the rep.</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => openAdd(section.id)}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#0969a9]"
                >
                  <Plus className="h-4 w-4" />
                  Add question
                </button>
              </div>
            ) : null}
          </section>
        );
      })}

      {showSection ? (
        <div className="flex gap-2">
          <input
            value={sectionTitle}
            onChange={(event) => setSectionTitle(event.target.value)}
            placeholder="Section name"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button type="button" onClick={addSection} className="rounded-lg bg-[#0969a9] px-3 py-2 text-sm font-bold text-white">
            Add section
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowSection(true)} className="text-sm font-bold text-[#0969a9]">
          Add section
        </button>
      )}

      {modal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">{modal.mode === 'add' ? 'Add question' : 'Edit question'}</h3>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Question</span>
                <input
                  value={question.label}
                  onChange={(event) => setQuestion({ ...question, label: event.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Answer type</span>
                <select
                  value={question.type}
                  onChange={(event) =>
                    setQuestion({ ...question, type: event.target.value as PlannerFormFieldType })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {ANSWER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              {question.type === 'dropdown' || question.type === 'checkbox' || question.type === 'radio' ? (
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Choices, separated by commas</span>
                  <input
                    value={question.options}
                    onChange={(event) => setQuestion({ ...question, options: event.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(event) => setQuestion({ ...question, required: event.target.checked })}
                />
                Required
              </label>
              {modal.mode === 'edit' && isProtectedPlannerFieldKey(findElement(elements, modal.elementId)?.key) ? (
                <p className="text-sm text-slate-600">
                  This question stays on the form. It is linked to the customer, the rep, or the branch used when a job is created. Changing the wording does not change that link.
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={!question.label.trim()}
                onClick={saveQuestion}
                className="rounded-lg bg-[#0969a9] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {modal.mode === 'add' ? 'Add question' : 'Save question'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
