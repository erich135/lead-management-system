/**
 * Bouwa — Simple Optimiser Engine
 * Phase 4D-18 (first pass — draft status)
 *
 * Compares current / proposed / optimised annual operating cost.
 * Full TOU hour-by-hour matrix optimisation is NOT implemented yet.
 * Status: draft — show as "requires review" until complete.
 */

import type { OptimiserScenario } from './bouwaTypes';

export function buildOptimiserScenarios(
  currentAnnualCostR: number,
  proposedGrossCostR: number,
  proposedNetCostR: number,
): OptimiserScenario[] {
  return [
    {
      label: 'Current Operation (L160 fixed-speed)',
      annualCostR: currentAnnualCostR,
      description: 'Existing fixed-speed compressor(s) running at current load profile. Includes unload losses.',
      status: 'confirmed',
    },
    {
      label: 'Proposed VSD — Gross Cost',
      annualCostR: proposedGrossCostR,
      description: 'Proposed Bouwa VSD replacement. TOU energy cost before applying VSD credit.',
      status: 'requires-review',
    },
    {
      label: 'Proposed VSD — Net Cost (after VSD credit)',
      annualCostR: proposedNetCostR,
      description: 'Net annual cost after 14% VSD saving credit. Matches workbook net proposed cost.',
      status: 'requires-review',
    },
    {
      label: 'Optimised with TOU Load Shifting',
      annualCostR: 0,
      description: 'Peak hour load avoidance / shifting strategy. Requires full TOU matrix — not yet calculated. Marked as draft.',
      status: 'draft',
    },
    {
      label: 'Optimised with Dual-Compressor Control',
      annualCostR: 0,
      description: 'If retaining two machines: load sharing and alternation strategy. Requires demand profile and control system spec — not yet modelled.',
      status: 'draft',
    },
  ];
}
