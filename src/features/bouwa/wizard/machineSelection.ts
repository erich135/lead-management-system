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
