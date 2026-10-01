import assert from 'node:assert/strict';
import test from 'node:test';
import { branchIdForSelectedRep, firstLinkedBranchId } from './repBranchSelection.ts';

const capeTown = '64b0000000000000000000c1';
const rental = '64b0000000000000000000e1';

test('Thomas Grobler / TG001 resolves to CapeTown', () => {
  const branchId = branchIdForSelectedRep(
    [
      {
        _id: 'rep-tg001',
        branches: [{ _id: capeTown, name: 'CapeTown' }],
      },
    ],
    'rep-tg001',
  );

  assert.equal(branchId, capeTown);
});

test('several linked branches use the first, and a missing link does not pick a default', () => {
  assert.equal(
    firstLinkedBranchId([
      { _id: capeTown, name: 'CapeTown' },
      { _id: rental, name: 'Rental' },
    ]),
    capeTown,
  );
  assert.equal(firstLinkedBranchId([]), null);
  assert.equal(branchIdForSelectedRep([{ _id: 'rep-none', branches: [] }], 'rep-none'), null);
  assert.equal(branchIdForSelectedRep([], undefined), null);
});

test('a rental rep keeps the Rental branch', () => {
  assert.equal(
    branchIdForSelectedRep(
      [{ _id: 'rep-rental', branches: [{ _id: rental, name: 'Rental' }] }],
      'rep-rental',
    ),
    rental,
  );
});
