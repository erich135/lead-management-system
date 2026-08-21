/**
 * Reading a machine selection, now that the server writes it.
 *
 * These mappings used to live here: the browser looked at a library record and
 * decided which questions it answered. That was one opinion of what Atlas Copco
 * published, and the review page and the proposal document each held their own,
 * so a figure could reach a customer that no single part of the system had
 * vouched for. The population moved to `POST /drafts/:id/machine-selection`,
 * which answers with the draft as it now stands.
 *
 * What remains here is presentation: how a source reads when it is cited, and
 * how a record's own account of its gaps reads on a search result. Neither
 * writes an answer.
 */

import type {
  WizardAnswerProvenance,
  WizardInstalledMachine,
  WizardSpecMatch,
  WizardSpecMatchOutcome,
  WizardSpecRecord,
  WizardSpecSnapshot,
  WizardSpecSource,
} from './wizardTypes';

export const MACHINE_PICKER_CAPTURE_CODES = [
  'AUDIT.EXISTING_MACHINE.SELECTION_MODE',
  'AUDIT.EXISTING_MACHINE.ARS_MACHINE_ID',
  'AUDIT.PROPOSED_MACHINE.SELECTION_MODE',
  'AUDIT.PROPOSED_MACHINE.ARS_MACHINE_ID',
] as const;

/** Mirrors BOUWA_SPEC_SOURCE_TYPE_LABELS on the server. */
export const SPEC_SOURCE_TYPE_LABELS: Record<string, string> = {
  cagi_verified_datasheet: 'CAGI verified data sheet',
  cagi_directory: 'CAGI performance-verification directory',
  oem_datasheet: 'Manufacturer data sheet',
  iso_1217_certificate: 'ISO 1217 certificate',
  ars_curated_register: 'ARS curated source register',
  customer_document: 'Customer document',
};

/** What a source type is called in front of a customer. */
export function sourceTypeLabel(sourceType: string): string {
  return SPEC_SOURCE_TYPE_LABELS[sourceType] ?? sourceType;
}

/** The version or date a source is identified by, whichever it published. */
export function sourceEdition(source: WizardSpecSource): string {
  if (source.sourceVersion) return `Version ${source.sourceVersion}`;
  if (source.sourceDate) return source.sourceDate;
  return 'No version or date published';
}

export interface MachineEvidenceLine {
  label: string;
  value: string;
}

function trimTrailingZeros(text: string): string {
  return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Sales-wizard display of a stored engineering number. The stored value is
 * left at full source precision; this only changes what the salesperson sees.
 */
export function salesDisplayNumber(value: number, unit: string | null): string {
  if (unit === 'm³/min') return value.toFixed(2);
  if (unit === 'bar(g)') return trimTrailingZeros(value.toFixed(2));
  if (unit === 'kW') return trimTrailingZeros(value.toFixed(1));
  return String(value);
}

export function salesLockedAnswerText(
  storedValue: unknown,
  unit: string | null,
  fallback: string,
): string {
  if (typeof storedValue !== 'number' || !Number.isFinite(storedValue))
    return fallback;
  if (unit !== 'bar(g)' && unit !== 'm³/min' && unit !== 'kW') return fallback;
  return salesDisplayNumber(storedValue, unit);
}

function controlDiscriminator(method: string | null): string | null {
  if (method === 'variable_speed_drive') return 'VSD';
  if (method === 'fixed_speed_load_unload') return 'Fixed speed';
  if (method === 'fixed_speed_modulation') return 'Modulation';
  if (method === 'sequenced_multiple_machines') return 'Sequenced';
  return null;
}

/**
 * Authoritative stored discriminators for a proposed-machine search row.
 * Nothing is invented: a missing pressure or control method is simply omitted.
 */
export function specPickerDiscriminators(record: WizardSpecRecord): string[] {
  const parts: string[] = [];
  if (typeof record.ratedPressureBarG === 'number')
    parts.push(`${salesDisplayNumber(record.ratedPressureBarG, 'bar(g)')} bar(g)`);
  if (typeof record.ratedFadM3PerMin === 'number')
    parts.push(`${salesDisplayNumber(record.ratedFadM3PerMin, 'm³/min')} m³/min`);
  const control = controlDiscriminator(record.controlMethod);
  if (control !== null) parts.push(control);
  if (typeof record.packageInputPowerKw === 'number')
    parts.push(`${salesDisplayNumber(record.packageInputPowerKw, 'kW')} kW`);
  else if (typeof record.motorShaftPowerKw === 'number')
    parts.push(`${salesDisplayNumber(record.motorShaftPowerKw, 'kW')} kW motor`);
  return parts;
}

export function snapshotRatingLines(
  values: WizardSpecSnapshot['values'] | Record<string, unknown> | undefined,
): MachineEvidenceLine[] {
  if (values === undefined) return [];
  const lines: MachineEvidenceLine[] = [];
  const pressure = values.ratedPressureBarG;
  const fad = values.ratedFadM3PerMin;
  const packageKw = values.packageInputPowerKw;
  const motorKw = values.motorShaftPowerKw;
  const control = values.controlMethod;
  const hasRating =
    typeof pressure === 'number' ||
    typeof fad === 'number' ||
    typeof packageKw === 'number' ||
    typeof motorKw === 'number' ||
    typeof control === 'string';
  if (!hasRating) return [];
  if (typeof pressure === 'number')
    lines.push({
      label: 'Pressure',
      value: `${salesDisplayNumber(pressure, 'bar(g)')} bar(g)`,
    });
  if (typeof fad === 'number')
    lines.push({
      label: 'FAD',
      value: `${salesDisplayNumber(fad, 'm³/min')} m³/min`,
    });
  if (typeof packageKw === 'number')
    lines.push({
      label: 'Package input',
      value: `${salesDisplayNumber(packageKw, 'kW')} kW`,
    });
  else
    lines.push({ label: 'Package input', value: 'Not published by source' });
  if (typeof motorKw === 'number')
    lines.push({
      label: 'Motor power',
      value: `${salesDisplayNumber(motorKw, 'kW')} kW`,
    });
  const controlLabel = typeof control === 'string' ? controlDiscriminator(control) : null;
  if (controlLabel !== null)
    lines.push({ label: 'Control', value: controlLabel });
  return lines;
}

/**
 * The manufacturer evidence behind a chosen machine, as the rep should see it
 * rather than type it.
 *
 * The rep used to be asked, several screens after choosing a machine from the
 * library, what the manufacturer evidence was — a question the system had
 * already answered for itself and could not have answered wrongly. What it got
 * back was whatever the rep remembered. These are the lines the snapshot
 * already holds, so the answer on the proposal is the document that was
 * actually read.
 */
export function machineEvidenceLines(
  snapshot: WizardSpecSnapshot,
): MachineEvidenceLine[] {
  const source = snapshot.source;
  const lines: MachineEvidenceLine[] = [
    { label: 'Source type', value: sourceTypeLabel(source.sourceType) },
    { label: 'Document', value: source.sourceTitle },
  ];
  if (source.sourceOrganisation)
    lines.push({ label: 'Published by', value: source.sourceOrganisation });
  lines.push({ label: 'Version or date', value: sourceEdition(source) });
  if (source.sourcePageReference)
    lines.push({ label: 'Page', value: source.sourcePageReference });
  return [...lines, ...snapshotRatingLines(snapshot.values)];
}

/**
 * Where the document itself can be opened, if anywhere. A directory line taken
 * from a saved register has no address to send anybody to, and offering a dead
 * "View document" link is worse than offering none.
 */
export function machineEvidenceLink(snapshot: WizardSpecSnapshot): string | null {
  return snapshot.source.sourceUrl ?? null;
}

/** How a source document reads when it is cited on a proposal. */
export function sourceReference(record: WizardSpecRecord): string {
  const parts = [record.source.sourceTitle];
  if (record.source.sourceOrganisation)
    parts.push(record.source.sourceOrganisation);
  if (record.source.sourceVersion)
    parts.push(`version ${record.source.sourceVersion}`);
  else if (record.source.sourceDate) parts.push(record.source.sourceDate);
  return parts.join(' — ');
}

/**
 * The machine's name as a proposal carries it. The library files GA55 and
 * GA55 FF as different machines, and the wizard asks for one model, so the
 * variant belongs in the name rather than in a question of its own.
 */
export function specModelName(record: WizardSpecRecord): string {
  return record.modelVariant === null
    ? record.model
    : `${record.model} ${record.modelVariant}`;
}

/**
 * How an installed machine reads in a list. The ARS machine id is deliberately
 * absent: a rep identifies a machine by what is written on it, and an internal
 * identifier on screen is an invitation to quote it at a customer.
 */
export function installedMachineLabel(machine: WizardInstalledMachine): string {
  return machine.label;
}

/**
 * What a record cannot support, said plainly enough to choose against. A
 * directory line is worth offering — it is still the manufacturer's figure for
 * capacity — but a rep should be able to see before choosing it that it will
 * not carry an energy model.
 */
export function absenceCaution(record: WizardSpecRecord): string | null {
  if (record.absentPublishedValues.length === 0) return null;
  return `Not published: ${record.absentPublishedValues.join(', ')}.`;
}

export const MAX_EXISTING_MACHINE_SPEC_CANDIDATES = 5;

/** Serial, year and location a rep would otherwise retype. */
export function installedMachineDetail(machine: WizardInstalledMachine): string {
  return [
    machine.serialNumber === null || machine.serialNumber.trim() === ''
      ? 'No serial recorded'
      : `Serial ${machine.serialNumber}`,
    machine.yearOfManufacture == null
      ? null
      : `Year ${String(machine.yearOfManufacture)}`,
    machine.location,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');
}

/**
 * Where a populated existing-machine answer came from, in the words the
 * salesperson should see. The origin flag alone says "from source"; the source
 * kind says whether that source was the ARS machine or a datasheet.
 */
export function populatedAnswerCaption(provenance: WizardAnswerProvenance): string {
  if (provenance.origin === 'changed_for_this_proposal')
    return 'Changed for this proposal';
  if (provenance.origin === 'not_published_by_source')
    return 'Not published by source';
  if (provenance.sourceKind === 'ars_machine_register')
    return 'Populated from ARS machine';
  if (provenance.sourceKind === 'machine_spec_library')
    return 'Populated from Machine Specification Library';
  if (provenance.sourceKind === 'tariff_library')
    return 'Suggested from tariff library';
  return 'Populated from source';
}

export function specMatchNotice(outcome: WizardSpecMatchOutcome): string | null {
  if (outcome === 'exact')
    return 'Published ratings populated from the specification library.';
  if (outcome === 'candidates_require_confirmation')
    return 'Multiple technical configurations found';
  if (outcome === 'no_match')
    return 'No matching specification in the library. Known identity is filled; ratings stay unanswered until supplied.';
  return null;
}

export function specMatchCandidates(match: WizardSpecMatch): WizardSpecMatch['candidates'] {
  return match.candidates.slice(0, MAX_EXISTING_MACHINE_SPEC_CANDIDATES);
}
