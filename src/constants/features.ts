/**
 * Frontend feature flag constants.
 *
 * Feature flag keys must match the `key` field stored in the backend
 * FeatureFlag collection (ars-app-backend/src/models/FeatureFlag.ts).
 *
 * Usage:
 *   import { FEATURE_FLAGS } from '../constants/features';
 *   // check against user's enabled feature flags when the helper is available
 *   FEATURE_FLAGS.BOUWA  // => "bouwa"
 *
 * Phase 4C-1: constants only. No runtime feature-flag checking helper is
 * wired to UI components in this phase.
 */

export const FEATURE_FLAGS = {
  /** Bouwa proposal & costing module.  Disabled by default on backend. */
  BOUWA: 'bouwa',
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

export default FEATURE_FLAGS;
