export const PASCALS_PER_BAR = 100_000;

export const AIRFLOW_REFERENCE_BASIS_LABEL = 'Airflow reference basis';
export const REFERENCE_INLET_PRESSURE_LABEL = 'Published reference inlet pressure';
export const REFERENCE_INLET_PRESSURE_UNIT = 'bar absolute';
export const SPECIFICATION_REFERENCE_LABEL = 'Specification source / reference';

export const AIRFLOW_REFERENCE_BASIS_HELP =
  'Site-adjusted airflow uses the published Free Air Delivery (FAD) rating. Choose that basis when the datasheet states FAD.';

export const REFERENCE_INLET_PRESSURE_HELP =
  'Enter the inlet absolute pressure used for that published FAD rating, in bar absolute. This is not the compressor’s discharge or working pressure (for example 8.5 bar). Typical published FAD ratings use about 1.013 bar absolute.';

export const SPECIFICATION_REFERENCE_HELP =
  'The datasheet, CAGI listing, or other source that states the FAD basis and reference inlet pressure.';

export const DISCHARGE_PRESSURE_HINT =
  'That looks like a working or discharge pressure. Enter the published inlet pressure in bar absolute — usually near 1.0, not the machine’s 8.5 bar rating.';

export const PUBLISHED_AIRFLOW_FAD_SUMMARY =
  'Published airflow: Free Air Delivery (FAD)';
export const AIRFLOW_REFERENCE_NEEDS_CONFIRMATION =
  'Airflow reference needs confirmation';
export const ADVANCED_SPECIFICATIONS_LABEL = 'Advanced specifications';
export const OPEN_ADVANCED_SPECIFICATIONS_ACTION = 'Open Advanced specifications';

export const SUPPORTED_FLOW_REFERENCE_BASIS = 'free_air_delivery' as const;

export const FLOW_REFERENCE_BASIS_OPTIONS = [
  { value: 'free_air_delivery', label: 'Free Air Delivery (FAD)' },
  { value: 'actual_volumetric', label: 'Actual volumetric flow at line conditions' },
  { value: 'standard_volumetric', label: 'Standard volumetric flow at a stated reference' },
  { value: 'delivered_downstream', label: 'Delivered flow measured downstream' },
  { value: 'mass_flow', label: 'Mass flow' },
  { value: 'other_manufacturer_defined', label: 'Other manufacturer-defined basis' },
] as const;

export type FlowReferenceBasis = (typeof FLOW_REFERENCE_BASIS_OPTIONS)[number]['value'];

export interface PublishedFlowReference {
  flowReferenceBasis: string | null;
  referenceAbsolutePressurePa: number | null;
  specificationReference: string | null;
}

export const EMPTY_PUBLISHED_FLOW_REFERENCE: PublishedFlowReference = {
  flowReferenceBasis: null,
  referenceAbsolutePressurePa: null,
  specificationReference: null,
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function isFlowReferenceBasis(value: unknown): value is FlowReferenceBasis {
  return FLOW_REFERENCE_BASIS_OPTIONS.some((option) => option.value === value);
}

export function paToBarAbsolute(pa: number | null | undefined): number | null {
  const pressure = finiteOrNull(pa);
  if (pressure === null) return null;
  return pressure / PASCALS_PER_BAR;
}

export function barAbsoluteToPa(barAbs: number | null | undefined): number | null {
  const bar = finiteOrNull(barAbs);
  if (bar === null) return null;
  return bar * PASCALS_PER_BAR;
}

export function parseBarAbsoluteText(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return barAbsoluteToPa(Number(trimmed.replace(',', '.')));
}

export function formatBarAbsoluteFromPa(pa: number | null | undefined): string {
  const bar = paToBarAbsolute(pa);
  if (bar === null) return '';
  return String(bar);
}

export function looksLikeDischargePressureBarAbs(barAbs: number | null): boolean {
  return barAbs !== null && barAbs >= 2;
}

export function specificationReferenceFromSpec(spec: {
  sourceTitle?: string | null;
  sourceFileName?: string | null;
} | null): string | null {
  const title = spec?.sourceTitle?.trim();
  if (title) return title;
  const fileName = spec?.sourceFileName?.trim();
  return fileName || null;
}

export function publishedFlowReferenceFromSpec(spec: {
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
  sourceTitle?: string | null;
  sourceFileName?: string | null;
} | null): PublishedFlowReference {
  if (!spec) return { ...EMPTY_PUBLISHED_FLOW_REFERENCE };
  return {
    flowReferenceBasis: isFlowReferenceBasis(spec.flowReferenceBasis)
      ? spec.flowReferenceBasis
      : spec.flowReferenceBasis?.trim() || null,
    referenceAbsolutePressurePa: finiteOrNull(spec.referenceAbsolutePressurePa),
    specificationReference: specificationReferenceFromSpec(spec),
  };
}

export function resolveDraftPublishedFlowReference(input: {
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
  specificationReference?: string | null;
  selectedSpec?: {
    flowReferenceBasis?: string | null;
    referenceAbsolutePressurePa?: number | null;
    sourceTitle?: string | null;
    sourceFileName?: string | null;
  } | null;
}): PublishedFlowReference {
  const fromSpec = publishedFlowReferenceFromSpec(input.selectedSpec ?? null);
  return {
    flowReferenceBasis: input.flowReferenceBasis ?? fromSpec.flowReferenceBasis,
    referenceAbsolutePressurePa:
      input.referenceAbsolutePressurePa ?? fromSpec.referenceAbsolutePressurePa,
    specificationReference:
      input.specificationReference ?? fromSpec.specificationReference,
  };
}

export function hasConfirmedPublishedFlowReference(input: {
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
}): boolean {
  return (
    input.flowReferenceBasis === SUPPORTED_FLOW_REFERENCE_BASIS &&
    finiteOrNull(input.referenceAbsolutePressurePa) !== null
  );
}

export function flowReferenceBasisLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return FLOW_REFERENCE_BASIS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function hasKnownFlowReferenceBasis(
  value: string | null | undefined,
): boolean {
  return Boolean(value && value.trim());
}

export function publishedAirflowBasisSummary(
  basis: string | null | undefined,
): string | null {
  if (!hasKnownFlowReferenceBasis(basis)) return null;
  if (basis === SUPPORTED_FLOW_REFERENCE_BASIS) return PUBLISHED_AIRFLOW_FAD_SUMMARY;
  const label = flowReferenceBasisLabel(basis);
  return label ? `Published airflow: ${label}` : null;
}
