const ELECTRICAL_LABEL_PATTERN =
  /\b(kW|kWh|electricity cost|specific power|package input)\b/i;

export function isRenderableMeasuredValue(
  value: number | null | undefined,
): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatMeasuredNumber(
  value: number | null | undefined,
  digits = 2,
): string | null {
  if (!isRenderableMeasuredValue(value)) return null;
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMeasuredInteger(
  value: number | null | undefined,
): string | null {
  if (!isRenderableMeasuredValue(value)) return null;
  return Math.round(value).toLocaleString('en-ZA');
}

export function formatEstimatedRand(
  value: number | null | undefined,
): string | null {
  if (!isRenderableMeasuredValue(value)) return null;
  return `R ${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatEstimatedKwh(
  value: number | null | undefined,
): string | null {
  if (!isRenderableMeasuredValue(value)) return null;
  return `${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} kWh`;
}

export function formatMeasuredPercent(
  fraction: number | null | undefined,
): string | null {
  if (!isRenderableMeasuredValue(fraction)) return null;
  return `${(fraction * 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}%`;
}

export function displayOrUnavailable(formatted: string | null): string {
  return formatted ?? 'Not available';
}

export function formatAuditDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCoverageDays(days: number | null | undefined): string | null {
  const formatted = formatMeasuredNumber(days, 1);
  return formatted ? `${formatted} days` : null;
}

export function formatGps(latitude: number | null, longitude: number | null): string | null {
  if (!isRenderableMeasuredValue(latitude) || !isRenderableMeasuredValue(longitude)) {
    return null;
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function formatAltitudeMetres(value: number | null | undefined): string | null {
  const formatted = formatMeasuredInteger(value);
  return formatted ? `${formatted} m` : null;
}

export function containsInventedElectricalCopy(text: string): boolean {
  return ELECTRICAL_LABEL_PATTERN.test(text);
}

export const PRESSURE_BASIS_NOTE =
  'Pressure reference basis will be confirmed before equipment comparison.';

export const SHORT_RECORD_NOTE =
  'This Air Audit covers less than 14 days. Results can still be reviewed, but annual estimates later in the proposal will be based on a shorter measurement period.';
