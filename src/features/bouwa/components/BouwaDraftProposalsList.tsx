/**
 * BouwaDraftProposalsList
 *
 * Phase 4D-15: Draft Proposals list page.
 * Demo data — no API calls, no DB writes.
 */

import { useState } from 'react';
import {
  FileText, ArrowRight, Wind, Zap, Building2, Calendar,
  Cpu, BarChart3, Clock, CheckCircle2, Edit3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BouwaTopNav = 'dashboard' | 'new-proposal' | 'drafts' | 'spec-library' | 'templates';

interface DraftProposalItem {
  id: string;
  customer: string;
  site: string;
  proposalTitle: string;
  compressorsReviewed: string[];
  proposedSolution: string;
  estimatedSavings: string;
  status: 'Draft' | 'Review' | 'Completed';
  auditDate: string;
  updatedDate: string;
  step: number;
  totalSteps: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_DRAFTS: DraftProposalItem[] = [
  {
    id: 'ingrain-bellville',
    customer: 'Ingrain Belville',
    site: 'Belville, Cape Town, WC',
    proposalTitle: 'Ingrain Belville — Compressed Air Performance Audit Report',
    compressorsReviewed: ['CompAir L250 (2006)', 'CompAir L160 (2001)'],
    proposedSolution: 'Bouwa SVC-RS160-II / SVC160-II VSD (naming requires review)',
    estimatedSavings: 'R 1.15M/yr vs L160 | R 2.67M/yr vs L250',
    status: 'Draft',
    auditDate: '30 May 2025',
    updatedDate: '08 Jul 2026',
    step: 9,
    totalSteps: 11,
    notes: 'Audit 30 May 2025 by John Roselt / ARS. Both L250 and L160 oversized. Full air flow study required before finalising specs. Naming inconsistency in deck: SVC-RS160-II vs RS132 VSD — confirm with Bouwa.',
  },
  {
    id: 'boksburg-plant',
    customer: 'Boksburg Plant',
    site: 'Boksburg, Gauteng',
    proposalTitle: 'Boksburg Plant — GA55 Replacement',
    compressorsReviewed: ['Atlas Copco GA55'],
    proposedSolution: 'Bouwa SVC-RS55A-II VSD',
    estimatedSavings: '~R 182,450 / year',
    status: 'Review',
    auditDate: '15 May 2026',
    updatedDate: '04 Jul 2026',
    step: 11,
    totalSteps: 11,
    notes: 'Demo PDF generated. Pending internal formula review before customer issue.',
  },
  {
    id: 'radley-rs250',
    customer: 'Radley',
    site: 'Radley, Gauteng',
    proposalTitle: 'Radley — RS250-II Review Proposal',
    compressorsReviewed: ['CompAir RS250-II'],
    proposedSolution: 'Bouwa SVC-RS250-II VSD (under review)',
    estimatedSavings: 'Pending calculation',
    status: 'Draft',
    auditDate: '22 Jun 2026',
    updatedDate: '01 Jul 2026',
    step: 4,
    totalSteps: 11,
    notes: 'Site observations captured. Data source step in progress.',
  },
];

const STATUS_COLORS: Record<string, string> = {
  'Draft':    'bg-amber-100 text-amber-700 border-amber-200',
  'Review':   'bg-blue-100 text-blue-700 border-blue-200',
  'Completed':'bg-green-100 text-green-700 border-green-200',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Step {step} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-ars-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface DraftCardProps {
  draft: DraftProposalItem;
  onOpen: (id: string) => void;
}

function DraftCard({ draft, onOpen }: DraftCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-ars-primary/30 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-base font-bold text-ars-heading">{draft.customer}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[draft.status]}`}>
                {draft.status}
              </span>
            </div>
            <p className="text-xs text-ars-body truncate">{draft.proposalTitle}</p>
          </div>
          <FileText className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
        </div>
        <div className="mt-3">
          <ProgressBar step={draft.step} total={draft.totalSteps} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-400">Site</p>
              <p className="font-medium text-ars-body">{draft.site}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-400">Audit Date</p>
              <p className="font-medium text-ars-body">{draft.auditDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-400">Compressors Reviewed</p>
              <p className="font-medium text-ars-body">{draft.compressorsReviewed.join(', ')}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Wind className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-400">Proposed Solution</p>
              <p className="font-medium text-ars-body">{draft.proposedSolution}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <Zap className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400">Estimated Annual Savings</p>
            <p className="text-sm font-bold text-green-700">{draft.estimatedSavings}</p>
          </div>
        </div>

        {draft.notes && (
          <p className="text-xs text-slate-400 italic leading-relaxed">{draft.notes}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="w-3 h-3" />
          Updated {draft.updatedDate}
        </div>
        <button
          type="button"
          onClick={() => onOpen(draft.id)}
          className="flex items-center gap-1.5 text-sm font-semibold text-ars-primary hover:underline"
        >
          {draft.status === 'Completed' ? (
            <><CheckCircle2 className="w-4 h-4" /> View</>
          ) : (
            <><Edit3 className="w-4 h-4" /> Continue</>
          )}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BouwaDraftProposalsListProps {
  onOpenProposal?: (id: string) => void;
  onNewProposal?: () => void;
}

export function BouwaDraftProposalsList({ onOpenProposal, onNewProposal }: BouwaDraftProposalsListProps) {
  const [filter, setFilter] = useState<'All' | 'Draft' | 'Review' | 'Completed'>('All');

  const filtered = filter === 'All' ? DEMO_DRAFTS : DEMO_DRAFTS.filter(d => d.status === filter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-ars-primary/10 p-2.5 shrink-0">
            <FileText className="w-6 h-6 text-ars-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ars-heading">Draft Proposals</h1>
            <p className="text-sm text-ars-body">{DEMO_DRAFTS.length} proposals — {DEMO_DRAFTS.filter(d => d.status === 'Draft').length} in progress</p>
          </div>
        </div>
        {onNewProposal && (
          <button
            type="button"
            onClick={onNewProposal}
            className="flex items-center gap-2 px-4 py-2 bg-ars-primary text-white font-bold rounded-xl text-sm hover:bg-ars-primary/90 transition shadow-sm"
          >
            <BarChart3 className="w-4 h-4" /> New Proposal
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['All', 'Draft', 'Review', 'Completed'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === f
                ? 'bg-ars-primary text-white border-ars-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:border-ars-primary/40'
            }`}
          >
            {f}
            {f !== 'All' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({DEMO_DRAFTS.filter(d => d.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(draft => (
          <DraftCard
            key={draft.id}
            draft={draft}
            onOpen={id => onOpenProposal?.(id)}
          />
        ))}
      </div>
    </div>
  );
}
