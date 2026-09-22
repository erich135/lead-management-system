import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

test('production PWA bypasses HTTP cache for sw.js and reloads when a new worker takes over', () => {
  const pwa = fs.readFileSync(path.join(root, 'pwa.ts'), 'utf8');
  assert.match(pwa, /updateViaCache:\s*'none'/);
  assert.match(pwa, /registration\.update\(\)/);
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /window\.location\.reload\(\)/);
  assert.match(pwa, /SKIP_WAITING/);
});
