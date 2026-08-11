import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  className?: string;
  hideLabelOnMobile?: boolean;
}

/**
 * Mobile-first floating primary action button (e.g. New Request).
 * Clears the bottom nav + device safe-area insets.
 */
export function FloatingActionButton({
  label,
  onClick,
  icon: Icon = Plus,
  className = '',
  hideLabelOnMobile = false,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`crm-press fixed bottom-[calc(var(--crm-bottom-nav-offset,6rem)+0.5rem)] right-[max(1rem,env(safe-area-inset-right,0px))] z-40 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand px-5 py-3.5 text-sm font-semibold text-white shadow-crm-glow animate-crm-fab-in hover:bg-brand-deep sm:bottom-8 sm:right-8 ${className}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : ''}>{label}</span>
    </button>
  );
}
