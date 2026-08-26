import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('editor displays backend current-machine performance and does not calculate the percentage', () => {
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentMachinePerformanceCard.tsx'),
    'utf8',
  );
  const editor = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
    'utf8',
  );
  const api = fs.readFileSync(path.join(FEATURE_ROOT, 'api.ts'), 'utf8');
  assert.match(card, /result\.copy\.publishedLabel/);
  assert.match(card, /result\.copy\.measuredLabel/);
  assert.match(card, /result\.copy\.comparisonDisplay/);
  assert.match(card, /result\.siteHeaderNote/);
  assert.doesNotMatch(card, /publishedFlowM3PerMin\s*-/);
  assert.doesNotMatch(card, /\/\s*publishedFlowM3PerMin/);
  assert.doesNotMatch(card, /efficiency loss/i);
  assert.doesNotMatch(card, /\bkWh\b/);
  assert.doesNotMatch(card, /calcSpecificEnergy/);
  assert.match(editor, /CurrentMachinePerformanceCard/);
  assert.match(editor, /airAuditScope/);
  assert.match(api, /currentMachinePerformance/);
  assert.match(api, /airAuditScope\?/);
});

test('customer proposal shows backend when-new copy on two pages only', () => {
  const preview = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
    'utf8',
  );
  assert.match(preview, /doc\.currentMachinePerformance/);
  assert.match(preview, /doc\.currentMachinePerformance\.publishedLabel/);
  assert.match(preview, /doc\.currentMachinePerformance\.measuredLabel/);
  assert.match(preview, /doc\.currentMachinePerformance\.comparisonLabel/);
  assert.match(preview, /spt-customer-proposal-page-2/);
  assert.doesNotMatch(preview, /spt-customer-proposal-page-3/);
  assert.doesNotMatch(preview, /efficiency loss/i);
  assert.doesNotMatch(preview, /electrical degradation/i);
  const performanceAt = preview.indexOf('doc.currentMachinePerformance');
  const page2At = preview.indexOf('spt-customer-proposal-page-2');
  assert.ok(performanceAt > 0 && performanceAt < page2At);
});

test('TODO 1 does not add a health model, electricity engine or later parked items', () => {
  const files = listFiles(FEATURE_ROOT).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('degradationEngine'), false, file);
    assert.equal(text.includes('conditionScore'), false, file);
    assert.equal(text.includes('efficiencyScore'), false, file);
    assert.equal(text.includes('calcAnnualEnergyKwh'), false, file);
    assert.equal(text.includes('Managed Air'), false, file);
  }
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentMachinePerformanceCard.tsx'),
    'utf8',
  );
  assert.doesNotMatch(card, /no-load|load\/unload|TOU tariff|\bCO2\b/i);
});
