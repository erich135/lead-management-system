import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FormSectionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Accent color for the section icon (brand / type tint). */
  accentClassName?: string;
  /** Zero-based step index for wizard filtering. */
  stepIndex?: number;
  /**
   * When set (mobile wizard), only the matching step is shown.
   * When null/undefined, all sections render (desktop / review).
   */
  activeStep?: number | null;
  /** Allow collapsing on desktop when all sections are visible. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Premium form section with optional wizard step visibility and collapse.
 */
export function FormSectionCard({
  title,
  subtitle,
  icon,
  children,
  accentClassName = 'text-brand',
  stepIndex,
  activeStep = null,
  collapsible = true,
  defaultOpen = true,
}: FormSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const wizardHidden =
    activeStep != null && stepIndex != null && activeStep !== stepIndex;

  if (wizardHidden) {
    return null;
  }

  const showCollapse = collapsible && activeStep == null;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header
        className={`flex items-start gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3.5 ${
          showCollapse ? 'cursor-pointer select-none' : ''
        }`}
        onClick={showCollapse ? () => setOpen((prev) => !prev) : undefined}
        role={showCollapse ? 'button' : undefined}
        aria-expanded={showCollapse ? open : undefined}
      >
        {icon && (
          <span className={`mt-0.5 shrink-0 ${accentClassName || 'text-ars-primary'}`}>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{subtitle}</p>
          )}
        </div>
        {showCollapse && (
          <ChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </header>
      {(open || !showCollapse) && (
        <div className="space-y-3 p-4 sm:p-5">{children}</div>
      )}
    </section>
  );
}
