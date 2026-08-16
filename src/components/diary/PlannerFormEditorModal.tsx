import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import {
  getAdminPlannerForm,
  listAdminPlannerForms,
  publishAdminPlannerForm,
  saveAdminPlannerFormDraft,
  type PlannerFormAdminTemplate,
  type PlannerFormContent,
  type PlannerFormType,
} from '../../lib/api';
import {
  appendElement,
  createBlankElement,
  ensureDraftElements,
  syncContentFromElements,
} from './formBuilderUtils';
import { VisualFormBuilder } from './VisualFormBuilder';

interface PlannerFormEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** System forms shown on the Form Editor home screen. */
const SYSTEM_FORM_TYPES: PlannerFormType[] = ['rfc', 'loan_rental', 'new_service_level'];

/**
 * Returns an icon for a known system form type.
 */
function formTypeIcon(type: string): React.ReactNode {
  if (type === 'loan_rental') return <Truck className="h-5 w-5" />;
  if (type === 'new_service_level') return <Wrench className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

/**
 * Fallback label/description when API data is still loading.
 */
function fallbackMeta(type: string): { name: string; description: string } {
  if (type === 'loan_rental') {
    return { name: 'Loan Rental', description: 'Loan & Rental request sheet' };
  }
  if (type === 'new_service_level') {
    return { name: 'New Service Level', description: 'New service level agreement' };
  }
  return { name: 'RFC', description: 'Internal Request For Costing' };
}

/**
 * Super Admin Form Editor — draft vs published, with done-editing confirm on save.
 */
export function PlannerFormEditorModal({
  isOpen,
  onClose,
}: PlannerFormEditorModalProps): React.ReactElement | null {
  const [forms, setForms] = useState<PlannerFormAdminTemplate[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<PlannerFormType | null>(null);
  const [draft, setDraft] = useState<PlannerFormContent | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showDonePrompt, setShowDonePrompt] = useState(false);

  /**
   * Loads Form Editor list (draft flag from backend).
   */
  const loadFormList = useCallback(async (): Promise<void> => {
    setListLoading(true);
    setError(null);
    try {
      const result = await listAdminPlannerForms();
      const byType = new Map((result.forms || []).map((form) => [form.type, form]));
      setForms(
        SYSTEM_FORM_TYPES.map(
          (type) =>
            byType.get(type) || {
              type,
              draft: {
                name: fallbackMeta(type).name,
                title: fallbackMeta(type).name,
                description: fallbackMeta(type).description,
                fields: [],
              },
              published: null,
              hasUnpublishedChanges: false,
            },
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setListLoading(false);
    }
  }, []);

  /**
   * Opens the builder using the persisted DRAFT configuration (not published).
   */
  const loadType = useCallback(async (type: PlannerFormType, autoAddField = false) => {
    setSelectedType(type);
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowDonePrompt(false);
    setDraft(null);
    try {
      const template = await getAdminPlannerForm(type);
      let nextDraft = ensureDraftElements(template.draft || template.published || {
        name: fallbackMeta(type).name,
        title: fallbackMeta(type).name,
        description: fallbackMeta(type).description,
        fields: [],
      });
      if (autoAddField) {
        const blank = createBlankElement('text', 1);
        const elements = appendElement(nextDraft.elements || [], blank);
        nextDraft = syncContentFromElements(nextDraft, elements);
      }
      setDraft(nextDraft);
      setPublishedVersion(template.published?.version ?? null);
      setHasUnpublishedChanges(Boolean(template.hasUnpublishedChanges));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load form template');
      setSelectedType(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setDraft(null);
      setError(null);
      setMessage(null);
      setShowDonePrompt(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    void loadFormList();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, loadFormList]);

  /**
   * Returns from the builder to the Form Editor list.
   */
  function goBackToFormList(): void {
    setSelectedType(null);
    setDraft(null);
    setError(null);
    setMessage(null);
    setShowDonePrompt(false);
    void loadFormList();
  }

  if (!isOpen) {
    return null;
  }

  /**
   * Opens the "Are you done editing?" prompt.
   */
  function handleSaveClick(): void {
    if (!selectedType || !draft) return;
    setShowDonePrompt(true);
    setError(null);
  }

  /**
   * Not done — save draft only. Card shows Draft saved + Continue editing.
   */
  async function handleNotDoneYet(): Promise<void> {
    if (!selectedType || !draft) return;
    setShowDonePrompt(false);
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = ensureDraftElements(draft);
      await saveAdminPlannerFormDraft(selectedType, payload);
      setSelectedType(null);
      setDraft(null);
      setMessage('Draft saved. Use Continue editing to keep working.');
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Yes, done — publish and clear draft status so the form card stays clean.
   */
  async function handleYesDone(): Promise<void> {
    if (!selectedType || !draft) return;
    setShowDonePrompt(false);
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const payload = ensureDraftElements(draft);
      await publishAdminPlannerForm(selectedType, payload);
      setSelectedType(null);
      setDraft(null);
      setMessage('Done. Form is live for reps.');
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finish form');
    } finally {
      setPublishing(false);
    }
  }

  /**
   * Direct publish (footer button) — same as Yes, done.
   */
  async function handlePublish(): Promise<void> {
    if (!selectedType || !draft) return;
    setShowDonePrompt(false);
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const payload = ensureDraftElements(draft);
      await publishAdminPlannerForm(selectedType, payload);
      setSelectedType(null);
      setDraft(null);
      setMessage('Done. Form is live for reps.');
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish form');
    } finally {
      setPublishing(false);
    }
  }

  const selectedListItem = forms.find((form) => form.type === selectedType);
  const headerTitle = selectedType
    ? selectedListItem?.published?.name ||
      selectedListItem?.draft?.name ||
      fallbackMeta(selectedType).name
    : 'Form Editor';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div className="relative flex h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-2">
            {selectedType ? (
              <button
                type="button"
                onClick={goBackToFormList}
                className="mt-0.5 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Back to Form Editor"
                title="Back to Form Editor"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900">{headerTitle}</h2>
              <p className="text-sm text-slate-500">
                {selectedType
                  ? 'Save asks if you are done. No = draft. Yes = live for reps.'
                  : 'Choose a form to open and edit'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close form editor"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {!selectedType ? (
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <button
                type="button"
                onClick={() => void loadType('rfc', true)}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-xl border border-ars-primary/40 bg-white px-3 py-2 text-xs font-bold text-ars-primary shadow-sm hover:bg-ars-primary/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add field
              </button>
              <p className="mb-3 pr-28 text-xs text-slate-600">
                Open a form below. Unfinished work stays as Draft until you say you are done.
              </p>

              {listLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading forms…
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {forms.map((item) => {
                    const meta = fallbackMeta(item.type);
                    const name = item.published?.name || item.draft?.name || meta.name;
                    const description =
                      item.published?.description ||
                      item.draft?.description ||
                      meta.description;
                    const hasDraft = Boolean(item.hasUnpublishedChanges);

                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => void loadType(item.type)}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-ars-primary hover:shadow-sm"
                      >
                        <span className="flex items-start gap-3">
                          <span className="rounded-xl bg-slate-50 p-2 text-ars-primary shadow-sm">
                            {formTypeIcon(item.type)}
                          </span>
                          <span>
                            <span className="block text-base font-extrabold text-slate-900">
                              {name}
                            </span>
                            <span className="mt-0.5 block text-sm text-slate-500">
                              {description}
                            </span>
                          </span>
                        </span>

                        {hasDraft ? (
                          <p className="text-xs font-bold text-amber-700">Draft saved</p>
                        ) : null}

                        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-ars-primary/10 px-2.5 py-1 text-xs font-bold text-ars-primary">
                          <Pencil className="h-3.5 w-3.5" />
                          {hasDraft ? 'Continue editing' : 'Open builder'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : loading || !draft ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading form…
            </div>
          ) : (
            <VisualFormBuilder
              draft={draft}
              publishedVersion={publishedVersion}
              hasUnpublishedChanges={hasUnpublishedChanges}
              onChange={(next) => {
                setDraft(next);
                setHasUnpublishedChanges(true);
              }}
            />
          )}

          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
        </div>

        {selectedType && draft ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={goBackToFormList}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Form Editor
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || publishing}
                onClick={handleSaveClick}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                disabled={saving || publishing}
                onClick={() => void handlePublish()}
                className="inline-flex items-center gap-2 rounded-xl bg-ars-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-ars-primary/90 disabled:opacity-50"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {publishing ? 'Publishing…' : 'Publish to reps'}
              </button>
            </div>
          </footer>
        ) : null}

        {showDonePrompt ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-extrabold text-slate-900">Are you done editing?</h3>
              <p className="mt-2 text-sm text-slate-600">
                <strong>No</strong> — save as draft and continue later.
                <br />
                <strong>Yes</strong> — you are done; make it live for reps (no draft on the card).
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={saving || publishing}
                  onClick={() => setShowDonePrompt(false)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || publishing}
                  onClick={() => void handleNotDoneYet()}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'No — save draft'}
                </button>
                <button
                  type="button"
                  disabled={saving || publishing}
                  onClick={() => void handleYesDone()}
                  className="rounded-xl bg-ars-primary px-3 py-2 text-sm font-bold text-white hover:bg-ars-primary/90 disabled:opacity-50"
                >
                  {publishing ? 'Publishing…' : 'Yes — done'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PlannerFormEditorModal;
