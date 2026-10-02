import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSalesProposal, downloadCustomerProposalPdf } from '../api';
import { readReportSnapshot, rememberReportSnapshot } from '../reportSnapshot';
import { SALES_PROPOSAL_TOOL_PATH, salesProposalEditorPath, salesProposalPreviewPath } from '../navigation';
import type { CustomerProposalDocument, SalesProposal } from '../types';

/**
 * Management Summary and the Technical Report share one fetched proposal view
 * when both are opened in the same session. A later software release or a
 * changed library record can change a recomputation even at the same stored
 * revision. The pair matches because it uses that one snapshot, not because
 * the figures are frozen forever.
 */
export function ManagementSummaryPage() {
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState<SalesProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proposalId) return;
    const cached = readReportSnapshot(proposalId, 0);
    const load = cached ? Promise.resolve(cached) : getSalesProposal(proposalId);
    let cancelled = false;
    void load
      .then((loaded) => {
        if (cancelled) return;
        rememberReportSnapshot(loaded);
        setProposal(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this proposal.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  const doc = proposal?.customerProposal ?? null;
  const revision = proposal?.revision ?? doc?.revision ?? 1;
  const rental = proposal?.commercialOffer.type === 'rental';

  async function download() {
    const sheet = window.document.querySelector('.spt-customer-proposal-document');
    if (!proposalId || !sheet || !proposal) return;
    const fresh = await getSalesProposal(proposalId);
    if ((fresh.revision ?? 1) !== revision) {
      setError(`This proposal is now revision ${fresh.revision ?? 1}. Open it again before downloading.`);
      setProposal(null);
      return;
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${sheet.outerHTML}</body></html>`;
    const blob = await downloadCustomerProposalPdf(proposalId, html, revision, 'management-summary');
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'Compressed Air Proposal - Management Summary.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="spt-customer-proposal-print-root">
      <div className="mb-4 flex gap-3 print:hidden">
        <Link to={proposalId ? salesProposalEditorPath(proposalId) : SALES_PROPOSAL_TOOL_PATH}>Back to editor</Link>
        <Link to={proposalId ? salesProposalPreviewPath(proposalId) : SALES_PROPOSAL_TOOL_PATH}>Technical Report</Link>
        <button type="button" onClick={() => void download()} disabled={!doc}>Download PDF</button>
      </div>
      {loading && <p>Opening management summary…</p>}
      {error && <p>{error}</p>}
      {doc && <SummaryDocument doc={doc} revision={revision} rental={rental} />}
    </div>
  );
}

function SummaryDocument({
  doc,
  revision,
  rental,
}: {
  doc: CustomerProposalDocument;
  revision: number;
  rental: boolean;
}) {
  return (
    <article className="spt-customer-proposal-document spt-management-summary space-y-4 bg-white p-8 text-[#383838]">
      <h1>Compressed Air Proposal — Management Summary</h1>
      <p>
        {doc.preparedFor ?? 'Customer'} · {doc.siteName ?? 'Site'} · {doc.revisionLabel ?? `revision ${revision}`}
      </p>
      <p>{doc.recommendation}</p>
      <p>
        <strong>Final annual electricity saving.</strong> {doc.electricity.saving ?? 'Not shown'}
      </p>
      {doc.electricity.averageMonthlySaving && (
        <p>
          {doc.electricity.averageMonthlySavingLabel} {doc.electricity.averageMonthlySaving}
        </p>
      )}
      <p>
        <strong>Payback.</strong> {doc.commercial.paybackHeadline ?? doc.commercial.payback ?? 'Not shown'}
      </p>
      {rental ? (
        <p>Rental payments are shown separately from the electricity saving.</p>
      ) : null}
      {doc.commercial.costRows?.map((row) => (
        <p key={row.label}>
          {row.label}: {row.current ?? '—'} / {row.proposed ?? '—'}
        </p>
      ))}
      {doc.qualifications?.map((item) => (
        <p key={item.code}>{item.text}</p>
      ))}
    </article>
  );
}
