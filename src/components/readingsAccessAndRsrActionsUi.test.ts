import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

const dashboardSource = source('./Dashboard.tsx');
const mobileNavSource = source('./MobileNavigation.tsx');
const machinesSource = source('./Machines.tsx');
const pendingReadingsSource = source('./PendingMachineReadings.tsx');
const appSource = source('../App.tsx');
const historySource = source('./MachineActivityHistory.tsx');
const modalSource = source('./MachineRSRMetadataEditModal.tsx');

// ---------------------------------------------------------------------------
// ARS-READINGS-ACCESS-001
// ---------------------------------------------------------------------------

test('1 QR Readings is visible to every authenticated user, not gated on a permission, in both nav surfaces', () => {
  assert.match(dashboardSource, /\{canAccessMachineReadingWorkflow\(user\) && \(\s*<Link\s*to="\/pending-machine-readings"/);
  assert.doesNotMatch(
    dashboardSource.slice(dashboardSource.indexOf('to="/pending-machine-readings"') - 200, dashboardSource.indexOf('to="/pending-machine-readings"')),
    /hasPermission\('machines\.verifyReadings'\)/,
  );
  assert.match(mobileNavSource, /const canVerifyReadings = canAccessMachineReadingWorkflow\(user\);/);
});

test('2 Verify Readings tab on the Machines page is visible to every authenticated user', () => {
  assert.match(machinesSource, /const canVerifyReadings = canAccessMachineReadingWorkflow\(user\);/);
  assert.match(machinesSource, /\{canVerifyReadings && \(/);
  assert.match(machinesSource, /Verify Readings/);
});

test('3 Approve, 4 Edit hours and 5 Reject all appear once the reading-access check passes', () => {
  assert.match(pendingReadingsSource, /const canVerify = canAccessMachineReadingWorkflow\(user\);/);
  const pendingTabBlock = pendingReadingsSource.slice(
    pendingReadingsSource.indexOf("{tab === 'pending' && ("),
  );
  assert.match(pendingTabBlock, />\s*Approve\s*<\/button>/);
  assert.match(pendingTabBlock, /Edit hours/);
  assert.match(pendingTabBlock, />\s*Reject\s*<\/button>/);
  // The queue and its actions are unconditionally rendered for any user for
  // whom `canVerify` is true — no extra machines.manage or other permission
  // check gates the buttons themselves.
  assert.doesNotMatch(pendingTabBlock, /hasPermission\(/);
});

test('6 unauthenticated users never reach the reading routes — the route is auth-gated, not open', () => {
  const routeBlock = appSource.slice(
    appSource.indexOf('path="/pending-machine-readings"'),
    appSource.indexOf('path="/pending-machine-readings"') + 120,
  );
  assert.match(routeBlock, /<ProtectedRoute>/);
  assert.match(appSource, /return user \? <>\{children\}<\/> : <Navigate to="\/login" replace \/>;/);
});

test('7 existing management/super-admin users retain the same reading access (no narrowing)', () => {
  // canAccessMachineReadingWorkflow only checks for a signed-in user — a
  // super admin or any other existing authenticated role is still `Boolean(user) === true`.
  const readingAccessSource = source('../lib/readingAccess.ts');
  assert.match(readingAccessSource, /export function canAccessMachineReadingWorkflow\(user: unknown\): boolean \{\s*return Boolean\(user\);\s*\}/);
});

test('7b no unrelated machine-management permission is introduced or widened by the reading-access change', () => {
  for (const permission of [...machinesSource.matchAll(/hasPermission\('([^']+)'\)/g)].map((m) => m[1])) {
    assert.ok(
      ['machines.manage', 'machines.verifyReadings'].includes(permission),
      `unexpected permission referenced in Machines.tsx: ${permission}`,
    );
  }
  // canManageMachines (machines.manage) keeps its own, separate check — the
  // reading-access helper is never combined with it.
  assert.match(machinesSource, /const canManageMachines = isSuperAdmin \|\| hasPermission\('machines\.manage'\);/);
  assert.doesNotMatch(machinesSource, /canAccessMachineReadingWorkflow\([^)]*\)\s*(&&|\|\|)\s*.*machines\.manage/);
});

// ---------------------------------------------------------------------------
// ARS-RSR-HISTORY-ACTIONS-001
// ---------------------------------------------------------------------------

test('8 retained RSR cards show View when the file is available', () => {
  assert.match(historySource, /const view = \(target: RsrHistoryFileUrls\) => window\.open\(target\.viewUrl, '_blank'\)/);
  assert.match(historySource, /<Eye className="h-3\.5 w-3\.5" \/>/);
});

test('9 retained RSR cards show Download when the file is available, preserving the original filename', () => {
  assert.match(historySource, /link\.href = target\.downloadUrl/);
  assert.match(historySource, /link\.download = target\.downloadFileName/);
  assert.match(historySource, /<Download className="h-3\.5 w-3\.5" \/>/);
});

test('10 and 11 Print appears for PDFs and supported images (mime-type driven), 12 hidden otherwise', () => {
  assert.match(historySource, /const printable = isPrintableRsrMimeType\(item\.record\.mimeType\)/);
  assert.match(historySource, /\{printable && \(/);
  assert.match(historySource, /<Printer className="h-3\.5 w-3\.5" \/>/);
  // isPrintableRsrMimeType itself (asserted in readingsAccessAndRsrActions.test.ts)
  // restricts printability to PDF/JPEG/PNG/WebP, so any other mime type hides Print.
});

test('13 File unavailable is displayed cleanly, without any action button, and the card stays visible', () => {
  assert.match(historySource, /if \(!isRsrHistoryFileAvailable\(item\)\) \{/);
  assert.match(historySource, /File unavailable/);
  const unavailableBlock = historySource.slice(
    historySource.indexOf('if (!isRsrHistoryFileAvailable(item)) {'),
    historySource.indexOf('const urls = buildRsrHistoryFileUrls'),
  );
  assert.doesNotMatch(unavailableBlock, /<Eye/);
  assert.doesNotMatch(unavailableBlock, /<Download/);
  assert.doesNotMatch(unavailableBlock, /<Printer/);
  // The unavailable branch only swaps the action badge — records are always
  // rendered via .map, never filtered out of the list.
  assert.doesNotMatch(historySource, /history\.records\.filter\(/);
  assert.match(historySource, /history\.records\.map\(\(item\) => \{/);
});

test('14 no Delete action and 15 no Replace File action exist in the history view or the RSR edit modal', () => {
  for (const src of [historySource, modalSource]) {
    assert.doesNotMatch(src, /handleDeleteRSR|handleDeleteRsr/);
    assert.doesNotMatch(src, /deleteMachineRSR|deleteRSRDocument/i);
    assert.doesNotMatch(src, /replaceFile|replaceRSR|Replace File/i);
    assert.doesNotMatch(src, /method: 'DELETE'/);
  }
});

test('16 the existing RSR metadata Edit affordance remains functional and separate from the new file actions', () => {
  // The Edit modal keeps updating metadata only — it is untouched by this task.
  assert.match(modalSource, /updateMachineRSRMetadata\(machineId, rsr\._id, updates\)/);
  // The new history file actions never call the metadata-edit endpoint.
  assert.doesNotMatch(historySource, /updateMachineRSRMetadata/);
});
