import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLibrarySpec,
  applyPhysicalMachine,
  canAddPhysicalMachine,
  currentMachineCardTitle,
  currentMachineIsComplete,
  currentMachineNeedsSpec,
  draftsFromCurrentEquipment,
  emptyProposedDraft,
  retainMachinesForCustomer,
  specIdToPreselect,
  toCurrentEquipmentPayload,
  toProposedEquipmentPayload,
} from './equipmentState.ts';
import { DEFAULT_PROPOSED_QUANTITY } from './types.ts';

const machine = {
  _id: 'phys-1',
  make: 'Bouwa',
  model: 'SC-RS22',
  serialNumber: '2112-30884010',
};

test('multiple current machines can be selected and the same physical machine cannot be added twice', () => {
  assert.equal(canAddPhysicalMachine(['phys-1'], 'phys-2'), true);
  assert.equal(canAddPhysicalMachine(['phys-1'], 'phys-1'), false);
});

test('customer change drops machines that do not belong to the new customer', () => {
  const kept = retainMachinesForCustomer(
    [
      {
        key: 'a',
        arsMachineId: 'phys-1',
        make: 'Bouwa',
        model: 'SC-RS22',
        serialNumber: '2112-30884010',
        specLibraryRecordId: null,
        selectedSpec: null,
        changingSpec: true,
        sourceBacked: null,
        capturingSheet: false,
      },
      {
        key: 'b',
        arsMachineId: 'other',
        make: 'Atlas Copco',
        model: 'GA250',
        serialNumber: 'APF231699',
        specLibraryRecordId: null,
        selectedSpec: null,
        changingSpec: true,
        sourceBacked: null,
        capturingSheet: false,
      },
      {
        key: 'adding',
        arsMachineId: null,
        make: '',
        model: '',
        serialNumber: '',
        specLibraryRecordId: null,
        selectedSpec: null,
        changingSpec: true,
        sourceBacked: null,
        capturingSheet: false,
      },
    ],
    ['phys-1'],
  );
  assert.deepEqual(kept.map((row) => row.key), ['a', 'adding']);
});

test('library-only current machines are kept when the customer register changes', () => {
  const kept = retainMachinesForCustomer(
    [
      {
        key: 'lib',
        arsMachineId: null,
        make: 'Atlas Copco',
        model: 'GA18+ -125',
        serialNumber: '1140347',
        specLibraryRecordId: 'lib-ga18',
        selectedSpec: null,
        changingSpec: false,
        sourceBacked: null,
        capturingSheet: false,
      },
    ],
    [],
  );
  assert.equal(kept[0].specLibraryRecordId, 'lib-ga18');
  assert.equal(kept[0].arsMachineId, null);
});

test('direct Machine Spec Library selection stores a null arsMachineId and optional serial', () => {
  const empty = {
    key: 'x',
    arsMachineId: null,
    make: '',
    model: '',
    serialNumber: '',
    specLibraryRecordId: null,
    selectedSpec: null,
    changingSpec: true,
    sourceBacked: null,
    capturingSheet: false,
  };
  const spec = {
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
  };
  const selected = applyLibrarySpec(empty, spec);
  assert.equal(selected.arsMachineId, null);
  assert.equal(selected.specLibraryRecordId, 'lib-ga18');
  assert.equal(currentMachineCardTitle(selected), 'Atlas Copco GA18+ -125');
  const payload = toCurrentEquipmentPayload([{ ...selected, serialNumber: '1140347' }]);
  assert.equal(payload[0].arsMachineId, null);
  assert.equal(payload[0].serialNumber, '1140347');
  assert.equal(payload[0].specLibraryRecordId, 'lib-ga18');
});

test('existing ARS Machine with saved spec loads that specification without another picker', () => {
  const remembered = applyPhysicalMachine(
    {
      key: 'x',
      arsMachineId: null,
      make: '',
      model: '',
      serialNumber: '',
      specLibraryRecordId: null,
      selectedSpec: null,
      changingSpec: true,
      sourceBacked: null,
      capturingSheet: false,
    },
    { ...machine, specLibraryRecordId: 'lib-sc-rs22a' },
  );
  assert.equal(remembered.arsMachineId, 'phys-1');
  assert.equal(remembered.specLibraryRecordId, 'lib-sc-rs22a');
  assert.equal(remembered.changingSpec, false);
  assert.equal(currentMachineIsComplete(remembered), true);
  assert.equal(currentMachineNeedsSpec(remembered), false);
});

test('existing ARS Machine without saved spec accepts a later library specification', () => {
  const physical = applyPhysicalMachine(
    {
      key: 'x',
      arsMachineId: null,
      make: '',
      model: '',
      serialNumber: '',
      specLibraryRecordId: null,
      selectedSpec: null,
      changingSpec: true,
      sourceBacked: null,
      capturingSheet: false,
    },
    { _id: 'phys-scania', make: 'Scania', model: 'DC16.043A', serialNumber: '1140347' },
  );
  assert.equal(currentMachineNeedsSpec(physical), true);
  const withSpec = applyLibrarySpec(physical, {
    recordId: 'lib-ga18',
    manufacturer: 'Atlas Copco',
    model: 'GA18+ -125',
    modelVariant: null,
    ratedPressureBarG: 8.62,
    ratedAirflowM3PerMin: 3.2,
    packageInputPowerKw: null,
    motorShaftPowerKw: 18,
    controlType: null,
    sourceTitle: 'CAGI directory',
    sourceFileName: null,
  });
  assert.equal(withSpec.arsMachineId, 'phys-scania');
  assert.equal(withSpec.specLibraryRecordId, 'lib-ga18');
  assert.equal(withSpec.serialNumber, '1140347');
  assert.equal(currentMachineCardTitle(withSpec), 'Atlas Copco GA18+ -125');
  assert.equal(currentMachineIsComplete(withSpec), true);
});

test('does not auto-bind a spec from similar model text', () => {
  assert.equal(specIdToPreselect({ specLibraryRecordId: null }), null);
  assert.equal(specIdToPreselect({}), null);
  const selected = applyPhysicalMachine(draftsFromCurrentEquipment([])[0] ?? {
    key: 'x',
    arsMachineId: null,
    make: '',
    model: '',
    serialNumber: '',
    specLibraryRecordId: null,
    selectedSpec: null,
    changingSpec: true,
    sourceBacked: null,
    capturingSheet: false,
  }, machine);
  assert.equal(selected.specLibraryRecordId, null);
  assert.equal(selected.changingSpec, true);
});

test('remembered spec id is reused when the physical machine is selected again', () => {
  const remembered = applyPhysicalMachine(
    {
      key: 'x',
      arsMachineId: null,
      make: '',
      model: '',
      serialNumber: '',
      specLibraryRecordId: null,
      selectedSpec: null,
      changingSpec: true,
      sourceBacked: null,
      capturingSheet: false,
    },
    { ...machine, specLibraryRecordId: 'lib-sc-rs22a' },
  );
  assert.equal(remembered.specLibraryRecordId, 'lib-sc-rs22a');
  assert.equal(remembered.changingSpec, false);
  assert.equal(specIdToPreselect({ specLibraryRecordId: 'lib-sc-rs22a' }), 'lib-sc-rs22a');
});

test('proposed payload uses the selected library spec id when the draft id was not copied yet', () => {
  const payload = toProposedEquipmentPayload({
    ...emptyProposedDraft(),
    selectedSpec: {
      recordId: 'lib-sc-rs37a',
      manufacturer: 'Bouwa',
      model: 'SC-RS37A',
      modelVariant: null,
      ratedPressureBarG: 7,
      ratedAirflowM3PerMin: 6.4,
      packageInputPowerKw: 37,
      motorShaftPowerKw: null,
      controlType: null,
      sourceTitle: null,
      sourceFileName: null,
    },
    manufacturer: 'Bouwa',
    model: 'SC-RS37A',
    changingSpec: false,
  });
  assert.equal(payload[0].specLibraryRecordId, 'lib-sc-rs37a');
  assert.equal(payload[0].model, 'SC-RS37A');
});

test('proposed quantity defaults to 1 and persists on the payload', () => {
  const draft = emptyProposedDraft();
  assert.equal(draft.quantity, DEFAULT_PROPOSED_QUANTITY);
  assert.equal(draft.quantity, 1);
  const payload = toProposedEquipmentPayload({
    ...draft,
    specLibraryRecordId: 'lib-rs250',
    manufacturer: 'BOUWA',
    model: 'RS250-2S',
  });
  assert.equal(payload[0].quantity, 1);
  assert.equal(payload[0].specLibraryRecordId, 'lib-rs250');
});
