/**
 * Presenting the tariff library to a sales rep.
 *
 * Nothing here decides anything. The server owns what a determination says and
 * which questions it answers; this file only turns a record into lines a person
 * can read, and works out which step of the cascade to ask next.
 *
 * The cascade exists because the register's own taxonomy is unguessable. A rep
 * who has to type "≥500V & <66kV" will type something else, and the proposal
 * will be costed on a tariff the customer is not on.
 */

import type {
  WizardTariffFacetField,
  WizardTariffPeriod,
  WizardTariffRecord,
  WizardTariffRoute,
  WizardTariffSnapshot,
} from './wizardTypes';

export const TARIFF_ROUTE_OPTIONS: {
  id: WizardTariffRoute;
  label: string;
  detail: string;
}[] = [
  {
    id: 'customer_bill_supplied',
    label: 'I have the customer’s electricity bill',
    detail:
      'The strongest evidence there is. Upload it and confirm the tariff printed on it.',
  },
  {
    id: 'previously_confirmed_for_customer',
    label: 'Use the tariff already confirmed for this customer',
    detail: 'The determination a previous proposal for this site was costed on.',
  },
  {
    id: 'searched_tariff_library',
    label: 'Find the tariff in the library',
    detail:
      'Narrow the published register down by supplier and supply details.',
  },
  {
    id: 'not_available_yet',
    label: 'Not available yet',
    detail:
      'The proposal carries on. Cost, savings, payback and return on investment stay unavailable until a tariff is confirmed.',
  },
];

/** The cascade, in the order the register itself narrows. */
export const TARIFF_CASCADE: {
  field: WizardTariffFacetField;
  label: string;
  question: string;
}[] = [
  {
    field: 'supplier',
    label: 'Supplier',
    question: 'Who bills the site for electricity?',
  },
  {
    field: 'customerCategory',
    label: 'Customer category',
    question: 'How does the supplier categorise this customer?',
  },
  {
    field: 'voltageCategory',
    label: 'Supply voltage',
    question: 'At what voltage is the site supplied?',
  },
  {
    field: 'transmissionZone',
    label: 'Transmission zone',
    question: 'Which distance band does the supplier bill the site in?',
  },
];

export type TariffCascadeChoices = Partial<
  Record<WizardTariffFacetField, string>
>;

/**
 * The next question worth asking.
 *
 * A step is skipped where the choices already made leave only one value, or
 * none: asking a rep to confirm the only possible answer is a step that teaches
 * them to click without reading.
 */
export function nextCascadeStep(
  chosen: TariffCascadeChoices,
  available: Partial<Record<WizardTariffFacetField, { value: string }[]>>,
): WizardTariffFacetField | null {
  for (const step of TARIFF_CASCADE) {
    if (chosen[step.field] !== undefined) continue;
    const values = available[step.field];
    if (values !== undefined && values.length <= 1) continue;
    return step.field;
  }
  return null;
}

export function cascadeLabel(field: WizardTariffFacetField): string {
  return TARIFF_CASCADE.find((step) => step.field === field)?.label ?? field;
}

export function cascadeQuestion(field: WizardTariffFacetField): string {
  return TARIFF_CASCADE.find((step) => step.field === field)?.question ?? '';
}

/** One line naming the determination, for a list a rep is choosing from. */
export function tariffResultLine(record: WizardTariffRecord): string {
  const parts = [record.supplier, record.tariffName];
  if (record.transmissionZone !== null) parts.push(record.transmissionZone);
  parts.push(record.tariffYearLabel);
  return parts.join(' · ');
}

export interface TariffDetailLine {
  label: string;
  value: string;
}

/**
 * What the register printed beside the tariff, for confirmation before it is
 * taken. A field the register did not publish says so; it is never blank and
 * never a dash, because a rep reading a blank assumes zero.
 */
export function tariffDetailLines(
  record: WizardTariffRecord,
): TariffDetailLine[] {
  const stated = (value: string | null): string =>
    value === null || value.trim() === '' ? 'Not stated by the source' : value;
  return [
    { label: 'Supplier', value: record.supplier },
    { label: 'Supply authority', value: record.supplierTypeLabel },
    { label: 'Tariff', value: record.tariffName },
    { label: 'Tariff code', value: stated(record.tariffCode) },
    { label: 'Customer category', value: stated(record.customerCategory) },
    { label: 'Supply voltage', value: stated(record.voltageCategory) },
    { label: 'Transmission zone', value: stated(record.transmissionZone) },
    { label: 'Determination', value: record.tariffYearLabel },
    {
      label: 'In force from',
      value:
        record.effectiveTo === null
          ? record.effectiveFrom
          : `${record.effectiveFrom} to ${record.effectiveTo}`,
    },
    {
      label: 'VAT basis',
      value:
        record.vatBasis === 'not_published'
          ? 'Not stated by the source — confirm from the bill'
          : record.vatBasis === 'including_vat'
            ? 'Including VAT'
            : 'Excluding VAT',
    },
    { label: 'Source', value: record.source.sourceTitle },
  ];
}

/** The published rates, as a table a rep can check against a bill. */
export function tariffRateLines(
  periods: readonly WizardTariffPeriod[],
): TariffDetailLine[] {
  const rand = (value: unknown): string | null =>
    typeof value === 'number' && Number.isFinite(value)
      ? `R ${value.toFixed(4)} / kWh`
      : null;
  const lines: TariffDetailLine[] = [];
  for (const period of periods) {
    const window = `${period.periodStart} to ${period.periodEnd}`;
    const standard = rand(period.standardRateRandPerKwh);
    const peak = rand(period.peakRateRandPerKwh);
    const offPeak = rand(period.offPeakRateRandPerKwh);
    if (standard !== null) lines.push({ label: `${window} · standard`, value: standard });
    if (peak !== null) lines.push({ label: `${window} · peak`, value: peak });
    if (offPeak !== null)
      lines.push({ label: `${window} · off-peak`, value: offPeak });
    if (
      typeof period.demandChargeRand === 'number' &&
      Number.isFinite(period.demandChargeRand)
    )
      lines.push({
        label: `${window} · demand charge`,
        value: `R ${period.demandChargeRand.toFixed(2)}${
          period.demandChargeBaseUnit === null
            ? ''
            : ` / ${period.demandChargeBaseUnit}`
        }`,
      });
  }
  return lines;
}

/** How the tariff on a proposal reads once it has been chosen. */
export function tariffSnapshotLine(snapshot: WizardTariffSnapshot): string {
  return `${snapshot.values.supplier} · ${snapshot.values.tariffName} · ${snapshot.values.tariffYearLabel}`;
}

export function tariffRouteLabel(route: WizardTariffRoute): string {
  return (
    TARIFF_ROUTE_OPTIONS.find((option) => option.id === route)?.label ?? route
  );
}

/**
 * What the proposal cannot state while no tariff is confirmed. Named in the
 * customer's language rather than by output identifier, because this text is
 * read aloud in front of the customer.
 */
export const TARIFF_DEPENDENT_FIGURES: readonly string[] = [
  'Annual electricity cost',
  'Rand saving',
  'Simple payback',
  'Return on investment',
];
