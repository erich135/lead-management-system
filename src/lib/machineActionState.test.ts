import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMachineActionContext,
  hasConfirmedCanonicalResolution,
  isCurrentMachineActionRequest,
  isRetiredMachine,
} from './machineActionState.ts';

const activeMachine = { _id: 'active-machine', isActive: true };
const retiredMachine = {
  _id: 'retired-machine',
  dbStatus: 'archived',
  isActive: false,
  isReadOnly: true,
  redirectStatus: 'redirected' as const,
  canonicalMachineId: 'active-machine',
};

test('keeps an active canonical machine operational with its own immutable identity', () => {
  assert.deepEqual(createMachineActionContext(activeMachine, 4), {
    requestedMachineId: 'active-machine',
    canonicalMachineId: 'active-machine',
    generation: 4,
    isReadOnly: false,
  });
});

test('makes an archived redirected machine read-only and retains its confirmed canonical identity', () => {
  const context = createMachineActionContext(retiredMachine, 7);
  assert.equal(isRetiredMachine(retiredMachine), true);
  assert.equal(hasConfirmedCanonicalResolution(retiredMachine), true);
  assert.equal(context.requestedMachineId, 'retired-machine');
  assert.equal(context.canonicalMachineId, 'active-machine');
  assert.equal(context.isReadOnly, true);
});

test('rejects a late machine A response after machine B advances the request generation', () => {
  const machineA = createMachineActionContext(activeMachine, 1);
  const machineB = createMachineActionContext({ _id: 'machine-b', isActive: true }, 2);

  assert.equal(isCurrentMachineActionRequest(machineA, machineB.generation), false);
  assert.equal(isCurrentMachineActionRequest(machineB, machineB.generation), true);
});

test('rejects a stale machine A error after machine B has valid state', () => {
  const machineA = createMachineActionContext(activeMachine, 5);
  const machineB = createMachineActionContext({ _id: 'machine-b', isActive: true }, 6);

  // The same generation guard wraps both fulfilled and rejected RSR requests.
  assert.equal(isCurrentMachineActionRequest(machineA, machineB.generation), false);
  assert.equal(isCurrentMachineActionRequest(machineB, machineB.generation), true);
});

test('keeps RSR actions bound to their rendered machine instead of a later expanded row', () => {
  const machineA = createMachineActionContext(activeMachine, 8);
  const machineB = createMachineActionContext({ _id: 'machine-b', isActive: true }, 9);

  assert.equal(machineA.requestedMachineId, 'active-machine');
  assert.equal(machineB.requestedMachineId, 'machine-b');
  assert.notEqual(machineA.requestedMachineId, machineB.requestedMachineId);
});

test('does not show a canonical banner when the backend did not confirm a different canonical machine', () => {
  assert.equal(hasConfirmedCanonicalResolution(activeMachine), false);
  assert.equal(hasConfirmedCanonicalResolution({ _id: 'retired-without-resolution', dbStatus: 'archived' }), false);
});
