/**
 * BouwaRouteGuard
 *
 * Permission gate for the hidden /bouwa route.
 *
 * Guards:
 *   1. Authentication  — handled by the outer ProtectedRoute in App.tsx
 *   2. Permission      — requires BOUWA_PERMISSIONS.VIEW or isSuperAdmin
 *
 * Note on feature flags:
 *   The frontend has no runtime feature-flag state in this phase.
 *   Runtime feature-flag enforcement is handled by the backend
 *   (/api/bouwa requires requireFeature("bouwa") middleware).
 *   The feature flag key is referenced here for display purposes only.
 *
 * Phase 4C-3: hidden route guard only.
 * No API calls. No data forms.
 */

import { Lock, ShieldAlert, Flag } from 'lucide-react';
import { BOUWA_FEATURE_FLAG } from '../bouwaFrontendConfig';
import { useBouwaPilotAccess } from '../BouwaPilotAccessContext';
import { bouwaPilotPresentation } from '../bouwaPilotPresentation';

interface BouwaRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Access-denied page rendered when the user lacks bouwa.view permission.
 */
function BouwaAccessDenied() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-100 p-2.5">
            <ShieldAlert className="w-6 h-6 text-red-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ars-heading">Access Restricted</h1>
            <p className="text-sm text-ars-body mt-0.5">Bouwa Proposal Module</p>
          </div>
        </div>

        {/* Main message */}
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-900">
            Access to the Bouwa Proposal Module is restricted.
          </p>
          <p className="text-sm text-red-800 mt-2">
            This pilot requires both an enabled server feature flag and a Super Admin account.
            Contact your system administrator if you believe the pilot should be available.
          </p>
        </div>

        {/* Requirements */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold text-ars-body uppercase tracking-wide">
            Access requirements
          </p>

          <div className="flex items-start gap-2 text-sm text-ars-body">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
            <span>
              <span className="font-medium text-ars-heading">Required role: </span>
              Super Admin
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm text-ars-body">
            <Flag className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
            <span>
              <span className="font-medium text-ars-heading">Feature flag: </span>
              <code className="rounded bg-slate-100 border border-slate-200 px-1 py-0.5 text-xs font-mono">
                {BOUWA_FEATURE_FLAG}
              </code>
              {' '}— must be enabled by a super admin.
            </span>
          </div>
        </div>

        {/* Customer-safe note */}
        <p className="text-xs text-ars-body text-center">
          Note: customer-facing proposal outputs remain disabled until formulas, assumptions
          and report templates are formally approved.
        </p>
      </div>
    </div>
  );
}

/**
 * Wraps the Bouwa shell behind a permission check.
 *
 * Authentication is already guaranteed by the outer ProtectedRoute in App.tsx.
 * This guard checks: isSuperAdmin OR hasPermission("bouwa.view").
 */
export function BouwaRouteGuard({ children }: BouwaRouteGuardProps) {
  const { state, loading, unavailable } = useBouwaPilotAccess();
  const presentation = bouwaPilotPresentation(state, loading, unavailable);

  if (presentation === 'resolving') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status">
        <p className="text-sm text-ars-body">Checking Bouwa pilot access…</p>
      </div>
    );
  }

  if (presentation === 'denied') {
    return <BouwaAccessDenied />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
