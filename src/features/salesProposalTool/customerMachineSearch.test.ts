import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeCustomerMachineDropdown,
  hasDuplicateMachineIds,
  searchCustomerMachines,
  toSearchableMachine,
  type SearchableCustomerMachine,
} from './customerMachineSearch.ts';

const customerA: SearchableCustomerMachine[] = [
  { id: 'm1', make: 'Bouwa', model: 'SC-RS22', serialNumber: '2112-30884010' },
  { id: 'm2', make: 'Atlas Copco', model: 'GA250', serialNumber: 'APF231699', currentLocation: 'Rosslyn Plant' },
  { id: 'm3', make: 'Atlas Copco', model: 'GA315', serialNumber: 'APF234411' },
];

test('customer-machine search only uses that customer\'s supplied machines', () => {
  assert.deepEqual(
    searchCustomerMachines(customerA, 'Bouwa').map((machine) => machine.id),
    ['m1'],
  );
  assert.deepEqual(searchCustomerMachines(customerA, 'OTHER-1'), []);
});

test('customer-machine search finds make, model and serial', () => {
  assert.deepEqual(
    searchCustomerMachines(customerA, 'atlas').map((machine) => machine.id),
    ['m2', 'm3'],
  );
  assert.deepEqual(
    searchCustomerMachines(customerA, 'GA250').map((machine) => machine.id),
    ['m2'],
  );
  assert.deepEqual(
    searchCustomerMachines(customerA, 'APF231').map((machine) => machine.id),
    ['m2'],
  );
  assert.deepEqual(
    searchCustomerMachines(customerA, '2112-30884010').map((machine) => machine.id),
    ['m1'],
  );
});

test('search trims whitespace and ignores missing make/model/serial fields', () => {
  const messy = [
    toSearchableMachine({
      _id: { toString: () => 'id-1' },
      make: '  Atlas Copco ',
      model: null,
      serialNumber: undefined,
    }),
  ];
  assert.equal(messy[0].id, 'id-1');
  assert.deepEqual(
    searchCustomerMachines(messy, '  atlas  ').map((machine) => machine.id),
    ['id-1'],
  );
});

test('dropdown shows clear empty states instead of a blank control', () => {
  assert.deepEqual(
    describeCustomerMachineDropdown({
      customerId: null,
      loading: false,
      machines: [],
      query: 'Atlas',
    }),
    { kind: 'no-customer', message: 'Select a customer first.' },
  );
  assert.deepEqual(
    describeCustomerMachineDropdown({
      customerId: 'cust-1',
      loading: false,
      machines: [],
      query: 'Atlas',
    }),
    { kind: 'no-machines', message: 'No machines are recorded for this customer.' },
  );
  const noMatch = describeCustomerMachineDropdown({
    customerId: 'cust-1',
    loading: false,
    machines: customerA,
    query: 'Atlas',
  });
  assert.equal(noMatch.kind, 'results');
  if (noMatch.kind === 'results') {
    assert.deepEqual(noMatch.machines.map((machine) => machine.id), ['m2', 'm3']);
  }
  assert.deepEqual(
    describeCustomerMachineDropdown({
      customerId: 'cust-1',
      loading: false,
      machines: customerA,
      query: 'NoSuchMachine',
    }),
    { kind: 'no-match', message: "No customer machines match 'NoSuchMachine'." },
  );
});

test('duplicate physical machines are rejected', () => {
  assert.equal(hasDuplicateMachineIds(['m1', 'm2']), false);
  assert.equal(hasDuplicateMachineIds(['m1', 'm1']), true);
});

test('real RFG Foods machine records filter by make, model and serial', () => {
  const rfg: SearchableCustomerMachine[] = [
    { id: '691b4d921e605bd7a7787efd', make: 'Atlas Copco', model: 'GA110 VSD', serialNumber: 'APF204348', currentLocation: 'Krugersdorp' },
    { id: '699d5c3302c3722f49324ce7', make: 'ATLAS COPCO', model: 'ID40', serialNumber: 'CAQ871188', currentLocation: 'Groot Drakenstein' },
    { id: '6a008169573b29002efe5b8a', make: 'Volvo', model: 'TWD1643GE', serialNumber: '2016029860', currentLocation: 'Groot Drakenstein' },
  ];
  assert.deepEqual(
    searchCustomerMachines(rfg, 'atlas').map((machine) => machine.serialNumber),
    ['APF204348', 'CAQ871188'],
  );
  assert.deepEqual(
    searchCustomerMachines(rfg, 'GA110').map((machine) => machine.serialNumber),
    ['APF204348'],
  );
  assert.deepEqual(
    searchCustomerMachines(rfg, 'APF204').map((machine) => machine.serialNumber),
    ['APF204348'],
  );
});
