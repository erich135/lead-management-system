import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SEARCH_MENU_WRAP_OPEN, SEARCH_MENU_PANEL } from './searchOverlay.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function currentEquipmentSource(): string {
  return fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
}

test('search dropdowns overlay later fields instead of sitting under them', () => {
  assert.match(SEARCH_MENU_WRAP_OPEN, /z-40/);
  assert.match(SEARCH_MENU_PANEL, /absolute/);
  assert.match(SEARCH_MENU_PANEL, /overflow-y-auto/);
  const current = currentEquipmentSource();
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
  assert.match(current, /searchMenuWrapClass\(menuOpen\)/);
  assert.doesNotMatch(current, /searchMenuWrapClass\(true\)/);
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

test('current-machine search opens on focus or typing and is not permanently open', () => {
  const current = currentEquipmentSource();
  assert.match(current, /const \[menuOpen, setMenuOpen\] = useState\(false\)/);
  assert.match(current, /onFocus=\{\(\) => setMenuOpen\(true\)\}/);
  assert.match(current, /setQuery\(event\.target\.value\)/);
  assert.match(current, /setMenuOpen\(true\)/);
  assert.match(current, /\{menuOpen && \(/);
  assert.match(current, /aria-expanded=\{menuOpen\}/);
});

test('current-machine search closes on selection, outside pointer and Escape', () => {
  const current = currentEquipmentSource();
  const selectPhysical = current.slice(
    current.indexOf('async function handleSelectPhysical'),
    current.indexOf('function handleSelectSpec'),
  );
  const selectSpec = current.slice(
    current.indexOf('function handleSelectSpec'),
    current.indexOf('if (row.capturingSheet)'),
  );
  assert.match(selectPhysical, /setMenuOpen\(false\)/);
  assert.match(selectSpec, /setMenuOpen\(false\)/);
  assert.match(current, /addEventListener\('pointerdown', closeOnPointerAway\)/);
  assert.match(current, /removeEventListener\('pointerdown', closeOnPointerAway\)/);
  assert.match(current, /addEventListener\('keydown', closeOnEscape\)/);
  assert.match(current, /removeEventListener\('keydown', closeOnEscape\)/);
  assert.match(current, /event\.key !== 'Escape'/);
  assert.match(current, /event\.currentTarget\.blur\(\)/);
  assert.match(current, /installedSpecSearchHint\(machine\.make, machine\.model\)/);
});

test('clear search and specification-sheet capture stay usable from the current-machine menu', () => {
  const current = currentEquipmentSource();
  const clearSearch = current.slice(
    current.indexOf('title="Clear search"'),
    current.indexOf('{menuOpen && ('),
  );
  assert.match(clearSearch, /setQuery\(''\)/);
  assert.match(clearSearch, /setMenuOpen\(true\)/);
  const captureFromMenu = current.slice(
    current.indexOf('Can&apos;t find the machine?'),
    current.indexOf('Add from specification sheet'),
  );
  assert.match(captureFromMenu, /setMenuOpen\(false\)/);
  assert.match(captureFromMenu, /capturingSheet: true/);
});
