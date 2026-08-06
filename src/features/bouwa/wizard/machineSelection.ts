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
  WizardInstalledMachine,
  WizardSpecRecord,
  WizardSpecSnapshot,
  WizardSpecSource,
} from './wizardTypes';

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
  return lines;
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
