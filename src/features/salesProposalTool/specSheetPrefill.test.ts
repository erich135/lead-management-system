import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  SPEC_SHEET_MANUAL_FALLBACK_NOTE,
  SPEC_SHEET_READ_FAILED_NOTE,
  SPEC_SHEET_VERIFY_NOTE,
  formFieldsFromExtracted,
  formatPrefillNumber,
  hasExtractedTechnicalValues,
  specSheetStatusMessage,
} from './specSheetPrefill.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

test('extracted Atlas values prefill ARS-unit form fields and stay editable', () => {
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
  assert.equal(fields.variant, '');
  assert.equal(fields.pressure, '10.34');
  assert.equal(fields.airflow, '23.52');
  assert.equal(fields.packageInput, '176.3');
  assert.equal(fields.motorRating, '160.03');
  assert.equal(fields.controlType, 'VSD');
  const corrected = { ...fields, pressure: '10.4' };
  assert.equal(corrected.pressure, '10.4');
});

test('partial extraction prefills found values and leaves the rest blank', () => {
  const fields = formFieldsFromExtracted({
    manufacturer: 'Atlas Copco',
    model: 'ZT 160 VSD+-10.4',
    modelVariant: null,
    ratedPressureBarG: null,
    ratedAirflowM3PerMin: null,
    packageInputPowerKw: null,
    motorShaftPowerKw: null,
    controlType: null,
  });
  assert.equal(fields.manufacturer, 'Atlas Copco');
  assert.equal(fields.model, 'ZT 160 VSD+-10.4');
  assert.equal(fields.pressure, '');
  assert.equal(fields.packageInput, '');
  assert.equal(hasExtractedTechnicalValues({
    manufacturer: 'Atlas Copco',
    model: null,
    modelVariant: null,
    ratedPressureBarG: null,
    ratedAirflowM3PerMin: null,
    packageInputPowerKw: null,
    motorShaftPowerKw: null,
    controlType: null,
  }), true);
  assert.equal(formatPrefillNumber(null), '');
});

test('factory-sheet extraction prefills source identity and motor and leaves unpublished ratings blank', () => {
  const fields = formFieldsFromExtracted(
    {
      manufacturer: 'Seize Compressor',
      model: 'SVC-132A/W II',
      modelVariant: null,
      ratedPressureBarG: null,
      ratedAirflowM3PerMin: null,
      packageInputPowerKw: null,
      motorShaftPowerKw: 132,
      controlType: 'VSD',
    },
    { manufacturer: 'Bouwa', model: 'SVC-RS132A-II' },
  );
  assert.equal(fields.manufacturer, 'Seize Compressor');
  assert.equal(fields.model, 'SVC-132A/W II');
  assert.equal(fields.pressure, '');
  assert.equal(fields.airflow, '');
  assert.equal(fields.packageInput, '');
  assert.equal(fields.motorRating, '132');
  assert.equal(fields.controlType, 'VSD');
  assert.equal(
    hasExtractedTechnicalValues({
      manufacturer: 'Seize Compressor',
      model: 'SVC-132A/W II',
      modelVariant: null,
      ratedPressureBarG: null,
      ratedAirflowM3PerMin: null,
      packageInputPowerKw: null,
      motorShaftPowerKw: 132,
      controlType: 'VSD',
    }),
    true,
  );
});

test('linked customer machine identity is not overwritten by the source-sheet manufacturer', () => {
  const current = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
  assert.match(current, /make: row\.arsMachineId \? row\.make : values\.manufacturer/);
  assert.match(current, /model: row\.arsMachineId \? row\.model : values\.model/);
});

test('spec-sheet capture prefills after upload without auto-applying or publishing', () => {
  const capture = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/SpecSheetCapture.tsx'),
    'utf8',
  );
  const api = fs.readFileSync(path.join(FEATURE_ROOT, 'api.ts'), 'utf8');
  const current = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
  assert.match(capture, /formFieldsFromExtracted/);
  assert.match(capture, /specSheetStatusMessage/);
  assert.match(capture, /extractionStatus/);
  assert.match(capture, /Use in this proposal/);
  assert.match(capture, /Source: \{sourceFileName\}/);
  const uploadFn = capture.slice(
    capture.indexOf('async function handleFile'),
    capture.indexOf('function handleApply'),
  );
  assert.equal(uploadFn.includes('onApply('), false);
  assert.match(capture, /onChange=\{\(e\) => setPressure/);
  assert.match(capture, /onChange=\{\(e\) => setPackageInput/);
  assert.doesNotMatch(capture, /addVersion/);
  assert.doesNotMatch(capture, /installedmachinespeclinks/);
  assert.match(api, /extracted:/);
  assert.match(current, /searchSpecLibrary/);
  assert.match(current, /getMachinesByCustomer/);
  assert.match(current, /SpecSheetCapture/);
  assert.equal(SPEC_SHEET_VERIFY_NOTE.includes('Please verify before use'), true);
  assert.equal(
    SPEC_SHEET_MANUAL_FALLBACK_NOTE.includes('Please enter the values shown'),
    true,
  );
});

test('extraction status maps to a distinct, non-technical message for each outcome', () => {
  assert.equal(specSheetStatusMessage('extracted'), SPEC_SHEET_VERIFY_NOTE);
  assert.equal(specSheetStatusMessage('no_supported_values'), SPEC_SHEET_MANUAL_FALLBACK_NOTE);
  assert.equal(specSheetStatusMessage('read_failed'), SPEC_SHEET_READ_FAILED_NOTE);
  assert.equal(specSheetStatusMessage(null), null);
  assert.equal(specSheetStatusMessage(undefined), null);

  assert.notEqual(SPEC_SHEET_MANUAL_FALLBACK_NOTE, SPEC_SHEET_READ_FAILED_NOTE);
  assert.equal(SPEC_SHEET_READ_FAILED_NOTE.includes('could not read this PDF'), true);
  assert.equal(/stack|Error:|at\s+\w+\s*\(/i.test(SPEC_SHEET_READ_FAILED_NOTE), false);
});
