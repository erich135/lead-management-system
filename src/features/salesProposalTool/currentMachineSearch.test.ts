import assert from 'node:assert/strict';
import test from 'node:test';
import type { SearchableCustomerMachine } from './customerMachineSearch.ts';
import {
  currentMachineSearchOrder,
  describeCurrentMachineDropdown,
  groupCurrentMachineSearch,
  searchLibrarySpecs,
} from './currentMachineSearch.ts';
import type { PublicMachineSpec } from './types.ts';

const customerMachines: SearchableCustomerMachine[] = [
  { id: 'm-scania', make: 'Scania', model: 'DC16.043A', serialNumber: '1140347' },
  { id: 'm-bouwa', make: 'Bouwa', model: 'SZD-40HTF', serialNumber: 'SZ260116401P' },
];

const library: PublicMachineSpec[] = [
  {
    recordId: 'lib-ga18',
    manufacturer: 'Atlas Copco',
    model: 'GA18+ -125',
    modelVariant: null,
    ratedPressureBarG: 8.62,
    ratedAirflowM3PerMin: 3.2,
    packageInputPowerKw: null,
    motorShaftPowerKw: 18,
    controlType: null,
    sourceTitle: 'CAGI rotary compressor performance verification directory',
    sourceFileName: null,
  },
  {
    recordId: 'lib-g110',
    manufacturer: 'Atlas Copco',
    model: 'G110-125',
    modelVariant: null,
    ratedPressureBarG: 8.62,
    ratedAirflowM3PerMin: 19.2,
    packageInputPowerKw: null,
    motorShaftPowerKw: 110,
    controlType: null,
    sourceTitle: 'CAGI rotary compressor performance verification directory',
    sourceFileName: null,
  },
  {
    recordId: 'lib-bouwa',
    manufacturer: 'Bouwa',
    model: 'SC-RS22A',
    modelVariant: null,
    ratedPressureBarG: 8,
    ratedAirflowM3PerMin: 3.6,
    packageInputPowerKw: 22,
    motorShaftPowerKw: null,
    controlType: null,
    sourceTitle: 'Bouwa datasheet',
    sourceFileName: null,
  },
];

test('customer machines appear in Current Machine search and before library results', () => {
  const grouped = groupCurrentMachineSearch({
    customerMachines,
    librarySpecs: library,
    query: '',
  });
  assert.deepEqual(
    grouped.customer.map((machine) => machine.id),
    ['m-scania', 'm-bouwa'],
  );
  const view = describeCurrentMachineDropdown({
    customerId: 'cust-1',
    loading: false,
    customerMachines,
    librarySpecs: library,
    query: 'bouwa',
  });
  assert.equal(view.kind, 'results');
  if (view.kind === 'results') {
    assert.deepEqual(view.customer.map((machine) => machine.serialNumber), ['SZ260116401P']);
    assert.deepEqual(view.library.map((spec) => spec.recordId), ['lib-bouwa']);
    assert.deepEqual(currentMachineSearchOrder(view), ['customer', 'library']);
  }
});

test('Current Machine search is not restricted to customer Machine records', () => {
  const grouped = groupCurrentMachineSearch({
    customerMachines,
    librarySpecs: library,
    query: 'atlas',
  });
  assert.deepEqual(grouped.customer, []);
  assert.deepEqual(
    grouped.library.map((spec) => spec.model),
    ['GA18+ -125', 'G110-125'],
  );
});

test('manufacturer, model and serial substrings filter Current Machine search', () => {
  assert.deepEqual(
    groupCurrentMachineSearch({
      customerMachines,
      librarySpecs: library,
      query: 'scania',
    }).customer.map((machine) => machine.id),
    ['m-scania'],
  );
  assert.deepEqual(
    groupCurrentMachineSearch({
      customerMachines,
      librarySpecs: library,
      query: 'DC16',
    }).customer.map((machine) => machine.id),
    ['m-scania'],
  );
  assert.deepEqual(
    groupCurrentMachineSearch({
      customerMachines,
      librarySpecs: library,
      query: '1140347',
    }).customer.map((machine) => machine.id),
    ['m-scania'],
  );
  assert.deepEqual(
    searchLibrarySpecs(library, 'GA18').map((spec) => spec.recordId),
    ['lib-ga18'],
  );
});

test('Atlas library search works for a customer with no Atlas Machine record', () => {
  const view = describeCurrentMachineDropdown({
    customerId: 'cust-limited',
    loading: false,
    customerMachines,
    librarySpecs: library,
    query: 'Atlas',
  });
  assert.equal(view.kind, 'results');
  if (view.kind === 'results') {
    assert.equal(view.customer.length, 0);
    assert.ok(view.library.every((spec) => /atlas copco/i.test(spec.manufacturer)));
    assert.ok(view.library.length >= 2);
    assert.equal(view.customerNotice, null);
  }
});

test('empty register still offers the Machine Spec Library instead of a blank control', () => {
  const empty = describeCurrentMachineDropdown({
    customerId: 'cbi',
    loading: false,
    customerMachines: [],
    librarySpecs: [],
    query: '',
  });
  assert.equal(empty.kind, 'results');
  if (empty.kind === 'results') {
    assert.match(empty.customerNotice ?? '', /No machines are recorded for this customer/);
  }

  const atlas = describeCurrentMachineDropdown({
    customerId: 'cbi',
    loading: false,
    customerMachines: [],
    librarySpecs: library,
    query: 'Atlas',
  });
  assert.equal(atlas.kind, 'results');
  if (atlas.kind === 'results') {
    assert.ok(atlas.library.length >= 2);
    assert.match(atlas.customerNotice ?? '', /Search the Machine Specification Library below/);
  }

  const none = describeCurrentMachineDropdown({
    customerId: 'cbi',
    loading: false,
    customerMachines: [],
    librarySpecs: library,
    query: 'NoSuchMachineXYZ',
  });
  assert.deepEqual(none, { kind: 'no-match', message: 'No matching machine found.' });
});

test('no customer selected shows a clear state', () => {
  assert.deepEqual(
    describeCurrentMachineDropdown({
      customerId: null,
      loading: false,
      customerMachines: [],
      librarySpecs: [],
      query: 'Atlas',
    }),
    { kind: 'no-customer', message: 'Select a customer first.' },
  );
});
