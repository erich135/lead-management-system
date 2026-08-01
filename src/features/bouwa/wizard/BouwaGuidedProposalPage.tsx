/**
 * The default Bouwa proposal experience.
 *
 * Two places to be: the list of proposals, and the proposal you are working on.
 * There is no third page where the same questions appear in a different form,
 * and the detailed engineering interface is reached deliberately rather than by
 * scrolling past the workflow.
 *
 * The form model and the step sequence are read from the backend once and
 * handed down, so the questions this screen can ask are exactly the questions
 * the readiness contract knows about.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import type { AuditIntakeFormModel } from '../auditIntakeTypes';
import { BouwaAirAuditWorkflowPage } from '../pages/BouwaAirAuditWorkflowPage';
import { DraftProposalsPage } from './DraftProposalsPage';
import { GuidedProposalWizard } from './GuidedProposalWizard';
import { fetchWizardDraft, fetchWizardFormModel } from './wizardApi';
import type { WizardDraftView } from './wizardTypes';

type Mode =
  | { kind: 'list' }
  | { kind: 'opening'; draftId: string }
  | { kind: 'wizard'; view: WizardDraftView }
  | { kind: 'technical'; draftId: string };

export function BouwaGuidedProposalPage() {
  const [formModel, setFormModel] = useState<AuditIntakeFormModel | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let live = true;
    fetchWizardFormModel()
      .then(model => {
        if (live) setFormModel(model);
      })
      .catch((reason: unknown) => {
        if (live)
          setProblem(
            reason instanceof Error
              ? reason.message
              : 'The proposal questions could not be read.',
          );
      });
    return () => {
      live = false;
    };
  }, []);

  const open = useCallback((draftId: string) => {
    setProblem('');
    setMode({ kind: 'opening', draftId });
    fetchWizardDraft(draftId)
      .then(view => setMode({ kind: 'wizard', view }))
      .catch((reason: unknown) => {
        setProblem(
          reason instanceof Error
            ? reason.message
            : 'That proposal could not be opened.',
        );
        setMode({ kind: 'list' });
      });
  }, []);

  if (problem !== '' && mode.kind === 'list')
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{problem}</p>
      </div>
    );

  if (formModel === null)
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening Bouwa proposals…
      </p>
    );

  if (mode.kind === 'technical')
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => open(mode.draftId)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ars-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to the proposal
          </button>
          <p className="text-xs text-slate-500">
            Advanced Technical Review — the full engineering interface. This screen
            scrolls; the guided workflow does not.
          </p>
        </div>
        <BouwaAirAuditWorkflowPage />
      </div>
    );

  if (mode.kind === 'opening')
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening the proposal…
      </p>
    );

  if (mode.kind === 'wizard')
    return (
      <GuidedProposalWizard
        key={mode.view.draft.draftId}
        initialView={mode.view}
        formModel={formModel}
        onExit={() => setMode({ kind: 'list' })}
        onOpenTechnicalReview={draftId => setMode({ kind: 'technical', draftId })}
      />
    );

  return <DraftProposalsPage onOpen={open} />;
}

export default BouwaGuidedProposalPage;
