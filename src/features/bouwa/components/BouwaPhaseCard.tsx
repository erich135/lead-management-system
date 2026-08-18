/**
 * BouwaPhaseCard
 *
 * Reusable presentational card for showing the status of a Bouwa module area.
 * Purely presentational — no API calls, no state, no side effects.
 *
 * Phase 4C-2: shell only.
 */

import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import type { BouwaPhaseStatus, BouwaShellCard } from '../types';

interface BouwaPhaseCardProps {
  card: BouwaShellCard;
}

const STATUS_CONFIG: Record<
  BouwaPhaseStatus,
  { label: string; badgeClass: string; Icon: React.FC<{ className?: string }> }
> = {
  approved: {
    label: 'Approved',
    badgeClass: 'bg-green-100 text-green-800 border border-green-200',
    Icon: CheckCircle2,
  },
  in_review: {
    label: 'In Review',
    badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Icon: Clock,
  },
  pending: {
    label: 'Pending',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    Icon: AlertCircle,
  },
  disabled: {
    label: 'Disabled',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    Icon: XCircle,
  },
};

export function BouwaPhaseCard({ card }: BouwaPhaseCardProps) {
  const { label, badgeClass, Icon } = STATUS_CONFIG[card.status];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ars-heading leading-snug">{card.title}</h3>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${badgeClass}`}
        >
          <Icon className="w-3 h-3" />
          {label}
        </span>
      </div>
      <p className="text-sm text-ars-body leading-relaxed">{card.description}</p>
    </div>
  );
}
