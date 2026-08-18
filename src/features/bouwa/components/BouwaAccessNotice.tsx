/**
 * BouwaAccessNotice
 *
 * Explains Super Admin role access and notes that customer-facing outputs
 * remain disabled. Purely presentational — no API calls.
 */

import { Lock, ShieldAlert } from 'lucide-react';

export function BouwaAccessNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
        <h2 className="text-sm font-semibold text-amber-900">Access Requirements</h2>
      </div>

      <ul className="space-y-3 text-sm text-amber-900">
        <li className="flex items-start gap-2">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
          <span>
            <span className="font-medium">Required role: </span>
            Super Admin — Bouwa is available only to authorised Super Admin users.
          </span>
        </li>

        <li className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
          <span>
            <span className="font-medium">Customer-safe outputs are disabled.</span>{' '}
            Proposal exports visible to customers remain blocked until all internal formulas,
            assumptions and report templates have been reviewed and approved.
          </span>
        </li>
      </ul>
    </div>
  );
}
