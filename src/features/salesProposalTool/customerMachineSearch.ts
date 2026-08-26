export interface SearchableCustomerMachine {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  currentLocation?: string | null;
  specLibraryRecordId?: string | null;
}

export function fieldText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function machineRecordId(machine: { _id?: unknown; id?: unknown }): string {
  if (machine._id !== null && machine._id !== undefined) return String(machine._id);
  if (machine.id !== null && machine.id !== undefined) return String(machine.id);
  return '';
}

export function customerMachineHaystack(machine: SearchableCustomerMachine): string {
  return [fieldText(machine.make), fieldText(machine.model), fieldText(machine.serialNumber)]
    .join(' ')
    .toLowerCase();
}

/**
 * Simple substring search. Every word must appear in make, model or serial.
 * SC-RS22 finds SC-RS22A because it is a substring, not because a score decided
 * they were similar.
 */
export function searchCustomerMachines<T extends SearchableCustomerMachine>(
  machines: readonly T[],
  query: string,
): T[] {
  const term = query.trim().toLowerCase();
  if (term === '') return [...machines];
  const words = term.split(/\s+/).filter((word) => word.length > 0);
  return machines.filter((machine) => {
    const haystack = customerMachineHaystack(machine);
    return words.every((word) => haystack.includes(word));
  });
}

export function hasDuplicateMachineIds(ids: readonly string[]): boolean {
  return new Set(ids).size !== ids.length;
}

export function toSearchableMachine(machine: {
  _id?: unknown;
  id?: unknown;
  make?: unknown;
  model?: unknown;
  serialNumber?: unknown;
  currentLocation?: unknown;
  specLibraryRecordId?: string | null;
}): SearchableCustomerMachine {
  return {
    id: machineRecordId(machine),
    make: fieldText(machine.make),
    model: fieldText(machine.model),
    serialNumber: fieldText(machine.serialNumber),
    currentLocation: fieldText(machine.currentLocation) || null,
    specLibraryRecordId: machine.specLibraryRecordId ?? null,
  };
}

export type CustomerMachineDropdownView =
  | { kind: 'no-customer'; message: string }
  | { kind: 'loading'; message: string }
  | { kind: 'no-machines'; message: string }
  | { kind: 'no-match'; message: string }
  | { kind: 'results'; machines: SearchableCustomerMachine[] };

export function describeCustomerMachineDropdown(options: {
  customerId: string | null;
  loading: boolean;
  machines: readonly SearchableCustomerMachine[];
  query: string;
}): CustomerMachineDropdownView {
  if (!options.customerId) {
    return { kind: 'no-customer', message: 'Select a customer first.' };
  }
  if (options.loading && options.machines.length === 0) {
    return { kind: 'loading', message: "Loading this customer's machines…" };
  }
  if (options.machines.length === 0) {
    return { kind: 'no-machines', message: 'No machines are recorded for this customer.' };
  }
  const matches = searchCustomerMachines(options.machines, options.query);
  if (matches.length === 0) {
    return {
      kind: 'no-match',
      message: `No customer machines match '${options.query.trim()}'.`,
    };
  }
  return { kind: 'results', machines: matches };
}
