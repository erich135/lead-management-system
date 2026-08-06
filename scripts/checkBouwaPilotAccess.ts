import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bouwaPilotPresentation, canShowBouwaNavigation } from '../src/features/bouwa/bouwaPilotPresentation.ts';
import type { BouwaPilotAccessState } from '../src/lib/api.ts';

const context = fs.readFileSync('src/features/bouwa/BouwaPilotAccessContext.tsx', 'utf8');
const guard = fs.readFileSync('src/features/bouwa/components/BouwaRouteGuard.tsx', 'utf8');
const dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
const mobile = fs.readFileSync('src/components/MobileNavigation.tsx', 'utf8');
const api = fs.readFileSync('src/lib/api.ts', 'utf8');

assert.match(api, /\/api\/bouwa-pilot-access/);
assert.match(context, /state, loading, unavailable/);
assert.match(guard, /presentation === 'resolving'/);
assert.doesNotMatch(guard, /hasPermission\(BOUWA_PERMISSIONS\.VIEW\)/);
assert.doesNotMatch(guard, /feature flag must be enabled/i);
assert.doesNotMatch(guard, /BOUWA_FEATURE_FLAG/);
assert.doesNotMatch(guard, /Feature flag:/);
assert.match(guard, /authorised Super Admin/i);
assert.match(dashboard, /showBouwaNavigation/);
assert.match(dashboard, /to="\/bouwa"/);
assert.match(mobile, /showBouwaNavigation/);
assert.match(mobile, /to="\/bouwa"/);

const allowedState = (isSuperAdmin: boolean): BouwaPilotAccessState => ({
  featureKey: 'bouwa',
  featureEnabled: false,
  isSuperAdmin,
  authenticated: true,
  allowed: isSuperAdmin,
  reason: isSuperAdmin ? 'allowed' : 'super_admin_required',
  accessMode: 'role_only',
});

assert.equal(bouwaPilotPresentation(null, true, false), 'resolving');
assert.equal(canShowBouwaNavigation(null, true, false), false);
assert.equal(canShowBouwaNavigation(null, false, false), false);
assert.equal(canShowBouwaNavigation(allowedState(false), false, false), false);
assert.equal(canShowBouwaNavigation(allowedState(true), false, false), true);
assert.equal(bouwaPilotPresentation(allowedState(true), false, true), 'denied');
// Flag fields must not gate presentation when allowed is true
assert.equal(
  canShowBouwaNavigation(
    { ...allowedState(true), featureEnabled: false },
    false,
    false,
  ),
  true,
);

process.stdout.write(
  'Bouwa pilot access UI contract passed: loading is hidden, denied is hidden, allowed is visible.\n',
);
