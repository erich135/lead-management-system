/**
 * How a backend figure is put on screen, and nothing more.
 *
 * The backend decides what a figure is worth: its value, its unit, where it
 * came from, how certain it is, and the reason when there is nothing to
 * release. This module only chooses the words. It is pure and separate from the
 * screen so the rules that matter can be asserted directly: an unavailable
 * figure never reads as a number, a valid zero always reads as zero, and every
 * provenance and uncertainty class the backend can send has a label, so no
 * figure can arrive and be shown as blank.
 */

import type {
  ScientificCalculationProvenance,
  ScientificFigureMetadata,
  ScientificUncertainty,
} from './loggerLocalTypes';

export const MEASURED_DEMAND_UNAVAILABLE_LABEL = 'Unavailable';

export const PROVENANCE_LABELS: Record<ScientificCalculationProvenance, string> = {
  exact_mathematics: 'Exact calculation',
  established_engineering: 'Established engineering',
  manufacturer_specification: 'Manufacturer-derived',
  approved_assumption: 'Approved assumption',
  business_input: 'Business input',
  user_input: 'User input',
};

export const UNCERTAINTY_LABELS: Record<ScientificUncertainty, string> = {
  measured: 'Measured',
  derived_exact: 'Exact calculation',
  derived_manufacturer: 'Manufacturer-derived',
  estimated: 'Estimated',
  estimated_from_short_record: 'Estimated from short record',
  unavailable: 'Unavailable',
};

export const measuredNumber = (value: number, digits: number) =>
  value.toLocaleString('en-ZA', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const measuredUnit = (unit: string) => unit.replace('m3', 'm³');

export interface FigurePresentation {
  /** False only when the backend released no value. */
  readonly available: boolean;
  /** The value and its unit, or the unavailable label. Never an invented zero. */
  readonly text: string;
  /** Uncertainty, provenance and calculation identity, as the backend set them. */
  readonly detail: string;
  /** The backend's reason, shown wherever there is no value to show. */
  readonly reason: string | null;
}

export function describeFigure(
  value: number | null,
  metadata: ScientificFigureMetadata,
  digits: number,
): FigurePresentation {
  const available = value !== null && Number.isFinite(value);
  return {
    available,
    text: available
      ? `${measuredNumber(value as number, digits)} ${measuredUnit(metadata.unit)}`
      : MEASURED_DEMAND_UNAVAILABLE_LABEL,
    detail: `${UNCERTAINTY_LABELS[metadata.uncertainty]} · ${
      PROVENANCE_LABELS[metadata.provenance]
    } · ${metadata.calculationId}`,
    reason: available ? null : metadata.reason,
  };
}

export function describeNumericUncertainty(
  metadata: ScientificFigureMetadata,
): string {
  if (metadata.numericUncertainty === null) return 'Not defined';
  const { plusMinus, unit, basis } = metadata.numericUncertainty;
  return `± ${measuredNumber(plusMinus, 3)} ${measuredUnit(unit)} · ${basis.replace(
    /_/g,
    ' ',
  )}`;
}
