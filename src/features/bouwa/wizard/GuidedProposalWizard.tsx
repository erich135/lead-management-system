/**
 * The guided proposal workflow.
 *
 * One step is on screen at a time, and a step that holds more questions than a
 * screen can carry is paged rather than made longer. The position — step and
 * page — is part of the saved draft, so coming back a week later reopens the
 * questions the user was actually looking at.
 *
 * The footer is fixed and always offers the same three things: go back, save
 * and leave, or save and carry on. Each of the three saves first, so no route
 * out of a screen loses what was entered on it.
 *
 * A step may only be left when every question on it has been answered one way
 * or another. "Unknown" is one of those ways, and choosing it keeps the outputs
 * that depend on the answer blocked. That is the whole bargain of this
 * workflow: a user is never forced to invent a figure, and a figure is never
 * invented for them.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

import { readAnswerAtPath } from '../auditIntakeState';
import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
} from '../auditIntakeTypes';
import { WizardAnswerField } from './components/WizardAnswerField';
import { WizardEvidenceGroups } from './components/WizardEvidenceGroups';
import { WizardReadinessStrip } from './components/WizardReadinessSummary';
import { WizardFooter, WizardShell } from './components/WizardShell';
import { ProposalTypeStep } from './steps/ProposalTypeStep';
import { ReviewStep } from './steps/ReviewStep';
import { UploadAuditStep } from './steps/UploadAuditStep';
import { useWizardDraft } from './useWizardDraft';
import {
  clampPageIndex,
  hasUnsavedWork,
  moveBack,
  moveForward,
  outstandingOnScreen,
  stepFieldViews,
  stepPages,
  type WizardFieldView,
} from './wizardState';
import type { WizardDraftView, WizardStep, WizardStepId } from './wizardTypes';

type Screen =
  | { kind: 'proposal_type' }
  | { kind: 'upload' }
  | { kind: 'review' }
  | { kind: 'fields'; fields: WizardFieldView[] };

function screensForStep(
  step: WizardStep,
  formModel: AuditIntakeFormModel,
  readiness: AuditReadinessAssessment,
): Screen[] {
  if (step.id === 'proposal_type') return [{ kind: 'proposal_type' }];
  if (step.id === 'review') return [{ kind: 'review' }];
  const pages = stepPages(stepFieldViews(step, formModel, readiness)).map(
    page => ({ kind: 'fields', fields: page.fields }) as Screen,
  );
  if (step.id === 'upload_audit') return [{ kind: 'upload' }, ...pages];
  return pages;
}

export interface GuidedProposalWizardProps {
  initialView: WizardDraftView;
  formModel: AuditIntakeFormModel;
  onExit: () => void;
  onOpenTechnicalReview: (draftId: string) => void;
}

export function GuidedProposalWizard({
  initialView,
  formModel,
  onExit,
  onOpenTechnicalReview,
}: GuidedProposalWizardProps) {
  const draft = useWizardDraft(initialView);
  const { view, intake, saveState, conflict, busy, mayEdit } = draft;

  const steps = view.steps;
  const [stepId, setStepId] = useState<WizardStepId>(view.draft.currentStepId);
  const [pageIndex, setPageIndex] = useState(view.draft.currentPageIndex);
  const [hint, setHint] = useState('');
  const [leaving, setLeaving] = useState(false);

  // The backend decides which steps a proposal type has. Changing the type can
  // therefore remove the step being shown, and the backend says where to land.
  useEffect(() => {
    if (!steps.some(step => step.id === stepId)) {
      setStepId(view.draft.currentStepId);
      setPageIndex(view.draft.currentPageIndex);
    }
  }, [steps, stepId, view.draft.currentStepId, view.draft.currentPageIndex]);

  const stepIndex = Math.max(
    0,
    steps.findIndex(step => step.id === stepId),
  );
  const step = steps[stepIndex] ?? steps[0];

  const screens = useMemo(
    () => screensForStep(step, formModel, view.readiness),
    [step, formModel, view.readiness],
  );
  const safePage = clampPageIndex(pageIndex, screens.length);
  const screen = screens[safePage];

  const outstanding =
    screen?.kind === 'fields'
      ? outstandingOnScreen(
          screen.fields,
          path => readAnswerAtPath(intake, path)?.state ?? null,
        )
      : [];

  const typeIncomplete =
    screen?.kind === 'proposal_type' &&
    view.draft.proposalType === 'manual' &&
    view.draft.manualBasis === null;

  const blocked = outstanding.length > 0 || typeIncomplete;

  const unsaved = hasUnsavedWork(saveState);

  useEffect(() => {
    if (!unsaved) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const goTo = useCallback(
    async (nextStepIndex: number, nextPageIndex: number) => {
      const target = steps[nextStepIndex];
      if (target === undefined) return;
      const saved = await draft.flush({
        currentStepId: target.id,
        currentPageIndex: nextPageIndex,
      });
      if (!saved) return;
      setStepId(target.id);
      setPageIndex(nextPageIndex);
      setHint('');
    },
    [draft, steps],
  );

  async function onContinue() {
    if (typeIncomplete) {
      setHint('Choose what this proposal is based on before continuing.');
      return;
    }
    if (outstanding.length > 0) {
      setHint(
        outstanding.length === 1
          ? `${outstanding[0].status.label} still needs an answer. Choose Unknown if it is genuinely not known.`
          : `${outstanding.length} questions on this screen still need an answer. Choose Unknown where a value is genuinely not known.`,
      );
      return;
    }
    const move = moveForward({
      stepIndex,
      stepCount: steps.length,
      pageIndex: safePage,
      pageCount: screens.length,
    });
    if (move === null) {
      const saved = await draft.flush();
      if (saved) onExit();
      return;
    }
    await goTo(move.stepIndex, move.pageIndex);
  }

  async function onBack() {
    const previous = steps[stepIndex - 1];
    const previousPageCount =
      previous === undefined
        ? 1
        : screensForStep(previous, formModel, view.readiness).length;
    const move = moveBack(
      {
        stepIndex,
        stepCount: steps.length,
        pageIndex: safePage,
        pageCount: screens.length,
      },
      previousPageCount,
    );
    if (move === null) return;
    await goTo(move.stepIndex, move.pageIndex);
  }

  async function onSaveAndExit() {
    const saved = await draft.flush({
      currentStepId: step.id,
      currentPageIndex: safePage,
    });
    if (saved) {
      onExit();
      return;
    }
    setLeaving(true);
  }

  const pageCounter =
    screens.length > 1 ? `Page ${safePage + 1} of ${screens.length}` : null;

  return (
    <div className="space-y-3">
      <WizardShell
        reference={view.draft.reference}
        stepTitle={step.title}
        stepPurpose={step.purpose}
        stepCounter={`Step ${stepIndex + 1} of ${steps.length}`}
        pageCounter={pageCounter}
        saveState={saveState}
        header={
          <div className="mt-2 border-t border-slate-100 pt-2">
            <WizardReadinessStrip readiness={view.readiness} />
          </div>
        }
        banner={
          conflict === null ? (
            saveState.kind === 'failed' ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">
                  {saveState.message} Nothing on this screen has been lost.
                </span>
                <button
                  type="button"
                  onClick={() => void draft.flush()}
                  className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-800"
                >
                  Retry save
                </button>
              </div>
            ) : null
          ) : (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                This proposal was changed elsewhere since you opened it. Your change
                was not saved over it.
              </span>
              <button
                type="button"
                onClick={draft.keepServerVersion}
                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium"
              >
                Show the stored version
              </button>
              <button
                type="button"
                onClick={draft.dismissConflict}
                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium"
              >
                Keep mine and save again
              </button>
            </div>
          )
        }
        footer={
          <WizardFooter
            onBack={() => void onBack()}
            onSaveAndExit={() => void onSaveAndExit()}
            onContinue={() => void onContinue()}
            backDisabled={stepIndex === 0 && safePage === 0}
            continueDisabled={false}
            continueLabel={
              stepIndex === steps.length - 1 && safePage === screens.length - 1
                ? 'Save & Finish'
                : 'Save & Continue'
            }
            busy={busy}
            hint={blocked ? hint : ''}
          />
        }
      >
        {!mayEdit ? (
          <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            You are viewing this proposal. {view.draft.ownerName} owns it, so the
            answers cannot be changed here.
          </p>
        ) : null}

        {screen === undefined ? null : screen.kind === 'proposal_type' ? (
          <ProposalTypeStep
            proposalType={view.draft.proposalType}
            manualBasis={view.draft.manualBasis}
            disabled={!mayEdit}
            sourceHeld={view.draft.sourceFile !== null}
            onChangeType={draft.setProposalType}
            onChangeBasis={draft.setManualBasis}
          />
        ) : screen.kind === 'upload' ? (
          <UploadAuditStep
            draft={view.draft}
            sourceFacts={view.sourceFacts}
            disabled={!mayEdit}
            busy={busy}
            onUpload={draft.uploadSource}
          />
        ) : screen.kind === 'review' ? (
          <ReviewStep
            readiness={view.readiness}
            formModel={formModel}
            onOpenTechnicalReview={() =>
              onOpenTechnicalReview(view.draft.draftId)
            }
          />
        ) : screen.fields.length === 0 ? (
          <div className="space-y-3">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              Nothing on this step applies to this proposal. Continue to the next
              step.
            </p>
            <WizardEvidenceGroups
              readiness={view.readiness}
              formModel={formModel}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {screen.fields.map(fieldView => (
              <WizardAnswerField
                key={fieldView.field.code}
                view={fieldView}
                intake={intake}
                disabled={!mayEdit}
                onAnswer={draft.answer}
              />
            ))}
          </div>
        )}
      </WizardShell>

      {!leaving ? null : (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              This proposal contains unsaved changes
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              The last save did not complete. Leaving now loses what is on this
              screen.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLeaving(false);
                  void draft.flush();
                }}
                className="rounded-lg bg-ars-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Stay and save
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaving(false);
                  onExit();
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void onSaveAndExit()}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Draft Proposals
      </button>
    </div>
  );
}
