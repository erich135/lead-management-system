import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SEARCH_MENU_WRAP_OPEN, SEARCH_MENU_PANEL } from './searchOverlay.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

test('search dropdowns overlay later fields instead of sitting under them', () => {
  assert.match(SEARCH_MENU_WRAP_OPEN, /z-40/);
  assert.match(SEARCH_MENU_PANEL, /absolute/);
  assert.match(SEARCH_MENU_PANEL, /overflow-y-auto/);
  const current = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
  const proposed = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/SpecPicker.tsx'),
    'utf8',
  );
  const customer = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CustomerSelect.tsx'),
    'utf8',
  );
  const editor = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
    'utf8',
  );
  const site = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/SiteMapCapture.tsx'),
    'utf8',
  );
  assert.match(current, /searchMenuWrapClass\(true\)/);
  assert.match(current, /SEARCH_MENU_PANEL/);
  assert.doesNotMatch(current, /relative z-20/);
  assert.match(proposed, /searchMenuWrapClass/);
  assert.match(proposed, /SEARCH_MENU_PANEL/);
  assert.doesNotMatch(proposed, /relative z-20/);
  assert.match(customer, /searchMenuWrapClass/);
  assert.match(customer, /SEARCH_MENU_PANEL/);
  assert.match(site, /searchMenuWrapClass/);
  assert.match(site, /SEARCH_MENU_PANEL/);
  assert.match(editor, /overflow-visible/);
  assert.doesNotMatch(editor, /overflow-hidden/);
});
