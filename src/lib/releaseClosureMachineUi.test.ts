import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Machine } from './api.ts';

const machinesSource = readFileSync(
  fileURLToPath(new URL('../components/Machines.tsx', import.meta.url)),
  'utf8',
);
const leadDetailsSource = readFileSync(
  fileURLToPath(new URL('../components/LeadDetails.tsx', import.meta.url)),
  'utf8',
);
const apiSource = readFileSync(
  fileURLToPath(new URL('./api.ts', import.meta.url)),
  'utf8',
);

test('production RSR displays have no delete control or delete call', () => {
  for (const source of [machinesSource, leadDetailsSource]) {
    assert.doesNotMatch(source, /handleDeleteRSR/);
    assert.doesNotMatch(source, /deleteMachineRSR/);
    assert.doesNotMatch(source, /deleteRSRDocument/);
  }
});

test('legacy deletion exports fail closed without a network DELETE request', () => {
  assert.match(apiSource, /deleteRSRDocument[\s\S]*?RSR deletion is unavailable/);
  assert.match(apiSource, /deleteMachineRSR[\s\S]*?RSR deletion is unavailable/);
  assert.doesNotMatch(apiSource, /\/api\/rsr-documents\/\$\{documentId\}[\s\S]{0,160}method: 'DELETE'/);
  assert.doesNotMatch(apiSource, /\/api\/machines\/\$\{machineId\}\/rsr\/\$\{rsrId\}[\s\S]{0,160}method: 'DELETE'/);
});

test('active canonical machine retains immutable RSR upload, view, and download paths', () => {
  assert.match(machinesSource, /openJobRSRModal\(machine, rsrContext\)/);
  assert.match(machinesSource, /handleViewRSR\(rsr, rsrContext\)/);
  assert.match(machinesSource, /handleDownloadRSR\(rsr, rsrContext\)/);
  assert.match(machinesSource, /getMachineRSRUrl\(context\.requestedMachineId, rsr\._id\)/);
  assert.match(machinesSource, /machineIds: expectedMachineIds/);
  assert.match(machinesSource, /jobRsrPinnedMachine\.canonicalMachineId/);
});

test('archived rows withhold operational controls but retain retained-document access', () => {
  assert.match(machinesSource, /!isReadOnlyMachine && rsrContext/);
  assert.match(machinesSource, /!isReadOnlyMachine && machine\.cashCustomer/);
  assert.match(machinesSource, /!isReadOnlyMachine && machine\._id/);
  assert.match(machinesSource, /handleViewRSR\(rsr, rsrContext\)/);
  assert.match(machinesSource, /handleDownloadRSR\(rsr, rsrContext\)/);
});

test('confirmed redirect metadata is retained by the frontend machine type', () => {
  const resolvedMachine: Machine = {
    _id: 'canonical-machine',
    make: 'Atlas',
    model: 'Generator',
    serialNumber: 'A-1',
    machineHours: 0,
    nextServiceHours: 0,
    isActive: true,
  };
  const resolvedResponse: { machine: Machine; redirectedFromMachineId?: string } = {
    machine: resolvedMachine,
    redirectedFromMachineId: 'retired-machine',
  };

  assert.equal(resolvedResponse.redirectedFromMachineId, 'retired-machine');
});

test('the canonical consolidation banner appears only behind confirmed metadata', () => {
  assert.match(machinesSource, /hasCanonicalResolution && \(/);
  assert.match(machinesSource, /This retired machine has been consolidated into the canonical machine\./);
  assert.match(machinesSource, /Find canonical machine/);
});

test('RSR editing is limited to authorised machine metadata corrections', () => {
  // ARS-RSR-EDIT-001 introduced a metadata-only correction control on the
  // machine RSR list. It stays out of scope everywhere else.
  assert.doesNotMatch(leadDetailsSource, /Edit RSR/);

  assert.match(machinesSource, /title="Edit RSR details"/);
  assert.match(machinesSource, /canEditRSRMetadata\(rsr, isReadOnlyMachine\)/);
  // Editing must never become deletion or file replacement.
  assert.doesNotMatch(machinesSource, /handleDeleteRSR/);
  assert.doesNotMatch(machinesSource, /deleteMachineRSR/);
  assert.doesNotMatch(machinesSource, /replaceFile|replaceRSR/i);
});
