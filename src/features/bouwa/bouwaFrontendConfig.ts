/**
 * Bouwa module frontend configuration.
 *
 * This file is config-only. It is NOT imported into:
 *   - App.tsx  (routing)
 *   - Dashboard.tsx  (navigation)
 *   - MobileNavigation.tsx  (mobile nav)
 *
 * Wire it up when Phase 4C-2 (Bouwa UI scaffolding) begins.
 *
 * Phase 4C-1: declaration only.
 */

import { BOUWA_PERMISSIONS, ALL_BOUWA_PERMISSIONS } from '../../constants/permissions';
import { FEATURE_FLAGS } from '../../constants/features';

/**
 * Stable module key used for route prefixes, nav identifiers, and
 * local-storage keys.
 */
export const BOUWA_MODULE_KEY = 'bouwa' as const;

/**
 * Backend feature flag key that gates access to this module.
 * Must be enabled (isEnabled: true) in the FeatureFlag collection before
 * the module is accessible.
 */
export const BOUWA_FEATURE_FLAG = FEATURE_FLAGS.BOUWA;

/**
 * The minimum permission required to see any part of the Bouwa module.
 */
export const BOUWA_VIEW_PERMISSION = BOUWA_PERMISSIONS.VIEW;

/**
 * Full set of permission strings belonging to the Bouwa module.
 * Useful for role-assignment forms and admin UIs.
 */
export const BOUWA_ALL_PERMISSIONS = ALL_BOUWA_PERMISSIONS;

/**
 * Canonical permission constants re-exported for convenience so
 * Bouwa UI components only need to import from this file.
 */
export { BOUWA_PERMISSIONS };

/**
 * Human-readable module metadata.
 * Not rendered anywhere until Phase 4C-2.
 */
export const BOUWA_MODULE_META = {
  key:          BOUWA_MODULE_KEY,
  label:        'Bouwa Proposals',
  description:  'Air compressor energy-saving proposal generation and costing module.',
  featureFlag:  BOUWA_FEATURE_FLAG,
  viewPermission: BOUWA_VIEW_PERMISSION,
  /** UI is not yet wired — do not render nav/routes until Phase 4C-2. */
  uiReady: false,
} as const;

export default BOUWA_MODULE_META;
