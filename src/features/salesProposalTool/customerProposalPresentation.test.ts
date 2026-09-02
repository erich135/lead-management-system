import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  customerProposalCommercialFigures,
  customerProposalElectricityFigures,
  proposalRequiresRevision,
  showsCommercialSaving,
  showsPayback,
  showsRevisionCallout,
} from './customerProposalPresentation.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const PREVIEW_SOURCE = fs.readFileSync(
  path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
  'utf8',
);

const ELECTRICITY = {
  currentLabel: 'Current estimated annual electricity cost',
  proposedLabel: 'Proposed estimated annual electricity cost',
  savingLabel: 'Estimated annual electricity saving',
  current: 'R 1 000 000',
  proposed: 'R 700 000',
  saving: 'R 300 000',
};

const COMMERCIAL = {
  currentHeadline: 'Current estimated annual compressed-air cost',
  proposedHeadline: 'Proposed estimated annual compressed-air cost',
  savingHeadline: 'Estimated annual operating saving',
  investmentHeadline: 'Net investment',
  paybackHeadline: 'Estimated payback',
  current: 'R 1 000 000',
  proposed: 'R 736 000',
  saving: 'R 264 000',
  offerType: 'purchase',
  investment: 'R 815 000',
  payback: '3.09 years',
  costRows: [{ label: 'Electricity', current: 'R 1 000 000', proposed: 'R 700 000' }],
  purchaseLines: [{ label: 'Equipment', amount: 'R 850 000' }],
};

function docFor(requiresRevision: boolean, recommendation: string) {
  return {
    requiresRevision,
    recommendation,
    electricity: ELECTRICITY,
    commercial: COMMERCIAL,
  };
}

const VALID_RECOMMENDATION =
  'ARS recommends the selected BOUWA solution, subject to final site and installation confirmation.';
const CURRENT_REVISION_WORDING =
  'Proposed configuration requires revision before savings and payback can be relied on.';
const REWORDED_REVISION_WORDING = 'Selected equipment requires technical revision.';

test('valid proposal shows the full electricity, saving and payback presentation', () => {
  const doc = docFor(false, VALID_RECOMMENDATION);

  assert.equal(proposalRequiresRevision(doc), false);
  assert.equal(showsRevisionCallout(doc), false);
  assert.equal(showsCommercialSaving(doc), true);
  assert.equal(showsPayback(doc), true);
  assert.deepEqual(
    customerProposalElectricityFigures(doc).map((figure) => figure.label),
    [ELECTRICITY.currentLabel, ELECTRICITY.proposedLabel, ELECTRICITY.savingLabel],
  );
  assert.deepEqual(
    customerProposalCommercialFigures(doc).map((figure) => figure.value),
    [COMMERCIAL.current, COMMERCIAL.proposed, COMMERCIAL.saving],
  );
});

test('invalid proposal suppresses saving and payback from requiresRevision alone', () => {
  const doc = docFor(true, CURRENT_REVISION_WORDING);

  assert.equal(proposalRequiresRevision(doc), true);
  assert.equal(showsRevisionCallout(doc), true);
  assert.equal(showsCommercialSaving(doc), false);
  assert.equal(showsPayback(doc), false);

  const electricity = customerProposalElectricityFigures(doc);
  assert.deepEqual(
    electricity.map((figure) => figure.label),
    [ELECTRICITY.currentLabel, ELECTRICITY.proposedLabel],
  );
  assert.equal(
    electricity.some((figure) => figure.value === ELECTRICITY.saving),
    false,
  );

  const commercial = customerProposalCommercialFigures(doc);
  assert.equal(
    commercial.some((figure) => figure.label === COMMERCIAL.savingHeadline),
    false,
  );
  assert.equal(
    commercial.some((figure) => figure.value === COMMERCIAL.saving),
    false,
  );
});

test('rewritten recommendation copy does not change the suppression of an invalid proposal', () => {
  const current = docFor(true, CURRENT_REVISION_WORDING);
  const reworded = docFor(true, REWORDED_REVISION_WORDING);
  const empty = docFor(true, '');

  for (const doc of [current, reworded, empty]) {
    assert.equal(proposalRequiresRevision(doc), true);
    assert.equal(showsRevisionCallout(doc), true);
    assert.equal(showsCommercialSaving(doc), false);
    assert.equal(showsPayback(doc), false);
    assert.deepEqual(
      customerProposalElectricityFigures(doc),
      customerProposalElectricityFigures(current),
    );
    assert.deepEqual(
      customerProposalCommercialFigures(doc),
      customerProposalCommercialFigures(current),
    );
  }
});

test('recommendation prose has no influence on a valid proposal either', () => {
  const withRevisionProse = docFor(false, CURRENT_REVISION_WORDING);

  assert.equal(proposalRequiresRevision(withRevisionProse), false);
  assert.equal(showsCommercialSaving(withRevisionProse), true);
  assert.equal(showsPayback(withRevisionProse), true);
  assert.deepEqual(
    customerProposalElectricityFigures(withRevisionProse),
    customerProposalElectricityFigures(docFor(false, VALID_RECOMMENDATION)),
  );
});

test('a document without the structured flag keeps saving and payback suppressed', () => {
  const doc = { ...docFor(false, VALID_RECOMMENDATION), requiresRevision: undefined } as unknown as
    Parameters<typeof customerProposalElectricityFigures>[0];

  assert.equal(showsCommercialSaving(doc), false);
  assert.deepEqual(
    customerProposalElectricityFigures(doc).map((figure) => figure.label),
    [ELECTRICITY.currentLabel, ELECTRICITY.proposedLabel],
  );
});

test('payback stays hidden when the offer carries no payback headline', () => {
  const doc = {
    ...docFor(false, VALID_RECOMMENDATION),
    commercial: { ...COMMERCIAL, paybackHeadline: null },
  };

  assert.equal(showsCommercialSaving(doc), true);
  assert.equal(showsPayback(doc), false);
});

test('customer proposal page decides validity from the document flag, never from prose', () => {
  assert.doesNotMatch(PREVIEW_SOURCE, /requires revision before savings and payback/);
  assert.doesNotMatch(PREVIEW_SOURCE, /test\(doc\.recommendation\)/);
  assert.doesNotMatch(PREVIEW_SOURCE, /doc\.recommendation\s*\)?\s*\.match/);
  assert.match(PREVIEW_SOURCE, /from '\.\.\/customerProposalPresentation'/);
  assert.match(PREVIEW_SOURCE, /showsRevisionCallout\(doc\)/);
  assert.match(PREVIEW_SOURCE, /showsCommercialSaving\(doc\)/);
  assert.match(PREVIEW_SOURCE, /showsPayback\(doc\)/);
  assert.match(PREVIEW_SOURCE, /customerProposalElectricityFigures\(doc\)/);
  assert.match(PREVIEW_SOURCE, /customerProposalCommercialFigures\(doc\)/);
  assert.match(PREVIEW_SOURCE, /\{savingVisible && \(/);
  assert.match(PREVIEW_SOURCE, /\{paybackVisible && \(/);
});

test('customer proposal reuses the existing ARS logo and company header without legacy Bouwa content', () => {
  const preview = PREVIEW_SOURCE;
  const css = fs.readFileSync(path.resolve(FEATURE_ROOT, '../../index.css'), 'utf8');
  const logo = path.resolve(FEATURE_ROOT, '../../../public/Logo.png');

  assert.equal(fs.existsSync(logo), true);
  assert.match(preview, /ARS_LOGO_SRC = '\/Logo\.png'/);
  assert.match(preview, /ARS_DEFAULT_HEADER/);
  assert.match(preview, /from '\.\.\/\.\.\/\.\.\/utils\/arsJobCardHeaderDefaults'/);
  assert.doesNotMatch(preview, /features\/bouwa/);
  assert.doesNotMatch(preview, /ProposalDocumentView/);
  assert.doesNotMatch(preview, /BAOFN|Samancor/i);
  assert.match(preview, /spt-proposal-callout/);
  assert.match(preview, /doc\.electricity\.currentLabel|customerProposalElectricityFigures/);
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
  const preview = PREVIEW_SOURCE;
  assert.match(preview, /doc\.electricity\.saving \?\? NOT_AVAILABLE|savingVisible/);
  assert.match(preview, /doc\.commercial\.payback \?\? 'Not available'/);
  assert.match(preview, /doc\.warnings\.map/);
});
