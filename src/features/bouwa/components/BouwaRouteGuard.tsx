/**
 * BouwaRouteGuard
 *
 * Permission gate for /bouwa routes.
 *
 * Guards:
 *   1. Authentication — handled by the outer ProtectedRoute in App.tsx
 *   2. Authoritative Super Admin access — via /api/bouwa-pilot-access
 *
 * Feature flags are not an access condition. Access is role-only.
 */

import { Lock, ShieldAlert } from 'lucide-react';
import { useBouwaPilotAccess } from '../BouwaPilotAccessContext';
import { bouwaPilotPresentation } from '../bouwaPilotPresentation';

interface BouwaRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Access-denied page for authenticated users who are not Super Admin.
 */
function BouwaAccessDenied() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-100 p-2.5">
            <ShieldAlert className="w-6 h-6 text-red-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ars-heading">Access Restricted</h1>
            <p className="text-sm text-ars-body mt-0.5">Bouwa Proposal Module</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-900">
            Access to the Bouwa Proposal Module is restricted.
          </p>
          <p className="text-sm text-red-800 mt-2">
            Bouwa is available only to authorised Super Admin users. Contact your system
            administrator if you believe you should have access.
          </p>
        </div>

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
        </div>

        <p className="text-xs text-ars-body text-center">
          Note: customer-facing proposal outputs remain disabled until formulas, assumptions
          and report templates are formally approved.
        </p>
      </div>
    </div>
  );
}

/**
 * Wraps the Bouwa shell behind the authoritative Super Admin access check.
 *
 * Authentication is already guaranteed by the outer ProtectedRoute in App.tsx.
 * While access state is loading, a neutral resolving view is shown so protected
 * content never flashes.
 */
export function BouwaRouteGuard({ children }: BouwaRouteGuardProps) {
  const { state, loading, unavailable } = useBouwaPilotAccess();
  const presentation = bouwaPilotPresentation(state, loading, unavailable);

  if (presentation === 'resolving') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status">
        <p className="text-sm text-ars-body">Checking Bouwa access…</p>
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
