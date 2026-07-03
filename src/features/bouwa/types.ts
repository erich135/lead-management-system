/**
 * Local types for the Bouwa frontend module shell.
 *
 * Phase 4C-2: shell types only.
 * No API shapes defined here — those are added when /api/bouwa is wired up.
 */

/** Readiness state for each Bouwa sub-module area. */
export type BouwaPhaseStatus =
  | 'pending'    // not yet started / awaiting approval
  | 'in_review'  // under internal review
  | 'approved'   // approved and ready
  | 'disabled';  // explicitly disabled / not available to end users

/** Data for a single Bouwa phase card shown in the shell. */
export interface BouwaShellCard {
  /** Short display title. */
  title: string;
  /** One-sentence description. */
  description: string;
  /** Current readiness status. */
  status: BouwaPhaseStatus;
  /** Optional icon name (from lucide-react) — resolved by the component. */
  iconKey?: string;
}

/** Requirements that must be met before the Bouwa module is accessible. */
export interface BouwaAccessRequirement {
  /** Backend feature-flag key that must be enabled. */
  featureFlag: string;
  /** Permission string the user must hold. */
  viewPermission: string;
  /** Human-readable reason why the module may be unavailable. */
  unavailableReason?: string;
}
