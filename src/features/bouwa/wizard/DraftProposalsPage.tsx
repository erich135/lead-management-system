/**
 * Draft Proposals.
 *
 * The list a user comes back to. Every row states enough to decide whether to
 * open it — who it is for, what kind of proposal it is, how far it got, what it
 * is waiting on and when it was last saved — and Continue reopens the exact
 * step and page it was left on.
 *
 * A saved draft is not a finished proposal, and nothing here says otherwise.
 * The readiness column reports the stage the backend assessed, not progress
 * through the questions.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Copy,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Wind,
} from 'lucide-react';

import {
  archiveWizardDraft,
  createWizardDraft,
  duplicateWizardDraft,
  listWizardDrafts,
} from './wizardApi';
import { EVIDENCE_LEVEL_TONE } from './evidenceLevelPresentation';
import { draftReadinessLabel, formatSavedAt } from './wizardState';
import {
  PROPOSAL_TYPE_LABELS,
  MANUAL_BASIS_LABELS,
  type WizardDraftSummary,
} from './wizardTypes';

export interface DraftProposalsPageProps {
  onOpen: (draftId: string) => void;
}

export function DraftProposalsPage({ onOpen }: DraftProposalsPageProps) {
  const [drafts, setDrafts] = useState<WizardDraftSummary[]>([]);
  const [status, setStatus] = useState<'draft' | 'archived'>('draft');
  const [onlyMine, setOnlyMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setProblem('');
    try {
      setDrafts(await listWizardDrafts({ status, onlyMine }));
    } catch (error: unknown) {
      setProblem(
        error instanceof Error
          ? error.message
          : 'The proposal list could not be read.',
      );
    } finally {
      setLoading(false);
    }
  }, [status, onlyMine]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startProposal() {
    setBusy(true);
    setProblem('');
    try {
      const created = await createWizardDraft('air_audit', null);
      onOpen(created.draft.draftId);
    } catch (error: unknown) {
      setProblem(
        error instanceof Error
          ? error.message
          : 'A new proposal could not be started.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    setProblem('');
    try {
      await work();
      await load();
    } catch (error: unknown) {
      setProblem(
        error instanceof Error ? error.message : 'That action was refused.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Draft Proposals</h2>
          <p className="text-xs text-slate-500">
            Every proposal is saved on the server. Leave whenever you like and
            carry on from the same step.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void startProposal()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ars-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New proposal
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(['draft', 'archived'] as const).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-full border px-3 py-1 font-medium ${
              status === value
                ? 'border-ars-primary bg-blue-50 text-ars-primary'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {value === 'draft' ? 'In progress' : 'Archived'}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-slate-600">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={event => setOnlyMine(event.target.checked)}
          />
          Only mine
        </label>
      </div>

      {problem === '' ? null : (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {problem}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 px-1 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading your proposals…
        </p>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
          <FileText className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            {status === 'draft'
              ? 'No proposals in progress'
              : 'Nothing archived'}
          </p>
          {status === 'draft' ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Start one and the wizard will ask for what it needs, a step at a time.
            </p>
          ) : null}
        </div>
      ) : (
        <ul data-testid="wizard-draft-list" className="space-y-2">
          {drafts.map(summary => (
            <li
              key={summary.draftId}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {summary.reference}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {summary.proposalType === 'air_audit' ? (
                        <Wind className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {PROPOSAL_TYPE_LABELS[summary.proposalType]}
                      {summary.manualBasis === null
                        ? ''
                        : ` · ${MANUAL_BASIS_LABELS[summary.manualBasis]}`}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        EVIDENCE_LEVEL_TONE[
                          summary.readinessSummary.evidenceLevel
                        ]
                      }`}
                    >
                      {summary.readinessSummary.evidenceLevelLabel}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-700">
                    {summary.customer.customerName ?? 'Customer not chosen yet'}
                    {summary.customer.siteName === null
                      ? ''
                      : ` — ${summary.customer.siteName}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Step {summary.stepPosition} of {summary.stepTotal} —{' '}
                    {summary.currentStepTitle} · {draftReadinessLabel(summary)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {summary.ownerName} · last saved{' '}
                    {formatSavedAt(summary.updatedAt)}
                    {summary.sourceFilename === null
                      ? ''
                      : ` · ${summary.sourceFilename}`}
                    {summary.attachedDocumentCount === 0
                      ? ''
                      : ` · ${summary.attachedDocumentCount} document${
                          summary.attachedDocumentCount === 1 ? '' : 's'
                        }`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(summary.draftId)}
                    className="rounded-lg bg-ars-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    {summary.status === 'archived' ? 'View summary' : 'Continue'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(() => duplicateWizardDraft(summary.draftId))
                    }
                    title="Copy the customer, site and settings into a new proposal. Measurements are not copied."
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  {summary.status === 'archived' || !summary.mayEdit ? null : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          archiveWizardDraft(
                            summary.draftId,
                            summary.revision,
                            null,
                          ),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
