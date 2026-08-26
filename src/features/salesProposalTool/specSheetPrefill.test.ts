import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  SPEC_SHEET_MANUAL_FALLBACK_NOTE,
  SPEC_SHEET_VERIFY_NOTE,
  formFieldsFromExtracted,
  formatPrefillNumber,
  hasExtractedTechnicalValues,
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
  assert.match(capture, /SPEC_SHEET_VERIFY_NOTE/);
  assert.match(capture, /SPEC_SHEET_MANUAL_FALLBACK_NOTE/);
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
