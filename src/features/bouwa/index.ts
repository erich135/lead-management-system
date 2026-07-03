/**
 * Bouwa feature module — public barrel export.
 *
 * Import from this file when consuming Bouwa module components externally.
 *
 * IMPORTANT: This barrel is NOT imported into:
 *   - src/App.tsx
 *   - src/components/Dashboard.tsx
 *   - src/components/MobileNavigation.tsx
 *
 * The module remains unmounted until Phase 4C-3+ wires it into routing/navigation.
 *
 * Phase 4C-2: shell exports only.
 */

// Shell page
export { BouwaModuleShell } from './pages/BouwaModuleShell';

// Sub-components
export { BouwaPhaseCard } from './components/BouwaPhaseCard';
export { BouwaAccessNotice } from './components/BouwaAccessNotice';

// Types
export type { BouwaPhaseStatus, BouwaShellCard, BouwaAccessRequirement } from './types';

// Config re-export for convenience
export {
  BOUWA_MODULE_KEY,
  BOUWA_FEATURE_FLAG,
  BOUWA_VIEW_PERMISSION,
  BOUWA_ALL_PERMISSIONS,
  BOUWA_PERMISSIONS,
  BOUWA_MODULE_META,
} from './bouwaFrontendConfig';
