import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function read(relativePath: string): string {
  return fs.readFileSync(path.join(FEATURE_ROOT, relativePath), 'utf8');
}

test('blocked proposed configuration keeps technical comparison and hides commercial results', () => {
  const electricity = read('components/ElectricityResultCard.tsx');
  const commercial = read('components/CommercialResultCard.tsx');
  const comparison = read('components/AirMachineComparisonCard.tsx');
  const preview = read('pages/CustomerProposalPreviewPage.tsx');
  const performance = read('components/CurrentMachinePerformanceCard.tsx');

  assert.match(comparison, /comparison\?\.warnings\.map/);
  assert.match(comparison, /comparison\.proposed\.totalRatedFadM3PerMin/);
  assert.match(comparison, /comparison\.proposed\.ratedPressureBarG/);
  assert.match(electricity, /does not meet the audited air requirement/);
  assert.match(electricity, /saving \?\? 'Not available'/);
  assert.match(electricity, /comparison\.proposed\.estimatedAnnualKwh/);
  assert.match(commercial, /does not meet the audited air requirement/);
  assert.match(commercial, /saving \?\? 'Not available'/);
  assert.match(commercial, /paybackUnavailableReason/);
  assert.match(preview, /doc\.electricity\.saving \?\? 'Not available'/);
  assert.match(preview, /doc\.commercial\.saving \?\? 'Not available'/);
  assert.match(preview, /doc\.commercial\.payback \?\? 'Not available'/);
  assert.match(preview, /doc\.recommendation/);
  assert.match(preview, /doc\.warnings\.map/);
  assert.match(preview, /doc\.proposed\.publishedAirflow/);
  assert.match(preview, /spt-customer-proposal-page-2/);
  assert.doesNotMatch(preview, /spt-customer-proposal-page-3/);
  assert.match(performance, /result\.copy\.comparisonLabel/);
  assert.doesNotMatch(performance, /Measured airflow compared with published airflow/);
});

test('validity blocking does not add an optimiser, workflow engine or TODO 3 science', () => {
  const files = fs.readdirSync(FEATURE_ROOT, { recursive: true }).flatMap((entry) => {
    const relative = String(entry);
    const full = path.join(FEATURE_ROOT, relative);
    return fs.statSync(full).isFile() && /\.(ts|tsx)$/.test(full) && !full.endsWith('.test.ts')
      ? [full]
      : [];
  });
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('assessLikeForLikeComparison'), false, file);
    assert.equal(text.includes('comparisonGuard'), false, file);
    assert.equal(text.includes('calcLoadUnloadMeanPower'), false, file);
    assert.equal(text.includes('sizingOptimiser'), false, file);
    assert.equal(text.includes('statusEngine'), false, file);
  }
});
