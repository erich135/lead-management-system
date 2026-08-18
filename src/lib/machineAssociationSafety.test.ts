import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyApiFailure,
  clearCommittedRSRUploadAttempt,
  createMachineResolutionSnapshot,
  createOrReuseRSRUploadAttempt,
  machineResolutionMessage,
  preserveIntendedMachineIds,
  retainRSRUploadOperation,
  preserveMachineReferences,
  resolutionBlocksMachineIds,
  rsrUploadAttemptHeaders,
} from './machineAssociationSafety.ts';

const canonical = { _id: 'machine-canonical' };

test('an unresolved original association is retained and blocks save/upload', () => {
  const resolution = createMachineResolutionSnapshot([
    { originalMachineId: 'machine-old', status: 'RESOLVED_CANONICAL', machine: canonical, canonicalMachineId: canonical._id, redirectedFromMachineId: 'machine-old' },
    { originalMachineId: 'machine-missing', status: 'UNRESOLVED_INVALID', failureKind: 'not_found' },
  ]);

  assert.deepEqual(preserveMachineReferences(['machine-old', 'machine-missing'], resolution), [canonical, 'machine-missing']);
  assert.deepEqual(preserveIntendedMachineIds(['machine-old', 'machine-missing'], resolution), ['machine-canonical', 'machine-missing']);
  assert.equal(resolutionBlocksMachineIds(['machine-canonical', 'machine-missing'], resolution), true);
  assert.match(machineResolutionMessage(resolution, ['machine-missing']) || '', /invalid machine association/i);
});

test('canonical resolution deduplicates only confirmed resolutions and preserves every failed original', () => {
  const resolution = createMachineResolutionSnapshot([
    { originalMachineId: 'retired-a', status: 'RESOLVED_CANONICAL', machine: canonical, canonicalMachineId: canonical._id, redirectedFromMachineId: 'retired-a' },
    { originalMachineId: 'canonical-a', status: 'RESOLVED', machine: canonical, canonicalMachineId: canonical._id },
    { originalMachineId: 'network-a', status: 'UNRESOLVED_TRANSIENT', failureKind: 'transient' },
    { originalMachineId: 'network-b', status: 'UNRESOLVED_TRANSIENT', failureKind: 'transient' },
  ]);

  assert.deepEqual(resolution.machineIds, ['machine-canonical']);
  assert.deepEqual(resolution.unresolvedMachineIds, ['network-a', 'network-b']);
  assert.deepEqual(preserveIntendedMachineIds(['retired-a', 'canonical-a', 'network-a', 'network-b'], resolution), [
    'machine-canonical', 'network-a', 'network-b',
  ]);
});

test('HTTP and network failures are classified without converting them to missing machine IDs', () => {
  assert.equal(classifyApiFailure({ status: 401 }), 'authentication');
  assert.equal(classifyApiFailure({ status: 403 }), 'authentication');
  assert.equal(classifyApiFailure({ status: 409 }), 'conflict');
  assert.equal(classifyApiFailure({ status: 429 }), 'transient');
  assert.equal(classifyApiFailure({ status: 404 }), 'not_found');
  assert.equal(classifyApiFailure({ status: 500 }), 'transient');
  assert.equal(classifyApiFailure(new Error('network unavailable')), 'transient');
});

test('a user can explicitly omit an unresolved association from a later RSR target set', () => {
  const resolution = createMachineResolutionSnapshot([
    { originalMachineId: 'machine-ok', status: 'RESOLVED', machine: canonical, canonicalMachineId: canonical._id },
    { originalMachineId: 'machine-retry', status: 'UNRESOLVED_TRANSIENT', failureKind: 'transient' },
  ]);

  assert.equal(resolutionBlocksMachineIds(['machine-ok'], resolution), false);
  assert.equal(machineResolutionMessage(resolution, ['machine-ok']), null);
});

test('the same RSR target set reuses one idempotency key and switches to the operation ID on retry', () => {
  const input = {
    routeType: 'unified_machine' as const,
    file: { name: 'report.pdf', size: 12, type: 'application/pdf', lastModified: 1 },
    jobId: 'job-1',
    targetMachineIds: ['machine-b', 'machine-a'],
    metadata: { workDate: '2026-07-27', title: 'RSR 1' },
  };
  const attempt = createOrReuseRSRUploadAttempt(null, input, () => 'idempotency-key');
  const retry = createOrReuseRSRUploadAttempt(attempt, input, () => 'unexpected-key');

  assert.equal(retry, attempt);
  assert.deepEqual(rsrUploadAttemptHeaders(retry), { 'Idempotency-Key': 'idempotency-key' });
  const resumed = retainRSRUploadOperation(retry, 'operation-1');
  assert.equal(resumed.operationId, 'operation-1');
  assert.deepEqual(rsrUploadAttemptHeaders(resumed), {
    'X-RSR-Upload-Operation-Id': 'operation-1',
  });
  assert.equal(clearCommittedRSRUploadAttempt(retry, 'RECOVERY_REQUIRED'), retry);
  assert.equal(clearCommittedRSRUploadAttempt(retry, 'COMMITTED'), null);
});

test('a genuine upload input change creates a fresh attempt identity', () => {
  const base = {
    routeType: 'job_document' as const,
    file: { name: 'report.pdf', size: 12, type: 'application/pdf', lastModified: 1 },
    jobId: 'job-1',
    targetMachineIds: ['machine-a'],
    metadata: { title: 'RSR 1' },
  };
  const first = createOrReuseRSRUploadAttempt(null, base, () => 'first');
  const changedFile = createOrReuseRSRUploadAttempt(first, { ...base, file: { ...base.file, size: 13 } }, () => 'file');
  const changedMetadata = createOrReuseRSRUploadAttempt(first, { ...base, metadata: { title: 'RSR 2' } }, () => 'metadata');
  const changedTargets = createOrReuseRSRUploadAttempt(first, { ...base, targetMachineIds: ['machine-b'] }, () => 'targets');

  assert.equal(changedFile.idempotencyKey, 'file');
  assert.equal(changedMetadata.idempotencyKey, 'metadata');
  assert.equal(changedTargets.idempotencyKey, 'targets');
});
