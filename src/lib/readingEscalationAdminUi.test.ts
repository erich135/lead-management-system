import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const systemSource = readFileSync(
  fileURLToPath(new URL('../components/SystemManagement.tsx', import.meta.url)),
  'utf8',
);
const apiSource = readFileSync(
  fileURLToPath(new URL('./api.ts', import.meta.url)),
  'utf8',
);
const importSource = readFileSync(
  fileURLToPath(new URL('../components/ReadingEscalationAdminImport.tsx', import.meta.url)),
  'utf8',
);

test('System Admin shows Reading Escalation Admin and Super-Admin-only bulk tools', () => {
  assert.match(systemSource, /Reading Escalation Admin/);
  assert.match(systemSource, /Export Reading Admin Assignments/);
  assert.match(systemSource, /Import Reading Admin Assignments/);
  assert.match(systemSource, /assignReadingEscalationAdmin/);
  assert.match(systemSource, /isSuperAdmin/);
  assert.match(systemSource, /customerUpdatePayload\(editingCustomer\)/);
  assert.doesNotMatch(
    systemSource,
    /updateCustomer\([^)]*readingEscalationAdminUserId/,
  );
});

test('frontend APIs call the Super-Admin reading-escalation-admin routes', () => {
  assert.match(apiSource, /\/api\/reading-escalation-admin\/admins/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/export/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/import\/validate/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/import\/confirm/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/customers\//);
});

test('importer requires dry-run acknowledgement before Confirm Import', () => {
  assert.match(importSource, /I have reviewed this dry-run/);
  assert.match(importSource, /Confirm Import/);
  assert.match(importSource, /disabled=\{!acknowledged/);
  assert.match(importSource, /Download result report/);
  assert.match(importSource, /Customer ID/);
});
