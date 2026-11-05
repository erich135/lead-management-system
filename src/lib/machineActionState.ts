export interface MachineActionFields {
  _id: string;
  dbStatus?: string;
  isActive?: boolean;
  isReadOnly?: boolean;
  mergeStatus?: string;
  redirectStatus?: string;
  canonicalMachineId?: string;
  officeArchivedAt?: string | null;
}

/** Immutable machine identity captured when a row starts a machine-specific flow. */
export interface MachineActionContext {
  requestedMachineId: string;
  canonicalMachineId: string;
  generation: number;
  isReadOnly: boolean;
}

/** Live canonical machine hidden by office archive. Dedup-retired rows stay retired even if a date is present. */
export function isOfficeArchivedMachine(machine: MachineActionFields): boolean {
  return Boolean(machine.officeArchivedAt) && !isRetiredMachine(machine);
}

export function isRetiredMachine(machine: MachineActionFields): boolean {
  return machine.dbStatus === 'archived'
    || machine.dbStatus === 'deleted'
    || machine.isActive === false
    || machine.isReadOnly === true
    || machine.mergeStatus === 'merged'
    || machine.redirectStatus === 'redirected'
    || Boolean(machine.canonicalMachineId);
}

export function hasConfirmedCanonicalResolution(machine: MachineActionFields): boolean {
  return isRetiredMachine(machine)
    && Boolean(machine.canonicalMachineId)
    && machine.canonicalMachineId !== machine._id;
}

export function createMachineActionContext(
  machine: MachineActionFields,
  generation: number,
): MachineActionContext {
  return {
    requestedMachineId: machine._id,
    canonicalMachineId: machine.canonicalMachineId || machine._id,
    generation,
    isReadOnly: isRetiredMachine(machine),
  };
}

export function isCurrentMachineActionRequest(
  context: MachineActionContext,
  currentGeneration: number,
): boolean {
  return context.generation === currentGeneration;
}
