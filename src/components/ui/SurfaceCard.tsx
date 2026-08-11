import React from 'react';

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article';
}

const PADDING: Record<NonNullable<SurfaceCardProps['padding']>, string> = {
  none: '',
  sm: 'p-3 sm:p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

/**
 * Elevated glass-style card used for lists, planner cells, and panels.
 */
export function SurfaceCard({
  children,
  className = '',
  padding = 'md',
  interactive = false,
  onClick,
  as = 'div',
}: SurfaceCardProps) {
  const Tag = as;
  const interactiveClasses = interactive
    ? 'crm-press cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-crm-lg'
    : '';

  return (
    <Tag
      {...(Tag === 'button' ? { type: 'button' as const } : {})}
      onClick={onClick}
      className={`crm-glass rounded-crm-xl shadow-crm-md ${PADDING[padding]} animate-crm-fade-up ${interactiveClasses} ${className}`}
    >
      {children}
    </Tag>
  );
}
