/**
 * The default Bouwa proposal experience.
 *
 * Two places to be: the list of proposals, and the proposal you are working on.
 * There is no third page where the same questions appear in a different form,
 * and the detailed engineering interface is reached deliberately rather than by
 * scrolling past the workflow.
 *
 * Where you are is in the address, not in this component's state. A rep who
 * refreshes the browser on a preview, or sends the link to a colleague, or
 * comes back after the server was restarted, arrives at the same proposal
 * rather than at the list. Held in memory it would survive none of those, and
 * a preview that disappears on reload is a preview nobody trusts.
 *
 * The form model and the step sequence are read from the backend once and
 * handed down, so the questions this screen can ask are exactly the questions
 * the readiness contract knows about.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import type { AuditIntakeFormModel } from '../auditIntakeTypes';
import { BouwaAirAuditWorkflowPage } from '../pages/BouwaAirAuditWorkflowPage';
import { AdvancedTechnicalReview } from './AdvancedTechnicalReview';
import { DraftProposalsPage } from './DraftProposalsPage';
import { GuidedProposalWizard } from './GuidedProposalWizard';
import { ProposalPreviewPage } from './ProposalPreviewPage';
import { placeFromPath, proposalPath } from './proposalRouting';
import type { ProposalPlace } from './proposalRouting';
import { fetchWizardDraft, fetchWizardFormModel } from './wizardApi';
import type { WizardDraftView } from './wizardTypes';

export function BouwaGuidedProposalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const place = placeFromPath(location.pathname);

  const [formModel, setFormModel] = useState<AuditIntakeFormModel | null>(null);
  const [view, setView] = useState<WizardDraftView | null>(null);
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

  // The wizard and the technical review both work on the stored draft, so it is
  // read here whenever the address names one. The preview reads its own
  // document from the backend and does not need this.
  const needsDraft = place.kind === 'wizard' || place.kind === 'technical';
  const draftId = place.kind === 'list' ? null : place.draftId;

  useEffect(() => {
    if (!needsDraft || draftId === null) {
      setView(null);
      return;
    }
    let live = true;
    setProblem('');
    setView(null);
    fetchWizardDraft(draftId)
      .then(next => {
        if (live) setView(next);
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setProblem(
          reason instanceof Error
            ? reason.message
            : 'That proposal could not be opened.',
        );
        navigate('/bouwa', { replace: true });
      });
    return () => {
      live = false;
    };
  }, [needsDraft, draftId, navigate]);

  const go = useCallback(
    (next: ProposalPlace) => {
      navigate(proposalPath(next));
    },
    [navigate],
  );

  const open = useCallback(
    (id: string) => go({ kind: 'wizard', draftId: id }),
    [go],
  );

  if (problem !== '' && place.kind === 'list')
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

  // The preview reads the document back from the backend rather than being
  // handed what the wizard has in memory: what a customer is shown has to be
  // built from what was saved, not from what is still on screen.
  if (place.kind === 'preview')
    return (
      <ProposalPreviewPage
        draftId={place.draftId}
        onBack={() => open(place.draftId)}
        onOpenTechnicalReview={() =>
          go({ kind: 'technical', draftId: place.draftId })
        }
      />
    );

  // The standalone engineering workspace is preserved and reachable, but it is
  // its own tool with its own upload: it is not this proposal, and saying so
  // plainly is better than letting it look like this proposal's detail.
  if (place.kind === 'workspace')
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => open(place.draftId)}
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

  if (needsDraft && view === null)
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening the proposal…
      </p>
    );

  if (place.kind === 'technical' && view !== null)
    return (
      <AdvancedTechnicalReview
        view={view}
        formModel={formModel}
        onBack={() => open(place.draftId)}
        onOpenLegacyWorkspace={() =>
          go({ kind: 'workspace', draftId: place.draftId })
        }
      />
    );

  if (place.kind === 'wizard' && view !== null)
    return (
      <GuidedProposalWizard
        key={view.draft.draftId}
        initialView={view}
        formModel={formModel}
        onExit={() => navigate('/bouwa')}
        // Read back from the backend rather than handing over what is on
        // screen: the technical review is an inspection of what is stored.
        onOpenTechnicalReview={id => go({ kind: 'technical', draftId: id })}
        onPreview={id => go({ kind: 'preview', draftId: id })}
      />
    );

  return (
    <DraftProposalsPage
      onOpen={open}
      onPreview={id => go({ kind: 'preview', draftId: id })}
    />
  );
}

export default BouwaGuidedProposalPage;
