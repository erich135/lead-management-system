/**
 * The frame every wizard step is shown in.
 *
 * The frame is a fixed height and the step body is the only part that may
 * scroll, so the page itself never grows past the window. That is what keeps a
 * step to one screen at 1440 x 900 and 1366 x 768: the action footer cannot be
 * pushed below the fold, because it is not in the flow of the questions.
 *
 * A step that genuinely needs more room is paged rather than lengthened.
 */

import type { ReactNode } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw } from 'lucide-react';

import { saveStateLabel, type WizardSaveState } from '../wizardState';

export function WizardSaveIndicator({ state }: { state: WizardSaveState }) {
  const tone =
    state.kind === 'failed' || state.kind === 'conflict'
      ? 'text-rose-600'
      : state.kind === 'dirty'
        ? 'text-amber-700'
        : 'text-slate-500';
  return (
    <span
      data-testid="wizard-save-state"
      data-save-state={state.kind}
      className={`flex items-center gap-1.5 text-xs ${tone}`}
    >
      {state.kind === 'saving' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state.kind === 'failed' || state.kind === 'conflict' ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : state.kind === 'dirty' ? (
        <RefreshCw className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      )}
      {saveStateLabel(state)}
    </span>
  );
}

export interface WizardShellProps {
  reference: string;
  stepTitle: string;
  stepPurpose: string;
  /** "Step 4 of 9", already worked out by the caller. */
  stepCounter: string;
  /** "Page 2 of 3" where the step is paged, otherwise null. */
  pageCounter: string | null;
  saveState: WizardSaveState;
  header?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

export function WizardShell({
  reference,
  stepTitle,
  stepPurpose,
  stepCounter,
  pageCounter,
  saveState,
  header,
  banner,
  children,
  footer,
}: WizardShellProps) {
  return (
    <section
      data-testid="bouwa-wizard"
      className="flex h-[calc(100vh-11rem)] min-h-[26rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
    >
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ars-primary">
              {stepCounter}
            </span>
            <h2 className="text-base font-semibold text-slate-900">{stepTitle}</h2>
            {pageCounter === null ? null : (
              <span className="text-xs text-slate-500">{pageCounter}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{reference}</span>
            <WizardSaveIndicator state={saveState} />
          </div>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{stepPurpose}</p>
        {header}
      </header>

      {banner}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        {footer}
      </footer>
    </section>
  );
}

export interface WizardFooterProps {
  onBack: () => void;
  onSaveAndExit: () => void;
  onContinue: () => void;
  backDisabled: boolean;
  continueDisabled: boolean;
  continueLabel: string;
  busy: boolean;
  /** Shown beside the buttons where the step cannot be left yet. */
  hint: string;
}

export function WizardFooter({
  onBack,
  onSaveAndExit,
  onContinue,
  backDisabled,
  continueDisabled,
  continueLabel,
  busy,
  hint,
}: WizardFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled || busy}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        Back
      </button>
      <p className="order-last w-full text-xs text-amber-700 sm:order-none sm:w-auto sm:flex-1 sm:text-center">
        {hint}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveAndExit}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Save &amp; Exit
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || busy}
          className="rounded-lg bg-ars-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
