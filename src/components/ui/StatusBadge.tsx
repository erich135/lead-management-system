import React from 'react';

export type StatusBadgeTone =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'declined'
  | 'info'
  | 'neutral'
  | 'visit'
  | 'rfc'
  | 'loan'
  | 'sla'
  | 'success'
  | 'warning';

interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  className?: string;
}

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  draft: 'bg-slate-200 text-slate-900 ring-slate-400',
  pending: 'bg-amber-500 text-white ring-amber-700',
  approved: 'bg-emerald-600 text-white ring-emerald-800',
  declined: 'bg-rose-600 text-white ring-rose-800',
  info: 'bg-sky-500/15 text-sky-800 ring-sky-500/25 dark:text-sky-200',
  neutral: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',
  visit: 'bg-indigo-500/15 text-indigo-800 ring-indigo-500/25 dark:text-indigo-200',
  rfc: 'bg-orange-500/15 text-orange-800 ring-orange-500/25 dark:text-orange-200',
  loan: 'bg-cyan-500/15 text-cyan-800 ring-cyan-500/25 dark:text-cyan-200',
  sla: 'bg-violet-500/15 text-violet-800 ring-violet-500/25 dark:text-violet-200',
  success: 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:text-emerald-200',
  warning: 'bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:text-amber-200',
};

/**
 * Compact colored status / type pill for lists and planner cards.
 */
export function StatusBadge({
  label,
  tone = 'neutral',
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
