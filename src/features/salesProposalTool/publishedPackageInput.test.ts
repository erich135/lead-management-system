import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AIR_AUDIT_ELECTRICAL_NOTE,
  displayedMotorRatingKw,
  effectivePackageInput,
  MOTOR_RATING_LABEL,
  PUBLISHED_PACKAGE_INPUT_LABEL,
} from './specDisplay.ts';
import { formFieldsFromExtracted } from './specSheetPrefill.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('editor and customer proposal label package input as published, never measured', () => {
  assert.equal(PUBLISHED_PACKAGE_INPUT_LABEL, 'Published package input');
  assert.equal(MOTOR_RATING_LABEL, 'Motor rating');
  const current = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
  const summary = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/MachineSummaryCard.tsx'),
    'utf8',
  );
  const preview = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
    'utf8',
  );
  const electricity = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/ElectricityResultCard.tsx'),
    'utf8',
  );
  const upload = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/AirAuditUpload.tsx'),
    'utf8',
  );
  const performance = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentMachinePerformanceCard.tsx'),
    'utf8',
  );
  assert.match(current, /PUBLISHED_PACKAGE_INPUT_LABEL/);
  assert.match(current, /MOTOR_RATING_LABEL/);
  assert.match(summary, /PUBLISHED_PACKAGE_INPUT_LABEL/);
  assert.match(summary, /Proposed replacement/);
  assert.match(preview, /Published package/);
  assert.doesNotMatch(preview, /Measured package input/);
  assert.match(electricity, /published machine/);
  assert.match(electricity, /Current published package-input\/FAD basis/);
  assert.match(electricity, /Proposed published package-input\/FAD basis/);
  assert.match(upload, /AIR_AUDIT_ELECTRICAL_NOTE/);
  assert.match(AIR_AUDIT_ELECTRICAL_NOTE, /published machine specification/);
  assert.doesNotMatch(AIR_AUDIT_ELECTRICAL_NOTE, /Did you measure electrical power/);
  assert.match(performance, /result\.copy\.publishedLabel/);
  assert.match(performance, /result\.copy\.measuredLabel/);
  assert.doesNotMatch(performance, /packageInputPowerKw/);
  assert.doesNotMatch(current, /Measured package input/);
  assert.doesNotMatch(summary, /Measured package input/);
});

test('library and uploaded-spec package input stay published and motor rating stays separate', () => {
  const library = effectivePackageInput(
    {
      recordId: 'lib-1',
      manufacturer: 'Bouwa',
      model: 'SVC-RS250A-II',
      modelVariant: '525V',
      ratedPressureBarG: 8,
      ratedAirflowM3PerMin: 55.3,
      packageInputPowerKw: 250,
      motorShaftPowerKw: 250,
      controlType: null,
      sourceTitle: 'BOUWA datasheet',
      sourceFileName: null,
    },
    null,
  );
  assert.equal(library.value, 250);
  assert.equal(library.origin, 'library');
  const uploaded = effectivePackageInput(null, {
    manufacturer: 'Atlas Copco',
    model: 'ZT 160 VSD+-10.4',
    modelVariant: null,
    ratedPressureBarG: 10.34,
    ratedAirflowM3PerMin: 23.52,
    packageInputPowerKw: 176.3,
    motorShaftPowerKw: 160.03,
    controlType: 'VSD',
    sourceFileName: 'ZT160_CAGI.pdf',
    sourceFileId: null,
    sourceSha256: null,
  });
  assert.equal(uploaded.value, 176.3);
  assert.equal(uploaded.origin, 'source');
  const motor = displayedMotorRatingKw(null, {
    manufacturer: 'Atlas Copco',
    model: 'ZT 160 VSD+-10.4',
    modelVariant: null,
    ratedPressureBarG: 10.34,
    ratedAirflowM3PerMin: 23.52,
    packageInputPowerKw: 176.3,
    motorShaftPowerKw: 160.03,
    controlType: 'VSD',
    sourceFileName: 'ZT160_CAGI.pdf',
    sourceFileId: null,
    sourceSha256: null,
  });
  assert.equal(motor, 160.03);
  assert.notEqual(motor, uploaded.value);
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
});

test('TODO 2 does not add an electrical framework, collection or TODO 3 model', () => {
  const files = listFiles(FEATURE_ROOT).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('powerSourceFramework'), false, file);
    assert.equal(text.includes('electricalEvidenceEngine'), false, file);
    assert.equal(text.includes('measurementProvenance'), false, file);
    assert.equal(text.includes('calcLoadUnloadMeanPower'), false, file);
    assert.equal(/loaded hours × published full-load/i.test(text), false, file);
    assert.equal(text.includes('Did you measure electrical power'), false, file);
  }
  const scope = fs.readFileSync(path.join(FEATURE_ROOT, 'airAuditScope.ts'), 'utf8');
  assert.doesNotMatch(scope, /packageInputPowerKw|measuredPackageInput/);
});
