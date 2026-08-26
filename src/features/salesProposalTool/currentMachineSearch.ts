import {
  searchCustomerMachines,
  type SearchableCustomerMachine,
} from './customerMachineSearch.ts';
import type { PublicMachineSpec } from './types.ts';

export const NO_CUSTOMER_MESSAGE = 'Select a customer first.';
export const NO_CUSTOMER_MACHINES_NOTICE =
  'No machines are recorded for this customer. Search the Machine Specification Library below.';
export const NO_MATCH_MESSAGE = 'No matching machine found.';

export function librarySpecHaystack(spec: PublicMachineSpec): string {
  return [spec.manufacturer, spec.model, spec.modelVariant ?? '']
    .join(' ')
    .toLowerCase();
}

export function searchLibrarySpecs(
  specs: readonly PublicMachineSpec[],
  query: string,
): PublicMachineSpec[] {
  const term = query.trim().toLowerCase();
  if (term === '') return [...specs];
  const words = term.split(/\s+/).filter((word) => word.length > 0);
  return specs.filter((spec) => {
    const haystack = librarySpecHaystack(spec);
    return words.every((word) => haystack.includes(word));
  });
}

export function groupCurrentMachineSearch(options: {
  customerMachines: readonly SearchableCustomerMachine[];
  librarySpecs: readonly PublicMachineSpec[];
  query: string;
  excludeMachineIds?: readonly string[];
}): {
  customer: SearchableCustomerMachine[];
  library: PublicMachineSpec[];
} {
  const excluded = new Set(options.excludeMachineIds ?? []);
  const customer = searchCustomerMachines(options.customerMachines, options.query).filter(
    (machine) => !excluded.has(machine.id),
  );
  return {
    customer,
    library: searchLibrarySpecs(options.librarySpecs, options.query),
  };
}

export type CurrentMachineDropdownView =
  | { kind: 'no-customer'; message: string }
  | { kind: 'loading'; message: string }
  | {
      kind: 'results';
      customer: SearchableCustomerMachine[];
      library: PublicMachineSpec[];
      customerNotice: string | null;
    }
  | { kind: 'no-match'; message: string };

export function describeCurrentMachineDropdown(options: {
  customerId: string | null;
  loading: boolean;
  libraryLoading?: boolean;
  customerMachines: readonly SearchableCustomerMachine[];
  librarySpecs: readonly PublicMachineSpec[];
  query: string;
  excludeMachineIds?: readonly string[];
}): CurrentMachineDropdownView {
  if (!options.customerId) {
    return { kind: 'no-customer', message: NO_CUSTOMER_MESSAGE };
  }
  if (
    options.loading &&
    options.customerMachines.length === 0 &&
    options.librarySpecs.length === 0
  ) {
    return { kind: 'loading', message: "Loading this customer's machines…" };
  }

  const grouped = groupCurrentMachineSearch(options);
  const registerEmpty = options.customerMachines.length === 0;
  const customerNotice = registerEmpty ? NO_CUSTOMER_MACHINES_NOTICE : null;

  if (grouped.customer.length === 0 && grouped.library.length === 0) {
    if (options.libraryLoading && options.query.trim() !== '') {
      return {
        kind: 'loading',
        message: 'Searching the Machine Specification Library…',
      };
    }
    if (options.query.trim() === '' && registerEmpty) {
      return {
        kind: 'results',
        customer: [],
        library: [],
        customerNotice,
      };
    }
    return { kind: 'no-match', message: NO_MATCH_MESSAGE };
  }

  return {
    kind: 'results',
    customer: grouped.customer,
    library: grouped.library,
    customerNotice,
  };
}

export function currentMachineSearchOrder(
  view: CurrentMachineDropdownView,
): Array<'customer' | 'library'> {
  if (view.kind !== 'results') return [];
  const order: Array<'customer' | 'library'> = [];
  if (view.customer.length > 0 || view.customerNotice) order.push('customer');
  if (view.library.length > 0) order.push('library');
  return order;
}
