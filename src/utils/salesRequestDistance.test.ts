import assert from 'node:assert/strict';
import test from 'node:test';
import { formatOutOfLocationDistance } from './salesRequestDistance.ts';

test('out-of-location distance is shown in kilometres', () => {
  assert.equal(formatOutOfLocationDistance(1500), '1.50 km from scheduled pin');
  assert.equal(formatOutOfLocationDistance(250), '0.25 km from scheduled pin');
});
