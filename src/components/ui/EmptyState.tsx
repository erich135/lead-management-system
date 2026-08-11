import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Calendar } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Soft illustrated treatment for diary / schedule empties */
  illustrated?: boolean;
}

/**
 * Friendly empty-state panel for lists and planner views.
 * When illustrated, renders a soft gradient scene so empty screens still feel alive.
 */
export function EmptyState({
  icon: Icon = Calendar,
  title,
  description,
  action,
  className = '',
  illustrated = false,
}: EmptyStateProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-crm-xl border border-dashed border-line bg-gradient-to-b from-surface-elevated via-brand-soft/20 to-surface-muted/40 px-6 py-12 text-center animate-crm-fade-up ${className}`}
    >
      {illustrated ? (
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
          <div className="absolute -left-8 top-6 h-24 w-24 rounded-full bg-brand/10 blur-2xl" />
          <div className="absolute -right-6 bottom-4 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
          <div className="absolute left-1/2 top-10 h-16 w-40 -translate-x-1/2 rounded-full bg-brand/5 blur-xl" />
        </div>
      ) : null}

      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-crm ring-1 ring-brand/15">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h3 className="relative font-display text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}
