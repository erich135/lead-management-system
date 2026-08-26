import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { containsInventedElectricalCopy } from './formatMeasured.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('Phase 3 does not add a matching engine, electricity maths, or legacy wizard imports', () => {
  const files = listFiles(FEATURE_ROOT).filter((file) =>
    /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('features/bouwa'), false, file);
    assert.equal(text.includes('GuidedProposalWizard'), false, file);
    assert.equal(text.includes('/api/bouwa'), false, file);
    assert.equal(/leven(shtein)?/i.test(text), false, file);
    assert.equal(text.includes('matchSpecLibrary'), false, file);
    assert.equal(text.includes('installedmachinespeclinks'), false, file);
    assert.equal(/BAOFN|Samancor/i.test(text), false, file);
    assert.equal(/\bA\/B\/Z\b/.test(text), false, file);
  }
});

test('Air Audit measured card is unchanged and still has no invented electrical copy', () => {
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/MeasuredAuditCard.tsx'),
    'utf8',
  );
  assert.equal(containsInventedElectricalCopy(card), false);
  assert.match(card, /Mean measured airflow/);
  assert.match(card, /Recorded pressure/);
});

test('current equipment uses one Current Machine search over customer records and the library', () => {
  const section = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
  const search = fs.readFileSync(
    path.join(FEATURE_ROOT, 'currentMachineSearch.ts'),
    'utf8',
  );
  assert.match(section, /getMachinesByCustomer/);
  assert.match(section, /searchSpecLibrary/);
  assert.match(section, /Current machine/);
  assert.match(section, /Search make, model or serial/);
  assert.match(section, /Customer machines/);
  assert.match(section, /Machine Specification Library/);
  assert.match(section, /Add from specification sheet/);
  assert.match(section, /describeCurrentMachineDropdown/);
  assert.match(section, /Change machine/);
  assert.match(section, /searchMenuWrapClass/);
  assert.match(section, /overflow-visible/);
  assert.doesNotMatch(section, /overflow-hidden/);
  assert.doesNotMatch(section, /relative z-20/);
  assert.doesNotMatch(section, /Installed machine/);
  assert.match(search, /No machines are recorded for this customer/);
  assert.match(search, /No matching machine found/);
  assert.match(search, /groupCurrentMachineSearch/);
});

test('spec search does not require exact installed spelling and does not auto-select', () => {
  const picker = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/SpecPicker.tsx'),
    'utf8',
  );
  const current = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
  const state = fs.readFileSync(
    path.join(FEATURE_ROOT, 'equipmentState.ts'),
    'utf8',
  );
  assert.match(current, /searchSpecLibrary/);
  assert.match(picker, /Can&apos;t find the machine\?/);
  assert.match(state, /specIdToPreselect/);
  assert.match(state, /applyLibrarySpec/);
  assert.equal(state.includes('leven'), false);
});

test('proposed BOUWA picker filters the library and quantity defaults to 1', () => {
  const proposed = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/ProposedReplacementSection.tsx'),
    'utf8',
  );
  assert.match(proposed, /scope="bouwa"/);
  assert.match(proposed, /DEFAULT_PROPOSED_QUANTITY/);
  assert.match(proposed, /Quantity/);
});
