import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Single shimmer placeholder block for loading states.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`crm-skeleton ${className}`} aria-hidden />;
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/**
 * Stack of skeleton text lines for list / card loading states.
 */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3 rounded-full ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

/**
 * Elevated card-shaped skeleton used on dashboards and mobile lists.
 */
export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`crm-glass rounded-crm-xl p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-7 w-20 rounded-lg" />
      <Skeleton className="h-3 w-32 rounded-full" />
    </div>
  );
}

/**
 * Dashboard overview skeleton matching the premium KPI + diary layout.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-crm-page-in" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-3 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="crm-glass rounded-crm-xl p-5 lg:col-span-3">
          <Skeleton className="mb-4 h-5 w-40 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-crm-lg" />
            <Skeleton className="h-16 w-full rounded-crm-lg" />
            <Skeleton className="h-16 w-full rounded-crm-lg" />
          </div>
        </div>
        <div className="crm-glass rounded-crm-xl p-5 lg:col-span-2">
          <Skeleton className="mb-4 h-5 w-32 rounded-full" />
          <Skeleton className="h-36 w-full rounded-crm-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Generic list/page skeleton for Jobs, Diary, and other CRM views.
 */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-4 animate-crm-page-in" aria-busy="true" aria-label="Loading">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-28 rounded-crm" />
      </div>
      <Skeleton className="h-12 w-full rounded-crm-lg" />
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-crm-xl" />
        ))}
      </div>
    </div>
  );
}
