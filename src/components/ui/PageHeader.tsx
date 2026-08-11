import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent page/section header used across CRM surfaces. Shows a small
 * brand eyebrow label above the title to reinforce the premium CRM shell.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow = 'ARS CRM',
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-7 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 truncate font-display text-3xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
