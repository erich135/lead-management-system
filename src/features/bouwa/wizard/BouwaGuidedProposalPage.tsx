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
import { AdvancedTechnicalReview } from './AdvancedTechnicalReview';
import { DraftProposalsPage } from './DraftProposalsPage';
import { GuidedProposalWizard } from './GuidedProposalWizard';
import { fetchWizardDraft, fetchWizardFormModel } from './wizardApi';
import type { WizardDraftView } from './wizardTypes';

type Mode =
  | { kind: 'list' }
  | { kind: 'opening'; draftId: string }
  | { kind: 'wizard'; view: WizardDraftView }
  | { kind: 'technical'; view: WizardDraftView }
  | { kind: 'workspace'; draftId: string };

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

  const openAs = useCallback((draftId: string, kind: 'wizard' | 'technical') => {
    setProblem('');
    setMode({ kind: 'opening', draftId });
    fetchWizardDraft(draftId)
      .then(view => setMode({ kind, view }))
      .catch((reason: unknown) => {
        setProblem(
          reason instanceof Error
            ? reason.message
            : 'That proposal could not be opened.',
        );
        setMode({ kind: 'list' });
      });
  }, []);

  const open = useCallback(
    (draftId: string) => openAs(draftId, 'wizard'),
    [openAs],
  );

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
      <AdvancedTechnicalReview
        view={mode.view}
        formModel={formModel}
        onBack={() => open(mode.view.draft.draftId)}
        onOpenLegacyWorkspace={() =>
          setMode({ kind: 'workspace', draftId: mode.view.draft.draftId })
        }
      />
    );

  // The standalone engineering workspace is preserved and reachable, but it is
  // its own tool with its own upload: it is not this proposal, and saying so
  // plainly is better than letting it look like this proposal's detail.
  if (mode.kind === 'workspace')
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
            Standalone air-audit workspace. It holds its own working copy and does
            not read or write the saved proposal.
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
        // Read back from the backend rather than handing over what is on
        // screen: the technical review is an inspection of what is stored.
        onOpenTechnicalReview={draftId => openAs(draftId, 'technical')}
      />
    );

  return <DraftProposalsPage onOpen={open} />;
}

export default BouwaGuidedProposalPage;
