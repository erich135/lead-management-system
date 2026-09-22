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
  assert.doesNotMatch(site, /openstreetmap/i);
  assert.doesNotMatch(site, /react-leaflet/);
  assert.match(site, /GoogleSiteMap/);
  const googleMap = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/GoogleSiteMap.tsx'),
    'utf8',
  );
  assert.match(googleMap, /maps\.googleapis\.com\/maps\/api\/js/);
  assert.doesNotMatch(googleMap, /openstreetmap/i);
  assert.match(editor, /overflow-visible/);
  assert.doesNotMatch(editor, /overflow-hidden/);
});

test('current-machine search opens on click, focus or typing and is not permanently open', () => {
  const current = currentEquipmentSource();
  assert.match(current, /useDismissibleSearchMenu/);
  assert.match(current, /onClick=\{openMenu\}/);
  assert.match(current, /onFocus=\{openMenu\}/);
  assert.match(current, /setQuery\(event\.target\.value\)/);
  assert.match(current, /openMenu\(\)/);
  assert.match(current, /\{menuOpen && \(/);
  assert.match(current, /aria-expanded=\{menuOpen\}/);
  assert.doesNotMatch(current, /searchMenuWrapClass\(true\)/);
});

test('current-machine search closes on selection, outside pointer and Escape', () => {
  const current = currentEquipmentSource();
  const hook = fs.readFileSync(path.join(FEATURE_ROOT, 'useDismissibleSearchMenu.ts'), 'utf8');
  const selectPhysical = current.slice(
    current.indexOf('async function handleSelectPhysical'),
    current.indexOf('function handleSelectSpec'),
  );
  const selectSpec = current.slice(
    current.indexOf('function handleSelectSpec'),
    current.indexOf('if (row.capturingSheet)'),
  );
  assert.match(selectPhysical, /closeMenu\(\)/);
  assert.match(selectSpec, /closeMenu\(\)/);
  assert.match(hook, /addEventListener\('pointerdown', closeOnPointerAway\)/);
  assert.match(hook, /removeEventListener\('pointerdown', closeOnPointerAway\)/);
  assert.match(hook, /addEventListener\('keydown', closeOnEscape\)/);
  assert.match(hook, /removeEventListener\('keydown', closeOnEscape\)/);
  assert.match(hook, /event\.key !== 'Escape'/);
  assert.match(current, /event\.key !== 'Escape'/);
  assert.match(current, /closeMenu\(\)/);
  assert.match(current, /installedSpecSearchHint\(machine\.make, machine\.model\)/);
  assert.doesNotMatch(
    current.slice(current.indexOf('if (event.key !== \'Escape\')'), current.indexOf('placeholder="Search make')),
    /setQuery\(''\)/,
  );
});

test('clear search and specification-sheet capture stay usable from the current-machine menu', () => {
  const current = currentEquipmentSource();
  const clearSearch = current.slice(
    current.indexOf('title="Clear search"'),
    current.indexOf('{menuOpen && ('),
  );
  assert.match(clearSearch, /setQuery\(''\)/);
  assert.match(clearSearch, /openMenu\(\)/);
  const captureFromMenu = current.slice(
    current.indexOf('Can&apos;t find the machine?'),
    current.indexOf('Add from specification sheet'),
  );
  assert.match(captureFromMenu, /closeMenu\(\)/);
  assert.match(captureFromMenu, /capturingSheet: true/);
});

test('proposed BOUWA search uses the same dismissible menu and does not reopen from search results', () => {
  const proposed = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/SpecPicker.tsx'),
    'utf8',
  );
  const hook = fs.readFileSync(path.join(FEATURE_ROOT, 'useDismissibleSearchMenu.ts'), 'utf8');
  assert.match(proposed, /useDismissibleSearchMenu/);
  assert.match(proposed, /searchMenuWrapClass\(menuOpen\)/);
  assert.match(proposed, /onClick=\{openMenu\}/);
  assert.match(proposed, /onFocus=\{openMenu\}/);
  assert.match(proposed, /\{menuOpen && \(/);
  assert.match(proposed, /aria-expanded=\{menuOpen\}/);
  assert.match(proposed, /closeMenu\(\)/);
  assert.match(proposed, /if \(!menuOpen\) return/);
  assert.doesNotMatch(proposed, /searchMenuWrapClass\(\s*loading/);
  const fetchThen = proposed.slice(
    proposed.indexOf('void searchSpecLibrary(query, scope)'),
    proposed.indexOf('.finally'),
  );
  assert.doesNotMatch(fetchThen, /openMenu/);
  assert.doesNotMatch(fetchThen, /setMenuOpen\(true\)/);
  assert.match(hook, /useState\(false\)/);
});
