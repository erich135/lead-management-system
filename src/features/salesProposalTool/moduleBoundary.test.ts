import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { uniqueKnownLocations } from './knownSiteLocations.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('new frontend feature does not import from features/bouwa or GuidedProposalWizard', () => {
  const files = listFiles(FEATURE_ROOT).filter((file) =>
    /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('features/bouwa'), false, file);
    assert.equal(text.includes('GuidedProposalWizard'), false, file);
    assert.equal(text.includes('SiteLocationCapture'), false, file);
    assert.equal(text.includes('/api/bouwa'), false, file);
  }
});

test('known machine locations are suggested without inventing a site master', () => {
  assert.deepEqual(
    uniqueKnownLocations([
      { currentLocation: 'Rosslyn' },
      { currentLocation: ' rosslyn ' },
      { currentLocation: 'Doornfontein' },
      { currentLocation: '' },
    ]),
    ['Doornfontein', 'Rosslyn'],
  );
});
