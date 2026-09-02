import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { customerProposalElectricityFigures } from './customerProposalPresentation.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('Phase 6 customer proposal uses print CSS and does not invent a document engine', () => {
  const files = listFiles(FEATURE_ROOT).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('features/bouwa'), false, file);
    assert.equal(text.includes('GuidedProposalWizard'), false, file);
    assert.equal(text.includes('proposalDocument.ts'), false, file);
    assert.equal(text.includes('ProposalDocumentView'), false, file);
    assert.equal(text.includes('jspdf'), false, file);
    assert.equal(text.includes('customerPdf'), false, file);
    assert.equal(/BAOFN|Samancor/i.test(text), false, file);
    assert.equal(/\bCO2\b/.test(text), false, file);
    assert.equal(text.includes('calcPaybackYears'), false, file);
    assert.doesNotMatch(text, /totalA\s*\+|totalB\s*\+|monthlyRental\s*\*\s*12/);
  }
  const preview = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
    'utf8',
  );
  assert.match(preview, /window\.print/);
  assert.match(preview, /print:hidden/);
  assert.match(preview, /spt-customer-proposal-print-root/);
  assert.match(preview, /Download \/ Print Proposal/);
  assert.match(preview, /customerProposalElectricityFigures\(doc\)/);
  assert.deepEqual(
    customerProposalElectricityFigures({
      requiresRevision: true,
      electricity: {
        currentLabel: 'Backend current label',
        proposedLabel: 'Backend proposed label',
        savingLabel: 'Backend saving label',
        current: 'R 1',
        proposed: 'R 2',
        saving: 'R 3',
      },
    }).map((figure) => figure.label),
    ['Backend current label', 'Backend proposed label'],
  );
  assert.match(preview, /doc\.commercial\.savingHeadline/);
  assert.match(preview, /doc\.airAudit\.measuredHeading/);
  assert.match(preview, /Published machine specification/);
  assert.match(preview, /spt-customer-proposal-page-2/);
  assert.match(preview, /Headers and footers/);
  assert.doesNotMatch(preview, /spt-customer-proposal-page[^-]/);
  const electricityAt = preview.indexOf('Estimated electricity');
  const page2At = preview.indexOf('spt-customer-proposal-page-2');
  const commercialAt = preview.indexOf('Estimated annual compressed-air cost');
  assert.ok(page2At > 0 && electricityAt > page2At, 'electricity headline starts page 2');
  assert.ok(commercialAt > page2At, 'A/B/Z headline starts page 2');
  assert.doesNotMatch(preview, /DS400/);
  assert.doesNotMatch(preview, /design demand/i);
  const css = fs.readFileSync(
    path.resolve(FEATURE_ROOT, '../../index.css'),
    'utf8',
  );
  assert.match(css, /spt-customer-proposal-print-root/);
  assert.match(css, /spt-customer-proposal-toolbar/);
  assert.match(css, /spt-customer-proposal-page-2/);
  assert.match(css, /page-break-before:\s*always/);
  assert.doesNotMatch(css, /\.spt-customer-proposal-page\s*\{[^}]*page-break-after:\s*always/);
});
