import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

test('production PWA bypasses HTTP cache for sw.js and reloads when a new worker takes over', () => {
  const update = fs.readFileSync(path.join(root, 'pwa', 'pwaUpdate.ts'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.ts'), 'utf8');
  const prompt = fs.readFileSync(path.join(root, 'components', 'PwaUpdatePrompt.tsx'), 'utf8');
  assert.match(update, /updateViaCache:\s*'none'/);
  assert.match(update, /registration\.update\(\)/);
  assert.match(update, /visibilitychange/);
  assert.match(update, /controllerchange/);
  assert.match(update, /window\.location\.reload\(\)/);
  assert.match(update, /SKIP_WAITING/);
  assert.match(update, /shouldWaitForUserUpdate/);
  assert.match(worker, /type === 'SKIP_WAITING'/);
  assert.match(worker, /shouldAutoActivateForMigration/);
  assert.match(worker, /ars-update-protocol/);
  assert.match(worker, /self\.skipWaiting\(\)/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.match(worker, /caches\.delete/);
  assert.match(worker, /registerQuotaErrorCallback/);
  assert.doesNotMatch(worker, /^self\.skipWaiting\(\);/m);
  assert.match(prompt, /mode === 'update'/);
  assert.doesNotMatch(prompt, /A new version of ARS is available/);
  assert.doesNotMatch(prompt, /Dismiss/);
});
