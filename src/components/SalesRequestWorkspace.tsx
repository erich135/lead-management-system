import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import DiaryRfcForm from './diary/DiaryRfcForm';
import DiaryLoanRentalForm from './diary/DiaryLoanRentalForm';
import DiaryNewServiceLevelForm from './diary/DiaryNewServiceLevelForm';
import { FormWizardProgress, type FormWizardStep } from './ui';
import {
  createSalesRequest,
  deleteSalesRequest,
  getSalesRequest,
  submitSalesRequest,
  updateSalesRequest,
  type SalesRequest,
  type SalesRequestType,
} from '../lib/api';
import {
  SALES_REQUEST_TYPE_LABELS,
} from '../constants/salesRequestPermissions';
import {
  createEmptyFormForRequestType,
  normalizeFormForRequestType,
  validateSalesRequestForm,
} from '../utils/salesRequestValidation';
import SalesRequestAttachmentUpload, {
  type LocalRequestAttachment,
} from './SalesRequestAttachmentUpload';
import type { RfcFormData } from './diary/rfcFormUtils';
import type { LoanRentalFormData } from './diary/loanRentalFormUtils';
import type { NewServiceLevelFormData } from './diary/newServiceLevelFormUtils';

interface SalesRequestWorkspaceProps {
  requestId?: string;
  initialType?: SalesRequestType;
  salesLeadId?: string;
  onClose: () => void;
  onSaved?: (request: SalesRequest) => void;
  /** Called after a successful submit (status pending) before closing. */
  onSubmitted?: (request: SalesRequest) => void;
}

const WIZARD_STEPS: Record<SalesRequestType, FormWizardStep[]> = {
  rfc: [
    { id: 'customer', label: 'Customer' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'work', label: 'Work' },
    { id: 'parts', label: 'Parts' },
    { id: 'signoff', label: 'Sign-off' },
  ],
  loan_rental: [
    { id: 'customer', label: 'Customer' },
    { id: 'details', label: 'Details' },
    { id: 'units', label: 'Units' },
    { id: 'aux', label: 'Auxiliary' },
    { id: 'site', label: 'Site' },
    { id: 'signoff', label: 'Sign-off' },
  ],
  rfc_new_service_level: [
    { id: 'details', label: 'Details' },
    { id: 'customer', label: 'Customer' },
    { id: 'units', label: 'Units' },
    { id: 'site', label: 'Site' },
    { id: 'signoff', label: 'Sign-off' },
  ],
};

/**
 * Extracts a readable message from API / unknown thrown values.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

/**
 * Full-screen workspace for creating or editing a sales request draft,
 * then submitting it for admin review. Presentation includes wizard chrome;
 * save / submit APIs are unchanged.
 */
const SalesRequestWorkspace: React.FC<SalesRequestWorkspaceProps> = ({
  requestId,
  initialType,
  salesLeadId,
  onClose,
  onSaved,
  onSubmitted,
}) => {
  const [loading, setLoading] = useState(Boolean(requestId));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveHint, setAutoSaveHint] = useState<string | null>(null);
  const [request, setRequest] = useState<SalesRequest | null>(null);
  const [requestType, setRequestType] = useState<SalesRequestType | null>(
    initialType ?? null,
  );
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<LocalRequestAttachment[]>([]);
  const [wizardStep, setWizardStep] = useState(0);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );
  const autoSaveBusy = useRef(false);
  const formSnapshot = useRef('');

  /**
   * Tracks viewport width so mobile uses step-by-step wizard panels.
   */
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    /**
     * Syncs narrow-layout flag when the viewport crosses the mobile breakpoint.
     */
    const onChange = () => setIsNarrow(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  /**
   * Converts local attachment state into visit photo payloads for the API.
   */
  function buildVisitPhotosPayload(items: LocalRequestAttachment[]): Array<{
    id: string;
    dataUrl?: string;
    caption?: string;
  }> {
    return items
      .filter((item) => Boolean(item.dataUrl))
      .map((item) => ({
        id: item.id,
        dataUrl: item.dataUrl,
        caption: item.fileName,
      }));
  }

  /**
   * Hydrates the attachment picker from an existing sales request.
   */
  function hydrateAttachmentsFromRequest(loaded: SalesRequest): LocalRequestAttachment[] {
    const fromStored = (loaded.attachments || []).map((attachment, index) => ({
      id: attachment.clientRef || attachment._id || `stored-${index}`,
      fileName: attachment.originalName,
      mimeType: attachment.mimeType,
      dataUrl: '',
      stored: attachment,
    }));

    const fromVisitPhotos = (loaded.visitPhotos || [])
      .filter((photo) => Boolean(photo.dataUrl))
      .map((photo, index) => ({
        id: photo.id || `photo-${index}`,
        fileName: photo.caption || `Photo ${index + 1}`,
        mimeType: 'image/jpeg',
        dataUrl: photo.dataUrl || '',
      }));

    return [...fromStored, ...fromVisitPhotos];
  }

  /**
   * Loads an existing draft request for editing.
   */
  const loadRequest = useCallback(async () => {
    if (!requestId) return;

    setLoading(true);
    setError(null);
    try {
      const loaded = await getSalesRequest(requestId);
      setRequest(loaded);
      setRequestType(loaded.requestType);
      setFormData(normalizeFormForRequestType(loaded.requestType, loaded.formData));
      setAttachments(hydrateAttachmentsFromRequest(loaded));
      formSnapshot.current = JSON.stringify(
        normalizeFormForRequestType(loaded.requestType, loaded.formData),
      );
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load request'));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      loadRequest();
    } else if (initialType) {
      setFormData(createEmptyFormForRequestType(initialType));
    }
  }, [requestId, initialType, loadRequest]);

  useEffect(() => {
    setWizardStep(0);
  }, [requestType]);

  const validation =
    requestType != null ? validateSalesRequestForm(requestType, formData) : null;
  const steps = requestType ? WIZARD_STEPS[requestType] : [];
  const isReadOnly =
    request?.status != null &&
    request.status !== 'draft' &&
    request.status !== 'declined';
  const activeStepForForm = isNarrow && requestType ? wizardStep : null;

  /**
   * Persists the current form as a draft (create or update).
   */
  async function handleSaveDraft(options?: { silent?: boolean }): Promise<SalesRequest | null> {
    if (!requestType) {
      if (!options?.silent) {
        setError('Please select a request type first.');
      }
      return null;
    }

    if (!options?.silent) {
      setSaving(true);
    }
    if (!options?.silent) {
      setError(null);
    }
    try {
      const visitPhotos = buildVisitPhotosPayload(attachments);
      let saved: SalesRequest;
      if (request?._id) {
        saved = await updateSalesRequest(request._id, {
          formData,
          visitPhotos,
          ...(salesLeadId ? { salesLead: salesLeadId } : {}),
        });
      } else {
        saved = await createSalesRequest({
          requestType,
          formData,
          visitPhotos,
          ...(salesLeadId ? { salesLead: salesLeadId } : {}),
        });
      }
      setRequest(saved);
      setAttachments(hydrateAttachmentsFromRequest(saved));
      formSnapshot.current = JSON.stringify(formData);
      onSaved?.(saved);
      if (options?.silent) {
        setAutoSaveHint('Draft saved');
        window.setTimeout(() => setAutoSaveHint(null), 2000);
      }
      return saved;
    } catch (saveError: unknown) {
      console.error('Save draft failed:', saveError);
      if (!options?.silent) {
        setError(getErrorMessage(saveError, 'Failed to save draft'));
      }
      return null;
    } finally {
      if (!options?.silent) {
        setSaving(false);
      }
    }
  }

  /**
   * Debounced auto-save using the same create/update draft endpoints.
   */
  useEffect(() => {
    if (isReadOnly || !requestType || loading || submitting || saving) {
      return;
    }

    const serialized = JSON.stringify(formData);
    if (serialized === formSnapshot.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (autoSaveBusy.current) return;
      autoSaveBusy.current = true;
      void handleSaveDraft({ silent: true }).finally(() => {
        autoSaveBusy.current = false;
      });
    }, 2500);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounce on form edits
  }, [formData, requestType, isReadOnly, loading, submitting, saving]);

  /**
   * Saves then submits the request for admin review (status → pending).
   * Incomplete fields are allowed and remain empty for admin review.
   */
  async function handleSubmit(): Promise<void> {
    if (!requestType) {
      setError('Please select a request type first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const visitPhotos = buildVisitPhotosPayload(attachments);
      let current = request;
      if (!current?._id) {
        current = await createSalesRequest({
          requestType,
          formData,
          visitPhotos,
          ...(salesLeadId ? { salesLead: salesLeadId } : {}),
        });
        setRequest(current);
      } else {
        current = await updateSalesRequest(current._id, {
          formData,
          visitPhotos,
          ...(salesLeadId ? { salesLead: salesLeadId } : {}),
        });
        setRequest(current);
      }

      setAttachments(hydrateAttachmentsFromRequest(current));

      if (!current?._id) {
        throw new Error('Request was saved but no ID was returned from the server.');
      }

      const submitted = await submitSalesRequest(current._id);

      if (submitted.status !== 'pending') {
        throw new Error(
          `Submit completed but status is "${submitted.status}" instead of "pending".`,
        );
      }

      setRequest(submitted);
      onSaved?.(submitted);
      onSubmitted?.(submitted);
      onClose();
    } catch (submitError: unknown) {
      console.error('Submit request failed:', submitError);
      setError(getErrorMessage(submitError, 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Deletes a draft request and closes the workspace.
   */
  async function handleDeleteDraft(): Promise<void> {
    if (!request?._id) {
      onClose();
      return;
    }

    if (!window.confirm('Delete this draft request?')) return;

    setSaving(true);
    setError(null);
    try {
      await deleteSalesRequest(request._id);
      onClose();
    } catch (deleteError: unknown) {
      console.error('Delete draft failed:', deleteError);
      setError(getErrorMessage(deleteError, 'Failed to delete draft'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-line bg-surface-elevated/95 px-4 py-3 shadow-crm backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-crm p-2.5 text-ink-muted transition hover:bg-surface-muted hover:text-ink"
              aria-label="Close"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink">
                {request?.requestNumber
                  ? request.requestNumber
                  : 'New Sales Request'}
              </h1>
              <p className="truncate text-xs text-ink-muted">
                {requestType ? SALES_REQUEST_TYPE_LABELS[requestType] : 'Select request type'}
                {autoSaveHint ? ` · ${autoSaveHint}` : ''}
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {request?._id && (
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteDraft();
                  }}
                  disabled={saving || submitting}
                  className="inline-flex items-center gap-1 rounded-crm border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  void handleSaveDraft();
                }}
                disabled={saving || submitting || !requestType}
                className="crm-btn-secondary inline-flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={saving || submitting || !requestType || !validation?.valid}
                className="crm-btn-primary inline-flex items-center gap-1 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          )}
        </div>

        {requestType && steps.length > 0 && (
          <div className="mx-auto mt-3 max-w-4xl">
            <FormWizardProgress
              steps={steps}
              currentStep={Math.min(wizardStep, steps.length - 1)}
              onStepChange={isNarrow ? setWizardStep : undefined}
            />
          </div>
        )}

        {validation && !isReadOnly && (
          <div className="mx-auto mt-2 flex max-w-4xl items-center gap-2 text-xs text-ink-muted">
            <ClipboardList className="h-4 w-4 text-brand" />
            <span>
              Progress: {validation.filled}/{validation.total} important fields
            </span>
            {validation.valid && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready to submit
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mx-auto mt-3 flex max-w-4xl items-start gap-2 rounded-crm border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Action failed</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{error}</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 sm:pb-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {!requestId && !initialType && !requestType && (
            <section className="crm-glass rounded-crm-lg p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
                Request Type
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['rfc', 'loan_rental', 'rfc_new_service_level'] as SalesRequestType[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setRequestType(type);
                        setFormData(createEmptyFormForRequestType(type));
                        formSnapshot.current = '';
                      }}
                      className="rounded-crm-lg border border-line bg-surface-muted/60 px-4 py-5 text-left text-sm font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft"
                    >
                      {SALES_REQUEST_TYPE_LABELS[type]}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {requestType && (
            <SalesRequestAttachmentUpload
              requestId={request?._id}
              attachments={attachments}
              onChange={setAttachments}
              disabled={isReadOnly}
            />
          )}

          {requestType === 'rfc' && (
            <DiaryRfcForm
              value={formData as unknown as RfcFormData}
              onChange={(next) => setFormData(next as unknown as Record<string, unknown>)}
              disabled={isReadOnly}
              activeStep={activeStepForForm}
            />
          )}

          {requestType === 'loan_rental' && (
            <DiaryLoanRentalForm
              value={formData as unknown as LoanRentalFormData}
              onChange={(next) => setFormData(next as unknown as Record<string, unknown>)}
              disabled={isReadOnly}
              activeStep={activeStepForForm}
            />
          )}

          {requestType === 'rfc_new_service_level' && (
            <DiaryNewServiceLevelForm
              value={formData as unknown as NewServiceLevelFormData}
              onChange={(next) => setFormData(next as unknown as Record<string, unknown>)}
              disabled={isReadOnly}
              activeStep={activeStepForForm}
            />
          )}
        </div>
      </main>

      {!isReadOnly && requestType && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-surface-elevated/95 px-4 py-3 shadow-crm-lg backdrop-blur-md sm:hidden safe-area-inset-bottom">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            {isNarrow && wizardStep > 0 && (
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                className="crm-btn-secondary inline-flex flex-1 items-center justify-center gap-1 py-3"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {isNarrow && wizardStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.min(steps.length - 1, s + 1))}
                className="crm-btn-primary inline-flex flex-1 items-center justify-center gap-1 py-3"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveDraft();
                  }}
                  disabled={saving || submitting}
                  className="crm-btn-secondary inline-flex flex-1 items-center justify-center gap-1 py-3 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={saving || submitting || !validation?.valid}
                  className="crm-btn-primary inline-flex flex-[1.4] items-center justify-center gap-1 py-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for Approval
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesRequestWorkspace;
