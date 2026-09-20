import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRejectionReason } from './salesRequestRejection.ts';

test('rejection reason must be a non-empty trimmed string', () => {
  assert.equal(normalizeRejectionReason(''), null);
  assert.equal(normalizeRejectionReason('   '), null);
  assert.equal(normalizeRejectionReason('Missing plant number'), 'Missing plant number');
  assert.equal(normalizeRejectionReason('  Need a photo  '), 'Need a photo');
});
