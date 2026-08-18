/**
 * Browser-side guard for the backend's active canonical-machine contract.
 * Normal machine endpoints already enforce this contract; these functions
 * protect the UI from stale/cached responses without treating omitted legacy
 * fields as a reason to hide an otherwise usable canonical machine.
 */
export interface MachineCanonicalFields {
  _id: string;
  dbStatus?: string;
  isActive?: boolean;
  isReadOnly?: boolean;
  mergeStatus?: string;
  redirectStatus?: string;
  canonicalMachineId?: string;
}

export function isCanonicalMachineSelectable(machine: MachineCanonicalFields): boolean {
  return Boolean(machine?._id)
    && machine.dbStatus !== 'archived'
    && machine.dbStatus !== 'deleted'
    && machine.isActive !== false
    && machine.isReadOnly !== true
    && machine.mergeStatus !== 'merged'
    && machine.redirectStatus !== 'redirected'
    && !machine.canonicalMachineId;
}

/** Keeps backend ordering while removing retired and duplicate option values. */
export function canonicalMachineOptions<T extends MachineCanonicalFields>(machines: T[]): T[] {
  const seen = new Set<string>();

  return machines.filter((machine) => {
    if (!isCanonicalMachineSelectable(machine) || seen.has(machine._id)) {
      return false;
    }
    seen.add(machine._id);
    return true;
  });
}

export interface MachineSelectionReconciliation {
  machineIds: string[];
  clearedMachineIds: string[];
}

export interface DirectMachineResolution<T extends MachineCanonicalFields> {
  requestedId: string;
  machine: T | null;
  redirectedFromMachineId?: string;
}

/** Collapses direct backend resolutions without re-requesting a canonical ID. */
export function resolveCanonicalMachineResponses<T extends MachineCanonicalFields>(
  responses: Array<DirectMachineResolution<T>>,
): {
  machineIds: string[];
  machines: T[];
  unresolvedMachineIds: string[];
  redirectedFromMachineIds: Record<string, string>;
} {
  const seenCanonicalIds = new Set<string>();
  const machines: T[] = [];
  const unresolvedMachineIds: string[] = [];
  const redirectedFromMachineIds: Record<string, string> = {};

  for (const response of responses) {
    if (!response.machine || !isCanonicalMachineSelectable(response.machine)) {
      unresolvedMachineIds.push(response.requestedId);
      continue;
    }
    if (!seenCanonicalIds.has(response.machine._id)) {
      seenCanonicalIds.add(response.machine._id);
      machines.push(response.machine);
    }
    if (response.redirectedFromMachineId) {
      redirectedFromMachineIds[response.redirectedFromMachineId] = response.machine._id;
    }
  }

  return {
    machineIds: machines.map((machine) => machine._id),
    machines,
    unresolvedMachineIds,
    redirectedFromMachineIds,
  };
}

/**
 * Removes stale selections that are not in the currently available canonical
 * option set. Components can then show a validation message or resolve the
 * original ID through the direct backend endpoint before submitting.
 */
export function reconcileMachineSelection(
  selectedMachineIds: Array<string | null | undefined>,
  availableMachines: MachineCanonicalFields[],
): MachineSelectionReconciliation {
  const selectableIds = new Set(canonicalMachineOptions(availableMachines).map((machine) => machine._id));
  const seen = new Set<string>();
  const machineIds: string[] = [];
  const clearedMachineIds: string[] = [];

  for (const machineId of selectedMachineIds) {
    if (!machineId || seen.has(machineId)) continue;
    seen.add(machineId);
    if (selectableIds.has(machineId)) {
      machineIds.push(machineId);
    } else {
      clearedMachineIds.push(machineId);
    }
  }

  return { machineIds, clearedMachineIds };
}
