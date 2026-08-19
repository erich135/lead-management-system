/**
 * The end of the workflow: the proposal, and what can be done with it.
 *
 * A rep arrives here from the review step to see what the customer will see.
 * The page shows the document itself at full size rather than a summary of it,
 * because the point is to check the thing that is going out.
 *
 * Arriving here generates the proposal's first version if it has none, so the
 * page always has a document on it. It does not generate a second version for
 * a proposal that already has one: previewing something twice is not two
 * versions of it, and the rep asks for the next version deliberately.
 *
 * The document is read from the backend on every visit and is never assembled
 * here. Print and download both capture the same rendered element, so a printed
 * page and a downloaded PDF cannot disagree. The downloaded file is also sent
 * back and kept against its version, so the proposal list can hand it over
 * later and a restart does not lose it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Microscope,
  Printer,
  Stamp,
} from 'lucide-react';

import { exportElementToPdfBytes } from '../../../utils/exportJobCardPdf';
import { ProposalDocumentView } from './components/ProposalDocumentView';
import {
  documentStatusLine,
  newVersionAction,
  proposalFilename,
  proposalReleaseState,
} from './proposalDocumentPresentation';
import {
  ensureProposalVersion,
  fetchProposalDocument,
  issueProposalVersion,
  storeProposalPdf,
} from './wizardApi';
import type { WizardProposalDocumentView } from './wizardTypes';

interface ProposalPreviewPageProps {
  draftId: string;
  onBack: () => void;
  onOpenTechnicalReview: () => void;
}

export function ProposalPreviewPage({
  draftId,
  onBack,
  onOpenTechnicalReview,
}: ProposalPreviewPageProps) {
  const [view, setView] = useState<WizardProposalDocumentView | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState<'idle' | 'pdf' | 'generating'>('idle');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setView(null);
    setProblem('');
    // The revision is read from the document itself, so a preview opened from
    // a link works exactly as one opened from the wizard: neither has to be
    // told what the draft was at when the page was written.
    fetchAndEnsure(draftId)
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

  /**
   * Renders the PDF and keeps it against the version it renders.
   *
   * The file goes to the rep either way. Storing it is what lets the proposal
   * list offer it later, so a failure to store is reported without taking the
   * download away from someone who already has it.
   */
  const download = useCallback(async () => {
    const element = printRef.current?.querySelector(
      '.bouwa-proposal-document',
    ) as HTMLElement | null;
    if (element === null || view === null) return;
    setBusy('pdf');
    setProblem('');
    try {
      const filename = proposalFilename(view.document);
      const bytes = await exportElementToPdfBytes(element, filename);
      if (view.document.version > 0) {
        try {
          const stored = await storeProposalPdf(
            draftId,
            view.revision,
            view.document.version,
            filename,
            bytes,
          );
          setView({ ...view, revision: stored.revision });
        } catch (reason: unknown) {
          setProblem(
            reason instanceof Error
              ? `The PDF was downloaded but not kept on the proposal: ${reason.message}`
              : 'The PDF was downloaded but not kept on the proposal.',
          );
        }
      }
    } catch (reason: unknown) {
      setProblem(
        reason instanceof Error
          ? reason.message
          : 'The proposal could not be saved as a PDF.',
      );
    } finally {
      setBusy('idle');
    }
  }, [draftId, view]);

  const generate = useCallback(async () => {
    if (view === null) return;
    setBusy('generating');
    setProblem('');
    try {
      setView(await issueProposalVersion(draftId, view.revision));
    } catch (reason: unknown) {
      setProblem(
        reason instanceof Error
          ? reason.message
          : 'A new version could not be generated.',
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

  const action = newVersionAction(view.document, view.versions, view.stale);
  const release = proposalReleaseState(view.document);

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
              disabled={!release.allowed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ars-heading hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={download}
              disabled={busy !== 'idle' || !release.allowed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ars-heading hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={onOpenTechnicalReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ars-heading hover:bg-slate-50"
            >
              <Microscope className="h-4 w-4" />
              Advanced Technical Review
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={!action.enabled || busy !== 'idle'}
              title={action.detail}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ars-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ars-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'generating' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Stamp className="h-4 w-4" />
              )}
              {action.label}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">{action.detail}</p>

        {!release.allowed && (
          <Problem
            message={`${release.label}. ${release.reason ?? 'Customer-facing print and download are disabled.'}`}
          />
        )}

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

/**
 * Reads the document, then makes sure a version of it exists.
 *
 * Two calls rather than one because generating needs the revision, and the
 * revision is the draft's rather than something the caller can be trusted to
 * still hold: a preview opened from a bookmark has no idea what the draft was
 * saved at.
 *
 * Somebody reading a colleague's proposal is not allowed to generate a version
 * of it, and that refusal is not a failure to show them the proposal. They are
 * shown the document that was read.
 */
async function fetchAndEnsure(
  draftId: string,
): Promise<WizardProposalDocumentView> {
  const current = await fetchProposalDocument(draftId);
  if (current.versions.length > 0) return current;
  try {
    return await ensureProposalVersion(draftId, current.revision);
  } catch {
    return current;
  }
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ars-primary print:hidden"
    >
      <ArrowLeft className="h-4 w-4" />
      Return to draft
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
