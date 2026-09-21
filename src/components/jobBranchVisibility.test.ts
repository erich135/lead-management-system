import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

test('Jobs page does not auto-filter reps to a single legacy rep code', () => {
  const source = fs.readFileSync(path.join(here, 'LeadsList.tsx'), 'utf8');
  assert.doesNotMatch(source, /Auto-set rep code filter for rep users/);
  assert.doesNotMatch(
    source,
    /user\?\.role\?\.name === 'rep'[\s\S]{0,200}setRepCodeFilter/,
  );
});
