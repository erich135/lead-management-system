import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

test('customer proposal reuses the existing ARS logo and company header without legacy Bouwa content', () => {
  const preview = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
    'utf8',
  );
  const css = fs.readFileSync(path.resolve(FEATURE_ROOT, '../../index.css'), 'utf8');
  const logo = path.resolve(FEATURE_ROOT, '../../../public/Logo.png');

  assert.equal(fs.existsSync(logo), true);
  assert.match(preview, /ARS_LOGO_SRC = '\/Logo\.png'/);
  assert.match(preview, /ARS_DEFAULT_HEADER/);
  assert.match(preview, /from '\.\.\/\.\.\/\.\.\/utils\/arsJobCardHeaderDefaults'/);
  assert.doesNotMatch(preview, /features\/bouwa/);
  assert.doesNotMatch(preview, /ProposalDocumentView/);
  assert.doesNotMatch(preview, /BAOFN|Samancor/i);
  assert.match(preview, /proposalRequiresRevision/);
  assert.match(preview, /spt-proposal-callout/);
  assert.match(preview, /doc\.electricity\.currentLabel/);
  assert.match(preview, /doc\.commercial\.savingHeadline/);
  assert.match(preview, /doc\.recommendation/);
  assert.match(preview, /spt-customer-proposal-page-1/);
  assert.match(preview, /spt-customer-proposal-page-2/);
  assert.doesNotMatch(preview, /spt-customer-proposal-page-3/);
  assert.match(css, /padding:\s*16mm/);
  assert.match(css, /width:\s*210mm/);
  assert.match(css, /min-height:\s*297mm/);
  assert.match(css, /page-break-before:\s*always/);
  assert.match(css, /print-color-adjust:\s*exact/);
  assert.match(css, /#0969a9/);
  assert.match(css, /#f7c12b/);
});

test('invalid proposal presentation still blocks saving and payback fields', () => {
  const preview = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
    'utf8',
  );
  assert.match(preview, /blocked\s*\?\s*\[\]/);
  assert.match(preview, /!blocked && doc\.commercial\.paybackHeadline/);
  assert.match(preview, /doc\.electricity\.saving \?\? 'Not available'/);
  assert.match(preview, /doc\.commercial\.saving \?\? 'Not available'/);
  assert.match(preview, /doc\.commercial\.payback \?\? 'Not available'/);
  assert.match(preview, /doc\.warnings\.map/);
});
