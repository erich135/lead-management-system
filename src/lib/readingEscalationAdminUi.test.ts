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

test('System Admin shows Reading Escalation Admin Code and Super-Admin-only bulk tools', () => {
  assert.match(systemSource, /Reading Escalation Admin Code/);
  assert.match(systemSource, /Export Customer Admin Codes/);
  assert.match(systemSource, /Import Customer Admin Codes/);
  assert.match(systemSource, /assignReadingEscalationAdminCode/);
  assert.match(systemSource, /isSuperAdmin/);
  assert.match(systemSource, /customerUpdatePayload\(editingCustomer\)/);
  assert.match(systemSource, /disabled=\{!code\.eligible\}/);
  assert.match(systemSource, /readingAdminCodes\.map\(code =>/);
  assert.doesNotMatch(systemSource, /readingAdminCodes\.filter/);
  assert.doesNotMatch(systemSource, /readingEscalationAdminUserId/);
  assert.doesNotMatch(systemSource, /Export Reading Admin Assignments/);
  assert.doesNotMatch(
    systemSource,
    /updateCustomer\([^)]*readingEscalationAdminCodeId/,
  );
});

test('frontend APIs call the Super-Admin Admin Code routes', () => {
  assert.match(apiSource, /\/api\/reading-escalation-admin\/codes/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/export/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/import\/validate/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/import\/confirm/);
  assert.match(apiSource, /\/api\/reading-escalation-admin\/customers\//);
  assert.match(apiSource, /body: JSON\.stringify\(\{ adminCodeId \}\)/);
  assert.doesNotMatch(apiSource, /\/api\/reading-escalation-admin\/admins/);
  assert.doesNotMatch(apiSource, /readingEscalationAdminUserId/);
});

test('importer requires dry-run acknowledgement before Confirm Import', () => {
  assert.match(importSource, /Import Customer Admin Codes/);
  assert.match(importSource, /I have reviewed this dry-run/);
  assert.match(importSource, /Confirm Import/);
  assert.match(importSource, /disabled=\{!acknowledged/);
  assert.match(importSource, /Download result report/);
  assert.match(importSource, /Customer ID/);
  assert.match(importSource, /currentAdminCode/);
  assert.match(importSource, /proposedAdminCode/);
  assert.match(importSource, /proposedLinkedRecipient/);
  assert.doesNotMatch(importSource, /Assignment Snapshot/);
  assert.doesNotMatch(importSource, /Stale rows/);
  assert.doesNotMatch(systemSource, /Rental Department inbox/);
  assert.match(systemSource, /Rental machines use Admin Code REN/);
  assert.doesNotMatch(systemSource, /linked Admin user/);
  assert.doesNotMatch(systemSource, /Linked User is not an ARS Admin/);
  assert.doesNotMatch(importSource, /Linked User is not an ARS Admin/);
  assert.doesNotMatch(systemSource, /rentalsjhb@airrotoryservices\.co\.za/);
  assert.doesNotMatch(importSource, /rentalsjhb@airrotoryservices\.co\.za/);
});
