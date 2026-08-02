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

import type { WizardInstalledMachine, WizardSpecRecord } from './wizardTypes';

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
