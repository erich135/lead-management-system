import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  applyLibrarySpec,
  applyPhysicalMachine,
  emptyProposedDraft,
  newCurrentEquipmentDraft,
  proposedDraftFromProposal,
  toProposedEquipmentPayload,
} from './equipmentState.ts';
import { hasUsableSourceBacked } from './specDisplay.ts';
import { formFieldsFromExtracted } from './specSheetPrefill.ts';
import { specPickerSearchIsOpen, specPickerShouldSearch } from './specPickerSearch.ts';
import type { SourceBackedSpec } from './types.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const atlasSource: SourceBackedSpec = {
  manufacturer: 'Atlas Copco',
  model: 'ZT 160 VSD+-10.4',
  modelVariant: null,
  ratedPressureBarG: 10.34,
  ratedAirflowM3PerMin: 23.52,
  packageInputPowerKw: 176.3,
  motorShaftPowerKw: 160.03,
  controlType: 'VSD',
  sourceFileId: 'file-atlas',
  sourceFileName: 'ZT160_CAGI.pdf',
  sourceSha256: 'a'.repeat(64),
};

const bouwaSpec = {
  recordId: 'lib-rs250',
  manufacturer: 'BOUWA',
  model: 'RS250-2S',
  modelVariant: null,
  ratedPressureBarG: 7,
  ratedAirflowM3PerMin: 55.3,
  packageInputPowerKw: 250,
  motorShaftPowerKw: null,
  controlType: 'fixed_speed_load_unload',
  sourceTitle: 'BOUWA RS250 datasheet',
  sourceFileName: null,
};

function proposedSearchOpen(draft: ReturnType<typeof emptyProposedDraft>): boolean {
  return specPickerSearchIsOpen({
    changingSpec: draft.changingSpec,
    capturingSheet: draft.capturingSheet,
    selectedSpec: draft.selectedSpec,
    sourceBacked: draft.sourceBacked,
  });
}

test('proposed SpecPicker searches when the search field is shown, even if changingSpec is false', () => {
  assert.equal(
    specPickerShouldSearch({
      changingSpec: false,
      capturingSheet: false,
      hasSelectedSpec: false,
      hasSourceBacked: false,
    }),
    true,
  );
  assert.equal(
    specPickerShouldSearch({
      changingSpec: true,
      capturingSheet: false,
      hasSelectedSpec: false,
      hasSourceBacked: false,
    }),
    true,
  );
  assert.equal(
    specPickerShouldSearch({
      changingSpec: false,
      capturingSheet: true,
      hasSelectedSpec: false,
      hasSourceBacked: false,
    }),
    false,
  );
  assert.equal(
    specPickerShouldSearch({
      changingSpec: false,
      capturingSheet: false,
      hasSelectedSpec: true,
      hasSourceBacked: false,
    }),
    false,
  );
});

test('proposed BOUWA search stays independent of all three current-machine sources', () => {
  const proposed = emptyProposedDraft();
  assert.equal(proposedSearchOpen(proposed), true);

  const fromCustomer = applyPhysicalMachine(newCurrentEquipmentDraft(), {
    _id: 'phys-1',
    make: 'Bouwa',
    model: 'SC-RS22',
    serialNumber: '2112-30884010',
  });
  assert.equal(fromCustomer.arsMachineId, 'phys-1');
  assert.equal(proposedSearchOpen(proposed), true);

  const fromLibrary = applyLibrarySpec(newCurrentEquipmentDraft(), {
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
  assert.equal(fromLibrary.specLibraryRecordId, 'lib-ga18');
  assert.equal(proposedSearchOpen(emptyProposedDraft()), true);

  const fromUploadedSpec = {
    ...newCurrentEquipmentDraft(),
    sourceBacked: atlasSource,
    make: atlasSource.manufacturer,
    model: atlasSource.model ?? '',
    capturingSheet: false,
    changingSpec: false,
  };
  assert.equal(hasUsableSourceBacked(fromUploadedSpec.sourceBacked), true);
  assert.equal(proposedSearchOpen(emptyProposedDraft()), true);
});

test('proposed search still runs after Use in this proposal and while the uploaded-spec editor is visible', () => {
  const beforeApply = emptyProposedDraft();
  assert.equal(proposedSearchOpen(beforeApply), true);

  const afterApply = proposedDraftFromProposal([]);
  assert.equal(afterApply.changingSpec, true);
  assert.equal(afterApply.capturingSheet, false);
  assert.equal(proposedSearchOpen(afterApply), true);

  const cancelledCapture = {
    ...emptyProposedDraft(),
    capturingSheet: false,
    changingSpec: false,
  };
  assert.equal(proposedSearchOpen(cancelledCapture), true);
});

test('selecting a BOUWA result still populates proposed equipment and persists on reload', () => {
  const selected = {
    ...emptyProposedDraft(),
    specLibraryRecordId: bouwaSpec.recordId,
    selectedSpec: bouwaSpec,
    manufacturer: bouwaSpec.manufacturer,
    model: bouwaSpec.model,
    changingSpec: false,
  };
  assert.equal(proposedSearchOpen(selected), false);
  const payload = toProposedEquipmentPayload(selected);
  assert.equal(payload[0].specLibraryRecordId, 'lib-rs250');
  assert.equal(payload[0].manufacturer, 'BOUWA');
  assert.equal(payload[0].model, 'RS250-2S');
  const reloaded = proposedDraftFromProposal(payload);
  assert.equal(reloaded.specLibraryRecordId, 'lib-rs250');
  assert.equal(reloaded.manufacturer, 'BOUWA');
  assert.equal(reloaded.model, 'RS250-2S');
});

test('uploaded Atlas current machine and spec-sheet prefill stay unchanged', () => {
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
  assert.equal(fields.manufacturer, 'Atlas Copco');
  assert.equal(fields.model, 'ZT 160 VSD+-10.4');
  assert.equal(fields.pressure, '10.34');
  assert.equal(fields.airflow, '23.52');
  assert.equal(fields.packageInput, '176.3');
  assert.equal(fields.motorRating, '160.03');
  assert.equal(fields.controlType, 'VSD');
});

test('proposed replacement still searches published BOUWA library records only', () => {
  const picker = fs.readFileSync(path.join(FEATURE_ROOT, 'components/SpecPicker.tsx'), 'utf8');
  const proposed = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/ProposedReplacementSection.tsx'),
    'utf8',
  );
  const search = fs.readFileSync(path.join(FEATURE_ROOT, 'specPickerSearch.ts'), 'utf8');
  const api = fs.readFileSync(path.join(FEATURE_ROOT, 'api.ts'), 'utf8');
  assert.match(proposed, /scope="bouwa"/);
  assert.match(proposed, /searchHint=""/);
  assert.match(proposed, /Search BOUWA machine/);
  assert.match(picker, /specPickerSearchIsOpen/);
  assert.match(picker, /searchSpecLibrary\(query, scope\)/);
  assert.match(api, /scope: 'all' \| 'bouwa'/);
  assert.doesNotMatch(proposed, /getMachinesByCustomer/);
  assert.doesNotMatch(search, /leven(shtein)?/i);
  assert.doesNotMatch(search, /fuse\.js/i);
  assert.doesNotMatch(picker, /getMachinesByCustomer/);
  assert.match(proposed, /hasUsableSourceBacked\(draft\.sourceBacked\)/);
  assert.match(proposed, /changingSpec:\s*\n\s*draft\.selectedSpec !== null \|\| hasUsableSourceBacked/);
});
