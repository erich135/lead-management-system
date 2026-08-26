import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { containsInventedElectricalCopy } from './formatMeasured.ts';
import {
  displayOrUnavailable,
  formatEstimatedKwh,
  formatEstimatedRand,
} from './formatMeasured.ts';
import { buildElectricityBasis, parseNonNegativeNumber } from './electricityBasis.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('Phase 4 does not add a frontend science engine, VSD add-on, or commercial totals', () => {
  const files = listFiles(FEATURE_ROOT).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('calcSpecificEnergy'), false, file);
    assert.equal(text.includes('calcSpecificPower'), false, file);
    assert.equal(text.includes('calcAnnualEnergyKwh'), false, file);
    assert.equal(text.includes('calcAnnualEnergyCostFlat'), false, file);
    assert.equal(text.includes('features/bouwa'), false, file);
    assert.equal(text.includes('GuidedProposalWizard'), false, file);
    if (!/commercial/i.test(file) && !file.endsWith('types.ts') && !/customerProposal/i.test(file)) {
      assert.equal(/\bA\/B\/Z\b/.test(text), false, file);
      assert.equal(text.includes('payback'), false, file);
    }
    assert.equal(/0\.14|14%\s*VSD/i.test(text), false, file);
    assert.equal(/BAOFN|Samancor/i.test(text), false, file);
  }
});

test('Air Audit measured card still does not invent electrical copy', () => {
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/MeasuredAuditCard.tsx'),
    'utf8',
  );
  assert.equal(containsInventedElectricalCopy(card), false);
  assert.match(card, /Mean measured airflow/);
  assert.match(card, /Recorded pressure/);
});

test('air and machine comparison keeps P90 as a measured statistic', () => {
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/AirMachineComparisonCard.tsx'),
    'utf8',
  );
  assert.match(card, /P90 measured airflow/);
  assert.match(card, /Highest recorded airflow/);
  assert.match(card, /Published capacity/);
  assert.match(card, /Recorded pressure/);
  assert.doesNotMatch(card, /design demand/i);
  assert.doesNotMatch(card, /required airflow/i);
});

test('electricity result panel displays backend copy and never formats unknown as zero', () => {
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/ElectricityResultCard.tsx'),
    'utf8',
  );
  const editor = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
    'utf8',
  );
  assert.match(card, /comparison\.copy\.currentCost/);
  assert.match(card, /comparison\.copy\.proposedCost/);
  assert.match(card, /comparison\.copy\.saving/);
  assert.match(card, /comparison\.futureCostDisclaimer/);
  assert.match(card, /Add from specification sheet/);
  assert.match(card, /How was this calculated\?/);
  assert.match(editor, /previewElectricityComparison/);
  assert.match(editor, /electricityBasis/);
  assert.equal(formatEstimatedRand(null), null);
  assert.equal(formatEstimatedKwh(null), null);
  assert.equal(displayOrUnavailable(formatEstimatedRand(null)), 'Not available');
  assert.notEqual(displayOrUnavailable(formatEstimatedRand(null)), 'R0');
  assert.notEqual(displayOrUnavailable(formatEstimatedRand(null)), 'R 0');
  assert.notEqual(displayOrUnavailable(formatEstimatedKwh(null)), '0 kWh');
});

test('electricity basis parsing stores the entered rate and does not treat a blank as zero', () => {
  assert.equal(parseNonNegativeNumber(''), null);
  assert.equal(parseNonNegativeNumber('1.82'), 1.82);
  const basis = buildElectricityBasis({
    rateText: '1.82',
    amountText: '',
    period: 'monthly',
  });
  assert.equal(basis.type, 'flat_rate');
  assert.equal(basis.flatRateRandPerKwh, 1.82);
  assert.equal(basis.suppliedCurrentAmount, null);
  const amountOnly = buildElectricityBasis({
    rateText: '',
    amountText: '10000',
    period: 'monthly',
  });
  assert.equal(amountOnly.type, 'supplied_compressor_amount');
  assert.equal(amountOnly.suppliedCurrentPeriod, 'monthly');
});
