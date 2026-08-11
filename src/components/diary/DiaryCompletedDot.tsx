import React from 'react';
import { formatAppointmentType } from './diaryUtils';

type DotSize = 'xs' | 'sm' | 'md';

const DOT_SIZE_CLASSES: Record<DotSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

interface DiaryCompletedDotProps {
  size?: DotSize;
  className?: string;
}

/**
 * Renders the standard solid green dot for a completed Site Visit or RFQ.
 */
export const DiaryCompletedDot: React.FC<DiaryCompletedDotProps> = ({
  size = 'sm',
  className = '',
}) => (
  <span
    className={`inline-block flex-shrink-0 rounded-full bg-emerald-500 ${DOT_SIZE_CLASSES[size]} ${className}`}
    aria-hidden
  />
);

interface CompletedVisitTypeLabelProps {
  appointmentType?: string;
  size?: DotSize;
  className?: string;
}

/**
 * Shows a green completion dot beside the visit type label (Site Visit / RFQ).
 */
export const CompletedVisitTypeLabel: React.FC<CompletedVisitTypeLabelProps> = ({
  appointmentType,
  size = 'xs',
  className = '',
}) => (
  <span className={`inline-flex items-center gap-1.5 font-semibold text-emerald-700 ${className}`}>
    <DiaryCompletedDot size={size} />
    {formatAppointmentType(appointmentType)}
  </span>
);
