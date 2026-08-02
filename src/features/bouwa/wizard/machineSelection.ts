/**
 * What a machine selection is allowed to fill in.
 *
 * Both mappings follow the same rule, and it is the important one: a selection
 * fills the fields the source genuinely states, and not one field more.
 *
 * The ARS machine register holds make, model and serial number. It does not
 * hold rated capacity, discharge pressure or package power, so choosing an
 * installed machine fills three answers and leaves the ratings to be entered
 * from the datasheet.
 *
 * The Bouwa spec library holds published ratings, so choosing a proposed
 * machine fills the capacity and the power — but never the flow-reference
 * basis, which the library does not state, and never the pressure basis. Those
 * remain questions, because a capacity without its basis is not comparable to
 * anything, and quietly assuming one is exactly how two incomparable numbers
 * end up subtracted from each other.
 */

import type { BouwaMachineSpec } from '../types';
import type { Machine } from '../../../lib/api';
import type { IntakeAnswer } from '../auditIntakeTypes';
import type {
  WizardInstalledMachine,
  WizardSpecRecord,
} from './wizardTypes';

export type MachineIntakeEntry = [string, IntakeAnswer<unknown>];

function answered(value: string | number): IntakeAnswer<unknown> {
  return { state: 'answered', value, note: null };
}

/**
 * What an ARS register entry states about an installed machine. Free-text ARS
 * fields such as the machine type are not mapped onto the controlled audit
 * taxonomy, because a loose label and a scientific category are not the same
 * thing.
 */
export function existingMachineEntries(machine: Machine): MachineIntakeEntry[] {
  const entries: MachineIntakeEntry[] = [
    ['existingMachine.selectionMode', answered('existing_catalog_machine')],
    ['existingMachine.arsMachineId', answered(machine._id)],
  ];
  if (machine.make?.trim())
    entries.push(['existingMachine.manufacturer', answered(machine.make.trim())]);
  if (machine.model?.trim())
    entries.push(['existingMachine.model', answered(machine.model.trim())]);
  if (machine.serialNumber?.trim())
    entries.push([
      'existingMachine.serialNumber',
      answered(machine.serialNumber.trim()),
    ]);
  return entries;
}

/** What a spec-library entry states, and the power basis it states it on. */
export function proposedMachineEntries(
  spec: BouwaMachineSpec,
): MachineIntakeEntry[] {
  const entries: MachineIntakeEntry[] = [
    ['proposedMachine.selectionMode', answered('existing_catalog_machine')],
    ['proposedMachine.arsMachineId', answered(spec._id)],
  ];
  const manufacturer = spec.manufacturer ?? spec.brand;
  if (manufacturer?.trim())
    entries.push(['proposedMachine.manufacturer', answered(manufacturer.trim())]);
  const model = spec.modelName ?? spec.modelCode;
  if (model?.trim()) entries.push(['proposedMachine.model', answered(model.trim())]);
  if (typeof spec.ratedCapacityM3Min === 'number')
    entries.push([
      'proposedMachine.ratedFadM3PerMin',
      answered(spec.ratedCapacityM3Min),
    ]);
  // The library names the figure it holds, so the basis follows from the field
  // it was published in rather than from a guess.
  if (typeof spec.packageInputKw === 'number') {
    entries.push([
      'proposedMachine.packageInputPowerKw',
      answered(spec.packageInputKw),
    ]);
    entries.push([
      'proposedMachine.powerBasis',
      answered('manufacturer_package_input'),
    ]);
  } else if (typeof spec.motorKw === 'number') {
    entries.push(['proposedMachine.packageInputPowerKw', answered(spec.motorKw)]);
    entries.push(['proposedMachine.powerBasis', answered('motor_nameplate_rating')]);
  }
  // Fixed speed covers both load/unload and modulation, which are different
  // machines to model, so only a variable-speed drive is unambiguous.
  if (spec.speedControl === 'VSD' || spec.speedControl === 'VARIABLE_SPEED')
    entries.push([
      'proposedMachine.controlMethod',
      answered('variable_speed_drive'),
    ]);
  return entries;
}

/* ------------------------------------------------------------------ *
 * The specification library
 * ------------------------------------------------------------------ */

/**
 * What an ARS register entry states about a machine standing on a site. The
 * register is an asset list, not a datasheet: it knows what the machine is
 * called and where it is, and nothing about how it performs.
 */
export function installedMachineEntries(
  machine: WizardInstalledMachine,
): MachineIntakeEntry[] {
  const entries: MachineIntakeEntry[] = [
    ['existingMachine.selectionMode', answered('existing_catalog_machine')],
    ['existingMachine.arsMachineId', answered(machine.machineId)],
  ];
  if (machine.manufacturer.trim())
    entries.push([
      'existingMachine.manufacturer',
      answered(machine.manufacturer.trim()),
    ]);
  if (machine.model.trim())
    entries.push(['existingMachine.model', answered(machine.model.trim())]);
  if (machine.serialNumber?.trim())
    entries.push([
      'existingMachine.serialNumber',
      answered(machine.serialNumber.trim()),
    ]);
  return entries;
}

/**
 * Every value a library record genuinely publishes, written onto the machine
 * the proposal is describing.
 *
 * The rule that matters is what is absent. A record holds a null wherever its
 * source printed nothing, and a null is never written as an answer: the field
 * stays a question, so a later page shows it unanswered rather than showing a
 * blank dressed as a manufacturer's figure. That is why a CAGI directory line
 * fills four fields and a full data sheet fills a dozen, from the same code.
 *
 * The power basis is not a guess either. It follows from the field the number
 * was published in, so a package input power is recorded as a package input
 * power and a motor rating as a motor rating; the two are not interchangeable
 * in an energy model.
 */
export function specLibraryEntries(
  record: WizardSpecRecord,
  role: 'existingMachine' | 'proposedMachine',
): MachineIntakeEntry[] {
  const at = (field: string): string => `${role}.${field}`;
  const entries: MachineIntakeEntry[] = [
    [at('selectionMode'), answered('existing_catalog_machine')],
    [at('arsMachineId'), answered(record.recordId)],
  ];

  const push = (field: string, value: string | number | null): void => {
    if (value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    entries.push([at(field), answered(typeof value === 'string' ? value.trim() : value)]);
  };

  push('manufacturer', record.manufacturer);
  // The variant is part of what the machine is called, not a separate answer,
  // because the wizard asks for one model and the library files GA55 and
  // GA55 FF as different machines under one name.
  push(
    'model',
    record.modelVariant === null
      ? record.model
      : `${record.model} ${record.modelVariant}`,
  );
  push('machineType', record.compressorType);
  push('controlMethod', record.controlMethod);
  push('ratedDischargePressureBarG', record.ratedPressureBarG);
  push('ratedFadM3PerMin', record.ratedFadM3PerMin);
  push('ratedFlowReferenceBasis', record.flowReferenceBasis);
  push('motorEfficiency', record.motorEfficiencyFraction);

  if (record.packageInputPowerKw !== null) {
    push('packageInputPowerKw', record.packageInputPowerKw);
    push('powerBasis', 'manufacturer_package_input');
  } else if (record.motorShaftPowerKw !== null) {
    push('packageInputPowerKw', record.motorShaftPowerKw);
    push('powerBasis', 'motor_nameplate_rating');
  }

  if (role === 'existingMachine') {
    push('motorNameplatePowerKw', record.motorShaftPowerKw);
    push('manufacturerEvidenceReference', sourceReference(record));
  } else {
    push('specificPowerKwPerM3PerMin', record.specificPowerKwPerM3PerMin);
    push('vsdMinimumFlowM3PerMin', record.vsdMinimumFlowM3PerMin);
    push('vsdMaximumFlowM3PerMin', record.vsdMaximumFlowM3PerMin);
    push('manufacturerSource', sourceReference(record));
  }

  return entries;
}

/**
 * The part-load curve, which is a list rather than an answer and so is written
 * separately. An empty list stays empty: a variable-speed machine with no
 * published curve must keep its part-load outputs blocked rather than be given
 * a curve nobody measured.
 */
export function specLibraryPartLoadPoints(
  record: WizardSpecRecord,
): { flowM3PerMin: number; packageInputPowerKw: number }[] {
  return record.partLoadPoints.map(point => ({
    flowM3PerMin: point.flowM3PerMin,
    packageInputPowerKw: point.packageInputPowerKw,
  }));
}

/** How a source document reads when it is cited on a proposal. */
export function sourceReference(record: WizardSpecRecord): string {
  const parts = [record.source.sourceTitle];
  if (record.source.sourceOrganisation) parts.push(record.source.sourceOrganisation);
  if (record.source.sourceVersion) parts.push(`version ${record.source.sourceVersion}`);
  else if (record.source.sourceDate) parts.push(record.source.sourceDate);
  return parts.join(' — ');
}
