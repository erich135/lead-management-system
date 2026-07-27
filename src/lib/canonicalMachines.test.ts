import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalMachineOptions,
  isCanonicalMachineSelectable,
  reconcileMachineSelection,
  resolveCanonicalMachineResponses,
} from './canonicalMachines.ts';

const canonical = { _id: 'canonical', make: 'Atlas', customer: 'customer-a' };
const retiredDuplicate = { _id: 'retired-duplicate', dbStatus: 'archived', isActive: false, canonicalMachineId: 'canonical' };
const retiredTriplicate = { _id: 'retired-triplicate', redirectStatus: 'redirected', canonicalMachineId: 'canonical' };

test('keeps a canonical machine and preserves its existing customer fields', () => {
  assert.deepEqual(canonicalMachineOptions([canonical]), [canonical]);
});

test('excludes retired duplicate and triplicate machine records from normal results', () => {
  assert.deepEqual(
    canonicalMachineOptions([canonical, retiredDuplicate, retiredTriplicate]),
    [canonical],
  );
});

test('deduplicates canonical option values while preserving backend order', () => {
  assert.deepEqual(
    canonicalMachineOptions([canonical, { ...canonical }, retiredDuplicate]),
    [canonical],
  );
});

test('does not reject a valid legacy response merely because optional status fields are absent', () => {
  assert.equal(isCanonicalMachineSelectable({ _id: 'legacy-canonical' }), true);
});

test('reconciles new-job, existing-job, RSR, and reading selector values to canonical IDs only', () => {
  const result = reconcileMachineSelection(
    ['canonical', 'retired-duplicate', 'retired-triplicate'],
    [canonical, retiredDuplicate, retiredTriplicate],
  );

  assert.deepEqual(result.machineIds, ['canonical']);
  assert.deepEqual(result.clearedMachineIds, ['retired-duplicate', 'retired-triplicate']);
});

test('clears an unsafe stale selection instead of allowing it to be submitted', () => {
  assert.deepEqual(
    reconcileMachineSelection(['unresolved-retired'], [canonical]),
    { machineIds: [], clearedMachineIds: ['unresolved-retired'] },
  );
});

test('replaces a direct retired-machine request with the one canonical machine without a loop', () => {
  const result = resolveCanonicalMachineResponses([
    { requestedId: 'retired-duplicate', machine: canonical, redirectedFromMachineId: 'retired-duplicate' },
    { requestedId: 'canonical', machine: canonical },
  ]);

  assert.deepEqual(result.machineIds, ['canonical']);
  assert.deepEqual(result.redirectedFromMachineIds, { 'retired-duplicate': 'canonical' });
  assert.deepEqual(result.unresolvedMachineIds, []);
});
