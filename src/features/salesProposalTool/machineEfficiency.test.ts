import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyEfficiencyAuditToFields,
  applyEfficiencyManualInput,
  coerceEfficiencyPercent,
  efficiencyFieldsFromRow,
  efficiencySourceLabel,
  EMPTY_MACHINE_EFFICIENCY,
} from './machineEfficiency.ts';
import {
  draftsFromCurrentEquipment,
  emptyProposedDraft,
  toCurrentEquipmentPayload,
  toProposedEquipmentPayload,
} from './equipmentState.ts';

test('blank efficiency is assumed 100% and 94/96 convert from percent entry', () => {
  assert.equal(coerceEfficiencyPercent(null), null);
  assert.equal(coerceEfficiencyPercent(''), null);
  assert.equal(coerceEfficiencyPercent(94), 94);
  assert.equal(coerceEfficiencyPercent(0.96), 96);
  assert.equal(efficiencySourceLabel('assumed'), 'Assumed 100%');
});

test('audit prepopulates a blank field and a manual override is kept', () => {
  const fromAudit = applyEfficiencyAuditToFields(EMPTY_MACHINE_EFFICIENCY, 96.3, {
    sourceFileId: 'file-1',
    sourceFileName: 'cagi.pdf',
    sourceSha256: 'aaa',
  });
  assert.equal(fromAudit.efficiencyPercent, 96.3);
  assert.equal(fromAudit.efficiencyOrigin, 'audit');
  const overridden = applyEfficiencyManualInput(fromAudit, '94');
  assert.equal(overridden.efficiencyPercent, 94);
  assert.equal(overridden.efficiencyOrigin, 'manual');
  const laterAudit = applyEfficiencyAuditToFields(overridden, 91, {
    sourceFileId: 'file-2',
    sourceFileName: 'later.pdf',
    sourceSha256: 'bbb',
  });
  assert.equal(laterAudit.efficiencyPercent, 94);
  assert.equal(laterAudit.efficiencyOrigin, 'manual');
});

test('payload save and reopen keep mixed-fleet efficiency values', () => {
  const payload = toCurrentEquipmentPayload(
    draftsFromCurrentEquipment([
      {
        arsMachineId: null,
        make: 'Atlas Copco',
        model: 'GA37+',
        serialNumber: '',
        quantity: 1,
        specLibraryRecordId: 'ga37',
        sourceBacked: null,
        efficiencyPercent: 94,
        efficiencyOrigin: 'manual',
        efficiencyAudit: null,
      },
      {
        arsMachineId: null,
        make: 'Atlas Copco',
        model: 'GA30',
        serialNumber: '',
        quantity: 1,
        specLibraryRecordId: 'ga30',
        sourceBacked: null,
        efficiencyPercent: 96,
        efficiencyOrigin: 'audit',
        efficiencyAudit: {
          sourceFileId: 'file-3',
          sourceFileName: 'ga30-eff.pdf',
          sourceSha256: 'ccc',
          extractedPercent: 96,
        },
      },
    ]),
  );
  assert.equal(payload[0].efficiencyPercent, 94);
  assert.equal(payload[0].efficiencyOrigin, 'manual');
  assert.equal(payload[1].efficiencyPercent, 96);
  assert.equal(payload[1].efficiencyOrigin, 'audit');
  const reopened = draftsFromCurrentEquipment(payload);
  assert.equal(reopened[0].efficiencyPercent, 94);
  assert.equal(reopened[1].efficiencyAudit?.sourceFileName, 'ga30-eff.pdf');
});

test('proposed payload preserves a blank assumed efficiency', () => {
  const proposed = toProposedEquipmentPayload({
    ...emptyProposedDraft(),
    specLibraryRecordId: 'bouwa-55',
    manufacturer: 'BOUWA',
    model: 'SVC-RS55A-II',
  });
  assert.equal(proposed[0].efficiencyPercent, null);
  assert.equal(proposed[0].efficiencyOrigin, null);
  assert.equal(efficiencyFieldsFromRow(proposed[0]).efficiencyPercent, null);
});
