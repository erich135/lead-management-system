import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  MEASURED_AIR_AUDIT_BASIS_EXPLANATION,
  MEASURED_AIR_AUDIT_BASIS_TITLE,
  PUBLISHED_MACHINE_VALUES_BASIS_EXPLANATION,
  PUBLISHED_MACHINE_VALUES_BASIS_TITLE,
  customerProposalCalculationBasisCopy,
} from './electricityCalculationBasis.ts';

const previewPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'pages/CustomerProposalPreviewPage.tsx',
);

test('customer proposal basis copy follows the saved calculation mode', () => {
  assert.deepEqual(customerProposalCalculationBasisCopy('air_audit'), {
    title: MEASURED_AIR_AUDIT_BASIS_TITLE,
    explanation: MEASURED_AIR_AUDIT_BASIS_EXPLANATION,
  });
  assert.equal(
    MEASURED_AIR_AUDIT_BASIS_TITLE,
    'Calculation basis: Measured Air Audit data',
  );
  assert.equal(
    MEASURED_AIR_AUDIT_BASIS_EXPLANATION,
    'These calculations are based on measured site air demand from the uploaded Air Audit, together with the selected machine specifications, tariffs and operating assumptions.',
  );
  assert.deepEqual(customerProposalCalculationBasisCopy('published_capacity'), {
    title: PUBLISHED_MACHINE_VALUES_BASIS_TITLE,
    explanation: PUBLISHED_MACHINE_VALUES_BASIS_EXPLANATION,
  });
  assert.equal(
    PUBLISHED_MACHINE_VALUES_BASIS_TITLE,
    'Calculation basis: Published machine values',
  );
  assert.equal(
    PUBLISHED_MACHINE_VALUES_BASIS_EXPLANATION,
    'These calculations are based on published/site-adjusted machine values and the selected operating assumptions. Measured Air Audit demand is not used as the electricity-volume basis.',
  );
  assert.equal(
    customerProposalCalculationBasisCopy('air_audit').title,
    'Calculation basis: Measured Air Audit data',
  );
  assert.notEqual(
    customerProposalCalculationBasisCopy('air_audit').title,
    customerProposalCalculationBasisCopy('published_capacity').title,
  );
});

test('proposal page 1 and the method section both render the saved basis', () => {
  const preview = fs.readFileSync(previewPath, 'utf8');
  assert.match(preview, /customerProposalCalculationBasisCopy/);
  assert.match(preview, /basis=\{doc\.electricityCalculationBasis\}/);
  const recommendation = preview.indexOf('spt-proposal-recommend');
  const noticeBeforeSavings = preview.indexOf('CalculationBasisNotice', recommendation);
  const savings = preview.indexOf('FigureStrip', recommendation);
  assert.ok(recommendation > 0, 'recommendation section is on the proposal');
  assert.ok(noticeBeforeSavings > recommendation && noticeBeforeSavings < savings);
  const method = preview.indexOf('How these figures were worked out');
  const noticeInMethod = preview.indexOf('CalculationBasisNotice', method);
  assert.ok(method > recommendation);
  assert.ok(noticeInMethod > method);
  assert.doesNotMatch(preview, /spt-proposal-quiet[\s\S]{0,80}Calculation basis/);
});
