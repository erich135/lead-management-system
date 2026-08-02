/**
 * The end of the workflow: the proposal, and what can be done with it.
 *
 * A rep arrives here from the review step to see what the customer will see.
 * The page shows the document itself at full size rather than a summary of it,
 * because the point is to check the thing that is going out.
 *
 * The document is read from the backend on every visit and is never assembled
 * here. Print and download both capture the same rendered element, so a printed
 * page and a downloaded PDF cannot disagree.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  Stamp,
} from 'lucide-react';

import { exportElementToPdf } from '../../../utils/exportJobCardPdf';
import { ProposalDocumentView } from './components/ProposalDocumentView';
import {
  documentStatusLine,
  issueAction,
  proposalFilename,
} from './proposalDocumentPresentation';
import { fetchProposalDocument, issueProposalVersion } from './wizardApi';
import type { WizardProposalDocumentView } from './wizardTypes';

interface ProposalPreviewPageProps {
  draftId: string;
  onBack: () => void;
}

export function ProposalPreviewPage({
  draftId,
  onBack,
}: ProposalPreviewPageProps) {
  const [view, setView] = useState<WizardProposalDocumentView | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState<'idle' | 'pdf' | 'issuing'>('idle');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetchProposalDocument(draftId)
      .then(next => {
        if (live) setView(next);
      })
      .catch((reason: unknown) => {
        if (live)
          setProblem(
            reason instanceof Error
              ? reason.message
              : 'The proposal could not be read.',
          );
      });
    return () => {
      live = false;
    };
  }, [draftId]);

  const download = useCallback(async () => {
    const element = printRef.current?.querySelector(
      '.bouwa-proposal-document',
    ) as HTMLElement | null;
    if (element === null || view === null) return;
    setBusy('pdf');
    setProblem('');
    try {
      await exportElementToPdf(element, proposalFilename(view.document));
    } catch (reason: unknown) {
      setProblem(
        reason instanceof Error
          ? reason.message
          : 'The proposal could not be saved as a PDF.',
      );
    } finally {
      setBusy('idle');
    }
  }, [view]);

  const issue = useCallback(async () => {
    if (view === null) return;
    setBusy('issuing');
    setProblem('');
    try {
      setView(await issueProposalVersion(draftId, view.revision));
    } catch (reason: unknown) {
      setProblem(
        reason instanceof Error
          ? reason.message
          : 'The version could not be issued.',
      );
    } finally {
      setBusy('idle');
    }
  }, [draftId, view]);

  if (view === null && problem !== '')
    return (
      <div className="space-y-3">
        <BackLink onBack={onBack} />
        <Problem message={problem} />
      </div>
    );

  if (view === null)
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing the proposal…
      </p>
    );

  const action = issueAction(view.document, view.versions, view.stale);

  return (
    <div className="space-y-4">
      <div className="bouwa-proposal-toolbar space-y-3 print:hidden">
        <BackLink onBack={onBack} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ars-heading">
              {view.document.reference} · {view.document.customerName}
            </p>
            <p className="text-xs text-slate-500">
              {documentStatusLine(view.document, view.stale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ars-heading hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={download}
              disabled={busy !== 'idle'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ars-heading hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </button>
            <button
              type="button"
              onClick={issue}
              disabled={!action.enabled || busy !== 'idle'}
              title={action.detail}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ars-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ars-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'issuing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Stamp className="h-4 w-4" />
              )}
              {action.label}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">{action.detail}</p>

        {problem !== '' && <Problem message={problem} />}
      </div>

      <div
        ref={printRef}
        className="bouwa-proposal-print-root flex justify-center overflow-x-auto rounded-xl bg-slate-100 p-6 print:overflow-visible print:bg-white print:p-0"
      >
        <div className="shadow-lg print:shadow-none">
          <ProposalDocumentView document={view.document} />
        </div>
      </div>
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ars-primary print:hidden"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to the proposal
    </button>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export default ProposalPreviewPage;
