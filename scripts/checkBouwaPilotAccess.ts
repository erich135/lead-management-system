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
assert.match(dashboard, /showBouwaNavigation/);
assert.match(mobile, /showBouwaNavigation/);

const state = (featureEnabled: boolean, isSuperAdmin: boolean): BouwaPilotAccessState => ({
  featureKey: 'bouwa',
  featureEnabled,
  isSuperAdmin,
  allowed: featureEnabled && isSuperAdmin,
  reason: featureEnabled ? (isSuperAdmin ? 'allowed' : 'super_admin_required') : 'feature_flag_disabled',
});

assert.equal(bouwaPilotPresentation(null, true, false), 'resolving');
assert.equal(canShowBouwaNavigation(null, true, false), false);
assert.equal(canShowBouwaNavigation(null, false, false), false);
assert.equal(canShowBouwaNavigation(state(false, true), false, false), false);
assert.equal(canShowBouwaNavigation(state(true, false), false, false), false);
assert.equal(canShowBouwaNavigation(state(true, true), false, false), true);
assert.equal(bouwaPilotPresentation(state(true, true), false, true), 'denied');

process.stdout.write('Bouwa pilot access UI contract passed: loading is hidden, denied is hidden, allowed is visible.\n');
