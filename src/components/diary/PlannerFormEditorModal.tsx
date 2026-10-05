import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ClipboardList,
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
  archiveAdminPlannerForm,
  createAdminPlannerForm,
  getAdminPlannerForm,
  listAdminPlannerForms,
  publishAdminPlannerForm,
  restoreAdminPlannerForm,
  saveAdminPlannerFormDraft,
  unpublishAdminPlannerForm,
  type PlannerFormAdminTemplate,
  type PlannerFormContent,
  type PlannerFormType,
} from '../../lib/api';
import {
  ensureDraftElements,
} from './formBuilderUtils';
import { RepFormQuestionEditor } from './RepFormQuestionEditor';
import {
  generalVisitFormStatusLabel,
  isGeneralVisitAdminForm,
  splitAdminPlannerForms,
  SYSTEM_FORM_TYPES,
} from './plannerFormEditorUtils';

interface PlannerFormEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Returns an icon for a known system form type.
 */
function formTypeIcon(type: string): React.ReactNode {
  if (type === 'loan_rental') return <Truck className="h-5 w-5" />;
  if (type === 'new_service_level') return <Wrench className="h-5 w-5" />;
  if (type.startsWith('general_visit_')) return <ClipboardList className="h-5 w-5" />;
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
  if (type === 'rental_rfc') {
    return { name: 'Rental RFC', description: 'Rental request captured during the visit' };
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
  const [generalVisitForms, setGeneralVisitForms] = useState<PlannerFormAdminTemplate[]>([]);
  const [archivedForms, setArchivedForms] = useState<PlannerFormAdminTemplate[]>([]);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<PlannerFormType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PlannerFormAdminTemplate | null>(null);
  const [draft, setDraft] = useState<PlannerFormContent | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateGeneralVisit, setShowCreateGeneralVisit] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  /**
   * Loads Form Editor list (draft flag from backend).
   */
  const loadFormList = useCallback(async (): Promise<void> => {
    setListLoading(true);
    setError(null);
    try {
      const result = await listAdminPlannerForms();
      const split = splitAdminPlannerForms(result.forms || []);
      setForms(split.systemForms);
      setGeneralVisitForms(split.generalVisitForms);
      setArchivedForms(split.archivedForms);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setListLoading(false);
    }
  }, []);

  /**
   * Opens the builder using the persisted DRAFT configuration (not published).
   */
  const loadType = useCallback(async (type: PlannerFormType) => {
    setSelectedType(type);
    setLoading(true);
    setError(null);
    setMessage(null);
    setDraft(null);
    try {
      const template = await getAdminPlannerForm(type);
      const nextDraft = ensureDraftElements(template.draft || template.published || {
        name: fallbackMeta(type).name,
        title: fallbackMeta(type).name,
        description: fallbackMeta(type).description,
        fields: [],
      });
      setDraft(nextDraft);
      setPublishedVersion(template.published?.version ?? null);
      setHasUnpublishedChanges(Boolean(template.hasUnpublishedChanges));
      setSelectedTemplate(template);
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
      setSelectedTemplate(null);
      setDraft(null);
      setError(null);
      setMessage(null);
      setShowCreateGeneralVisit(false);
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
    setSelectedTemplate(null);
    setDraft(null);
    setError(null);
    setMessage(null);
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
    setError(null);
    void handleNotDoneYet();
  }

  /**
   * Not done — save draft only. Card shows Draft saved + Continue editing.
   */
  async function handleNotDoneYet(): Promise<void> {
    if (!selectedType || !draft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = ensureDraftElements(draft);
      const updated = await saveAdminPlannerFormDraft(selectedType, payload);
      setSelectedTemplate(updated);
      setHasUnpublishedChanges(true);
      setMessage('Draft saved. Representatives will not see it until you publish.');
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Publishes the current draft as the next version for future visits.
   */
  async function handlePublish(): Promise<void> {
    if (!selectedType || !draft) return;
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

  /**
   * Creates a draft General Visit form from the name/description dialog.
   */
  async function handleCreateGeneralVisit(): Promise<void> {
    const name = createName.trim();
    if (!name) {
      setError('Enter a form name.');
      return;
    }
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createAdminPlannerForm({
        name,
        description: createDescription.trim() || undefined,
        category: 'general_visit',
      });
      setShowCreateGeneralVisit(false);
      setCreateName('');
      setCreateDescription('');
      setMessage('Draft General Visit form created. It stays hidden from reps until you publish.');
      await loadFormList();
      await loadType(created.type);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create General Visit form');
    } finally {
      setCreating(false);
    }
  }

  async function handleUnpublish(): Promise<void> {
    if (!selectedType) return;
    setMutating(true);
    setError(null);
    try {
      const updated = await unpublishAdminPlannerForm(selectedType);
      setSelectedTemplate(updated);
      setPublishedVersion(null);
      setHasUnpublishedChanges(true);
      setMessage('Form unpublished. Representatives will not see it.');
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish form');
    } finally {
      setMutating(false);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!selectedType) return;
    setShowArchiveConfirm(false);
    setMutating(true);
    setError(null);
    try {
      const updated = await archiveAdminPlannerForm(selectedType);
      setSelectedTemplate(updated);
      setMessage('Form archived. It is hidden from representatives.');
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive form');
    } finally {
      setMutating(false);
    }
  }

  async function handleRestore(): Promise<void> {
    if (!selectedType) return;
    setMutating(true);
    setError(null);
    try {
      const updated = await restoreAdminPlannerForm(selectedType);
      setSelectedTemplate(updated);
      setMessage(
        updated.published
          ? 'Form restored. Representatives see the last published version. Draft edits stay unpublished until you publish.'
          : 'Form restored. It stays hidden from representatives until you publish.',
      );
      await loadFormList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore form');
    } finally {
      setMutating(false);
    }
  }

  const selectedListItem =
    forms.find((form) => form.type === selectedType) ||
    generalVisitForms.find((form) => form.type === selectedType) ||
    selectedTemplate;
  const isSelectedGeneralVisit = Boolean(
    selectedListItem && isGeneralVisitAdminForm(selectedListItem),
  );
  const canArchiveSelected = Boolean(
    selectedType &&
      (isSelectedGeneralVisit || (SYSTEM_FORM_TYPES as readonly string[]).includes(selectedType)),
  );
  const headerTitle = selectedType
    ? selectedListItem?.published?.name ||
      selectedListItem?.draft?.name ||
      (isSelectedGeneralVisit ? 'General Visit Form' : fallbackMeta(selectedType).name)
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
                  ? `Save draft keeps this private. Publish sends it to representatives.${publishedVersion ? ` Published version ${publishedVersion}.` : ''}`
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
              <p className="mb-3 text-xs text-slate-600">
                Open a form, switch questions on or off, then save a draft or publish.
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

              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">General Visit forms</h3>
                    <p className="text-xs text-slate-500">
                      Create custom visit forms. Drafts stay hidden from representatives until
                      published.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGeneralVisit(true);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ars-primary px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-ars-primary/90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create General Visit Form
                  </button>
                </div>

                {generalVisitForms.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                    No custom General Visit forms yet.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {generalVisitForms.map((item) => {
                      const name = item.published?.name || item.draft?.name || 'General Visit';
                      const description =
                        item.published?.description || item.draft?.description || '';
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
                              {description ? (
                                <span className="mt-0.5 block text-sm text-slate-500">
                                  {description}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <p className="text-xs font-bold text-slate-600">
                            {generalVisitFormStatusLabel(item)}
                          </p>
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-ars-primary/10 px-2.5 py-1 text-xs font-bold text-ars-primary">
                            <Pencil className="h-3.5 w-3.5" />
                            Open builder
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-extrabold text-slate-900">Archived forms</h3>
                <p className="mb-3 text-xs text-slate-500">
                  Archived forms are hidden from new visits. Existing visits, answers and documents stay as they are.
                </p>
                {archivedForms.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                    No archived forms.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {archivedForms.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => void loadType(item.type)}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
                      >
                        <span className="block text-base font-extrabold text-slate-900">
                          {item.published?.name || item.draft?.name || item.type}
                        </span>
                        <span className="mt-1 block text-xs font-bold text-slate-600">Archived</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : loading || !draft ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading form…
            </div>
          ) : (
            <RepFormQuestionEditor
              draft={draft}
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
              {isSelectedGeneralVisit && selectedListItem?.published ? (
                <button
                  type="button"
                  disabled={saving || publishing || mutating}
                  onClick={() => void handleUnpublish()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Unpublish
                </button>
              ) : null}
              {canArchiveSelected && selectedListItem?.isActive !== false ? (
                <button
                  type="button"
                  disabled={saving || publishing || mutating}
                  onClick={() => setShowArchiveConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              ) : null}
              {canArchiveSelected && selectedListItem?.isActive === false ? (
                <button
                  type="button"
                  disabled={saving || publishing || mutating}
                  onClick={() => void handleRestore()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Restore
                </button>
              ) : null}
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
                disabled={saving || publishing || selectedListItem?.isActive === false}
                onClick={() => void handlePublish()}
                className="inline-flex items-center gap-2 rounded-xl bg-ars-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-ars-primary/90 disabled:opacity-50"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {publishing ? 'Publishing…' : 'Publish to reps'}
              </button>
            </div>
          </footer>
        ) : null}

        {showCreateGeneralVisit ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-lg font-extrabold text-slate-900">Create General Visit Form</h3>
              <p className="mt-2 text-sm text-slate-600">
                Creates a draft only. Representatives will not see it until you publish.
              </p>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Form name
                <input
                  type="text"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                  placeholder="Site safety walk"
                />
              </label>
              <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Description
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
                  placeholder="Optional details shown to representatives"
                />
              </label>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateGeneralVisit(false)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void handleCreateGeneralVisit()}
                  className="rounded-xl bg-ars-primary px-3 py-2 text-sm font-bold text-white hover:bg-ars-primary/90 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create draft'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showArchiveConfirm ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900">Archive form</h3>
              <p className="mt-3 text-sm text-gray-700">
                {headerTitle} will no longer be available for new selection. Existing visits, answers,
                submissions and documents remain intact.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() => setShowArchiveConfirm(false)}
                  className="px-4 py-2 text-sm font-bold uppercase text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() => void handleArchive()}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                  Archive form
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
