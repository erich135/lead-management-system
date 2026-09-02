import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  emptyProposedDraft,
  toProposedEquipmentPayload,
} from './equipmentState.ts';
import { PUBLISHED_PACKAGE_INPUT_LABEL } from './specDisplay.ts';
import { formFieldsFromExtracted } from './specSheetPrefill.ts';
import { specPickerSearchIsOpen } from './specPickerSearch.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const bouwaSpec = {
  recordId: 'lib-sc-rs37a',
  manufacturer: 'Bouwa',
  model: 'SC-RS37A',
  modelVariant: null,
  ratedPressureBarG: 7,
  ratedAirflowM3PerMin: 6.4,
  packageInputPowerKw: 37,
  motorShaftPowerKw: null,
  controlType: null,
  sourceTitle: 'Bouwa SC-RS37A datasheet',
  sourceFileName: null,
};

test('selected proposed library spec reaches the preview/save payload', () => {
  const selected = {
    ...emptyProposedDraft(),
    selectedSpec: bouwaSpec,
    manufacturer: bouwaSpec.manufacturer,
    model: bouwaSpec.model,
    changingSpec: false,
  };
  const payload = toProposedEquipmentPayload(selected);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].specLibraryRecordId, 'lib-sc-rs37a');
  assert.equal(payload[0].model, 'SC-RS37A');
  assert.equal(payload[0].manufacturer, 'Bouwa');
});

test('proposed payload keeps published ratings identity without a fake measured kW field', () => {
  const payload = toProposedEquipmentPayload({
    ...emptyProposedDraft(),
    specLibraryRecordId: bouwaSpec.recordId,
    selectedSpec: bouwaSpec,
    manufacturer: bouwaSpec.manufacturer,
    model: bouwaSpec.model,
    changingSpec: false,
  });
  assert.equal(payload[0].sourceBacked, null);
  assert.equal('measuredPackageInputKw' in payload[0], false);
  assert.equal('averageElectricalKw' in payload[0], false);
});

test('editor still sends the same proposed draft to comparison/electricity preview', () => {
  const editor = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
    'utf8',
  );
  const comparison = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/AirMachineComparisonCard.tsx'),
    'utf8',
  );
  const electricity = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/ElectricityResultCard.tsx'),
    'utf8',
  );
  assert.match(editor, /previewElectricityComparison/);
  assert.match(editor, /proposedEquipment: toProposedEquipmentPayload\(proposed\)/);
  assert.match(editor, /setProposed\(proposedDraftFromProposal/);
  assert.match(comparison, /comparison\.proposed\.totalRatedFadM3PerMin/);
  assert.match(comparison, /comparison\.proposed\.ratedPressureBarG/);
  assert.match(electricity, /comparison\.proposed\.unavailableReason/);
  assert.doesNotMatch(editor, /createContext|zustand|redux|useSyncExternalStore/);
  assert.doesNotMatch(comparison, /measuredPackageInput/);
});

test('TODO 1/2/4 wording and spec-sheet prefill stay unchanged', () => {
  const performance = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentMachinePerformanceCard.tsx'),
    'utf8',
  );
  const performanceView = fs.readFileSync(
    path.join(FEATURE_ROOT, 'currentMachinePerformanceView.ts'),
    'utf8',
  );
  const scope = fs.readFileSync(
    path.join(FEATURE_ROOT, 'airAuditScope.ts'),
    'utf8',
  );
  assert.equal(PUBLISHED_PACKAGE_INPUT_LABEL, 'Published package input');
  assert.match(performance, /editorPerformanceView/);
  assert.match(performanceView, /result\.copy\.publishedLabel/);
  assert.match(performanceView, /result\.copy\.measuredLabel/);
  assert.match(scope, /single_machine/);
  assert.match(scope, /site_header/);
  const fields = formFieldsFromExtracted({
    manufacturer: 'Atlas Copco',
    model: 'ZT 160 VSD+-10.4',
    modelVariant: null,
    ratedPressureBarG: 10.34,
    ratedAirflowM3PerMin: 23.52,
    packageInputPowerKw: 176.3,
    motorShaftPowerKw: 160.03,
    controlType: 'VSD',
  });
  assert.equal(fields.packageInput, '176.3');
  assert.equal(fields.motorRating, '160.03');
  assert.equal(
    specPickerSearchIsOpen({
      changingSpec: true,
      capturingSheet: false,
      selectedSpec: null,
      sourceBacked: null,
    }),
    true,
  );
});
