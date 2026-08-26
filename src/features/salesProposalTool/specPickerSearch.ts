import { hasUsableSourceBacked } from './specDisplay.ts';
import type { PublicMachineSpec, SourceBackedSpec } from './types.ts';

/**
 * Proposed (and any SpecPicker) library search must run whenever the search
 * field is actually shown. Gating only on changingSpec leaves a visible
 * "Search BOUWA machine" box that never calls the API, so typing BOU shows
 * "No matching machine found."
 */
export function specPickerShouldSearch(options: {
  changingSpec: boolean;
  capturingSheet: boolean;
  hasSelectedSpec: boolean;
  hasSourceBacked: boolean;
}): boolean {
  if (options.capturingSheet) return false;
  if (options.hasSelectedSpec && !options.changingSpec) return false;
  if (options.hasSourceBacked && !options.changingSpec) return false;
  return true;
}

export function specPickerSearchIsOpen(options: {
  changingSpec: boolean;
  capturingSheet: boolean;
  selectedSpec: PublicMachineSpec | null;
  sourceBacked: SourceBackedSpec | null;
}): boolean {
  return specPickerShouldSearch({
    changingSpec: options.changingSpec,
    capturingSheet: options.capturingSheet,
    hasSelectedSpec: options.selectedSpec !== null,
    hasSourceBacked: hasUsableSourceBacked(options.sourceBacked),
  });
}
