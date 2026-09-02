import { formatMeasuredNumber } from './formatMeasured.ts';
import type { PublicMachineSpec, SourceBackedSpec } from './types';

export type ValueOrigin = 'library' | 'source' | 'missing';

export interface EffectiveNumber {
  value: number | null;
  origin: ValueOrigin;
}

function pickNumber(
  libraryValue: number | null | undefined,
  sourceValue: number | null | undefined,
): EffectiveNumber {
  if (typeof libraryValue === 'number' && Number.isFinite(libraryValue)) {
    return { value: libraryValue, origin: 'library' };
  }
  if (typeof sourceValue === 'number' && Number.isFinite(sourceValue)) {
    return { value: sourceValue, origin: 'source' };
  }
  return { value: null, origin: 'missing' };
}

export function effectiveRatedAirflow(
  library: PublicMachineSpec | null,
  source: SourceBackedSpec | null,
): EffectiveNumber {
  return pickNumber(library?.ratedAirflowM3PerMin, source?.ratedAirflowM3PerMin);
}

export function effectiveRatedPressure(
  library: PublicMachineSpec | null,
  source: SourceBackedSpec | null,
): EffectiveNumber {
  return pickNumber(library?.ratedPressureBarG, source?.ratedPressureBarG);
}

export function effectivePackageInput(
  library: PublicMachineSpec | null,
  source: SourceBackedSpec | null,
): EffectiveNumber {
  return pickNumber(library?.packageInputPowerKw, source?.packageInputPowerKw);
}

export function displayedMotorRatingKw(
  library: PublicMachineSpec | null,
  source: SourceBackedSpec | null,
): number | null {
  const libraryMotor = library?.motorShaftPowerKw;
  if (typeof libraryMotor === 'number' && Number.isFinite(libraryMotor)) return libraryMotor;
  const sourceMotor = source?.motorShaftPowerKw;
  if (typeof sourceMotor === 'number' && Number.isFinite(sourceMotor)) return sourceMotor;
  return null;
}

export function specDisplayName(spec: {
  manufacturer?: string | null;
  model?: string | null;
  modelVariant?: string | null;
}): string {
  return [spec.manufacturer, spec.model, spec.modelVariant]
    .filter((part) => part && String(part).trim() !== '')
    .join(' ');
}

export function specLibraryResultCopy(spec: PublicMachineSpec): {
  title: string;
  ratings: string;
  source: string | null;
} {
  const ratings: string[] = [];
  if (spec.ratedPressureBarG !== null) ratings.push(`${spec.ratedPressureBarG} bar`);
  if (spec.ratedAirflowM3PerMin !== null) {
    ratings.push(`${spec.ratedAirflowM3PerMin.toFixed(2)} m³/min`);
  }
  return {
    title: specDisplayName(spec),
    ratings: ratings.join(' · '),
    source: spec.sourceTitle || spec.sourceFileName,
  };
}

export function sourceBackedLabel(source: SourceBackedSpec | null): string | null {
  const filename = source?.sourceFileName?.trim();
  if (!filename) return null;
  return `Source-backed values supplied from: ${filename}`;
}

export function hasUsableSourceBacked(source: SourceBackedSpec | null): boolean {
  if (!source) return false;
  return Boolean(
    source.manufacturer ||
      source.model ||
      source.sourceFileName ||
      source.sourceFileId ||
      source.ratedPressureBarG !== null ||
      source.ratedAirflowM3PerMin !== null ||
      source.packageInputPowerKw !== null ||
      source.motorShaftPowerKw !== null,
  );
}

export const PUBLISHED_PACKAGE_INPUT_LABEL = 'Published package input';
export const MOTOR_RATING_LABEL = 'Motor rating';
export const AIR_AUDIT_ELECTRICAL_NOTE =
  'The Air Audit measures compressed-air performance. Electrical package input shown for the current machine is from the published machine specification, not a measured electrical reading.';

export interface PublishedPowerRatingRow {
  label: string;
  value: string;
}

function formatPublishedKw(value: number | null, digits: number): string | null {
  const formatted = formatMeasuredNumber(value, digits);
  return formatted ? `${formatted} kW` : null;
}

/**
 * Editor-facing published electrical ratings. Package input and motor rating
 * stay separate; motor is never used as package input.
 */
export function publishedPowerRatingRows(
  library: PublicMachineSpec | null,
  source: SourceBackedSpec | null,
): PublishedPowerRatingRow[] {
  const packageInput = effectivePackageInput(library, source);
  const motor = displayedMotorRatingKw(library, source);
  const rows: PublishedPowerRatingRow[] = [
    {
      label: PUBLISHED_PACKAGE_INPUT_LABEL,
      value:
        formatPublishedKw(packageInput.value, 1) ??
        packageInputUnavailableCopy({
          hasLibrary: library !== null,
          hasSource: hasUsableSourceBacked(source),
        }),
    },
  ];
  if (motor !== null) {
    rows.push({
      label: MOTOR_RATING_LABEL,
      value: formatPublishedKw(motor, 2) ?? 'Not available',
    });
  }
  return rows;
}

export function packageInputUnavailableCopy(options: {
  hasLibrary: boolean;
  hasSource: boolean;
}): string {
  if (options.hasLibrary && !options.hasSource) {
    return 'Not available in the library record.';
  }
  if (options.hasSource) {
    return 'Not available from this specification.';
  }
  return 'Not available';
}
