/**
 * BouwaAccessNotice
 *
 * Explains what is required to access the Bouwa module and notes that
 * customer-facing outputs remain disabled.
 *
 * Purely presentational — no API calls.
 * Phase 4C-2: shell only.
 */

import { Lock, ShieldAlert, Flag } from 'lucide-react';
import { BOUWA_FEATURE_FLAG, BOUWA_VIEW_PERMISSION } from '../bouwaFrontendConfig';

export function BouwaAccessNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
        <h2 className="text-sm font-semibold text-amber-900">Access Requirements</h2>
      </div>

      <ul className="space-y-3 text-sm text-amber-900">
        <li className="flex items-start gap-2">
          <Flag className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
          <span>
            <span className="font-medium">Feature flag required: </span>
            <code className="rounded bg-amber-100 border border-amber-200 px-1 py-0.5 text-xs font-mono">
              {BOUWA_FEATURE_FLAG}
            </code>
            {' '}— must be enabled by a super admin before this module is accessible.
          </span>
        </li>

        <li className="flex items-start gap-2">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
          <span>
            <span className="font-medium">Permission required: </span>
            <code className="rounded bg-amber-100 border border-amber-200 px-1 py-0.5 text-xs font-mono">
              {BOUWA_VIEW_PERMISSION}
            </code>
            {' '}— users must have this permission assigned through their role.
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
