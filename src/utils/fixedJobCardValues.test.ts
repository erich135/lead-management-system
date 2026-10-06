import assert from 'node:assert/strict';
import test from 'node:test';
import { customerDisplayName, getJobFieldValue } from './fixedJobCardValues.ts';

const customerId = '69129a864d19b88d7684db94';

test('a populated customer name is shown instead of the database id', () => {
  assert.equal(
    getJobFieldValue({ customer: { _id: customerId, name: 'Sunbake' }, jobNumber: 'J15806' }, 'customer'),
    'Sunbake',
  );
});

test('an existing saved customer name is kept when the link cannot be resolved', () => {
  assert.equal(
    customerDisplayName({ populatedName: customerId, savedName: 'Acme Plant' }),
    'Acme Plant',
  );
});

test('an unresolved customer id is never shown', () => {
  assert.equal(
    getJobFieldValue({ customer: customerId, jobNumber: 'J15806' }, 'customer'),
    'Customer unavailable',
  );
  assert.equal(
    customerDisplayName({ populatedName: customerId, savedName: customerId }),
    'Customer unavailable',
  );
});
