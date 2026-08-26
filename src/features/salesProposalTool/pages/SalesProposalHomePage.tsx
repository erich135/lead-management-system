import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { listSalesProposals, createSalesProposal } from '../api';
import { SALES_PROPOSAL_TOOL_LABEL, salesProposalEditorPath } from '../navigation';
import type { SalesProposalListItem } from '../types';
import { formatAuditDate } from '../formatMeasured';

export function SalesProposalHomePage() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<SalesProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listSalesProposals()
      .then((items) => {
        if (!cancelled) setProposals(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load proposals.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const proposal = await createSalesProposal();
      navigate(salesProposalEditorPath(proposal.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create a proposal.');
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#383838]">{SALES_PROPOSAL_TOOL_LABEL}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create scientifically supported compressor proposals using real site data.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={creating}
        className="rounded-[8px] bg-[#f7c12b] px-4 py-2.5 text-sm font-bold text-[#383838] hover:brightness-95 disabled:opacity-50"
      >
        {creating ? 'Creating…' : 'New Sales Proposal'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1fr_1fr_8rem_5rem] md:gap-2">
          <span>Customer</span>
          <span>Site</span>
          <span>Updated</span>
          <span />
        </div>
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…
          </div>
        ) : proposals.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">No Sales Proposal Tool drafts yet.</p>
        ) : (
          proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid md:grid-cols-[1fr_1fr_8rem_5rem] md:items-center md:gap-2"
            >
              <span className="truncate text-sm text-[#383838]">
                {proposal.customerName || 'No customer yet'}
              </span>
              <span className="truncate text-sm text-slate-600">
                {proposal.siteName || 'No site yet'}
              </span>
              <span className="text-xs text-slate-500">
                {formatAuditDate(proposal.updatedAt) || ''}
              </span>
              <Link
                to={salesProposalEditorPath(proposal.id)}
                className="text-sm font-medium text-[#0969a9] hover:underline"
              >
                Open
              </Link>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
