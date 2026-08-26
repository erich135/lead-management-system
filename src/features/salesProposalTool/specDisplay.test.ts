import assert from 'node:assert/strict';
import test from 'node:test';
import {
  displayedMotorRatingKw,
  effectivePackageInput,
  effectiveRatedAirflow,
  packageInputUnavailableCopy,
} from './specDisplay.ts';
import type { PublicMachineSpec } from './types.ts';

const library: PublicMachineSpec = {
  recordId: '1',
  manufacturer: 'Atlas Copco',
  model: 'GA250',
  modelVariant: null,
  ratedPressureBarG: 8,
  ratedAirflowM3PerMin: 42.47,
  packageInputPowerKw: null,
  motorShaftPowerKw: 250,
  controlType: null,
  sourceTitle: 'GA250 datasheet',
  sourceFileName: 'GA250 datasheet.pdf',
};

test('package input is never copied from motor rating', () => {
  const packageInput = effectivePackageInput(library, null);
  assert.equal(packageInput.value, null);
  assert.equal(packageInput.origin, 'missing');
  assert.equal(displayedMotorRatingKw(library, null), 250);
});

test('missing library values stay unavailable', () => {
  assert.equal(
    packageInputUnavailableCopy({ hasLibrary: true, hasSource: false }),
    'Not available in the library record.',
  );
  assert.equal(effectiveRatedAirflow(library, null).value, 42.47);
});

test('source-backed overlay can fill a missing library value without inventing motor as package input', () => {
  const filled = effectivePackageInput(library, {
    manufacturer: 'Atlas Copco',
    model: 'GA250',
    modelVariant: null,
    ratedPressureBarG: null,
    ratedAirflowM3PerMin: null,
    packageInputPowerKw: 256,
    motorShaftPowerKw: 250,
    controlType: null,
    sourceFileName: 'GA250 datasheet.pdf',
    sourceFileId: 'file-1',
    sourceSha256: 'abc',
  });
  assert.equal(filled.value, 256);
  assert.equal(filled.origin, 'source');
});
