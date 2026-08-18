import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const machinesSource = readFileSync(
  fileURLToPath(new URL('../components/Machines.tsx', import.meta.url)),
  'utf8',
);
const modalSource = readFileSync(
  fileURLToPath(
    new URL('../components/MachineRSRMetadataEditModal.tsx', import.meta.url),
  ),
  'utf8',
);
const apiSource = readFileSync(
  fileURLToPath(new URL('./api.ts', import.meta.url)),
  'utf8',
);

test('1 the Edit control is gated on the existing machines.manage permission', () => {
  assert.match(
    machinesSource,
    /const canManageMachines = isSuperAdmin \|\| hasPermission\('machines\.manage'\)/,
  );
  // The control is hidden without permission, on a retired row, and for
  // job-sourced RSRs, which are not machine-native records.
  assert.match(
    machinesSource,
    /canEditRSRMetadata = \(rsr: MachineRSR, isReadOnlyMachine: boolean\) =>\s*canManageMachines && !isReadOnlyMachine && rsr\.source !== 'job'/,
  );
  assert.match(
    machinesSource,
    /\{canEditRSRMetadata\(rsr, isReadOnlyMachine\) && \(/,
  );
  assert.match(machinesSource, /handleEditRSR\(rsr, rsrContext\)/);
  assert.match(machinesSource, /aria-label="Edit RSR details"/);
});

test('1b no new role or permission name is introduced', () => {
  const permissions = [
    ...machinesSource.matchAll(/hasPermission\('([^']+)'\)/g),
  ].map((match) => match[1]);
  for (const permission of permissions) {
    assert.ok(
      ['machines.manage', 'machines.verifyReadings'].includes(permission),
      `unexpected permission ${permission}`,
    );
  }
  assert.doesNotMatch(machinesSource, /rsr\.(edit|manage)/);
});

test('4 a successful save refreshes the displayed RSR values in place', () => {
  assert.match(machinesSource, /onSaved=\{handleRSRMetadataSaved\}/);
  assert.match(
    machinesSource,
    /setMachineRSRs\(\(current\) =>\s*current\.map\(\(candidate\) =>\s*candidate\._id === updated\._id \? \{ \.\.\.candidate, \.\.\.updated \} : candidate,/,
  );
  // The open preview reflects the correction too, so no stale row remains.
  assert.match(machinesSource, /setPreviewRSR\(\(current\) =>/);
  assert.match(machinesSource, /setEditingRSR\(null\)/);
});

test('5 the original file, uploader and upload date are shown read-only', () => {
  assert.match(modalSource, /Original upload — cannot be changed/);
  assert.match(modalSource, /Uploaded by:/);
  assert.match(modalSource, /Upload date:/);
  assert.match(modalSource, /Uploaded title:/);
  // Read-only evidence is rendered as description list text, never as inputs.
  const evidenceFields = ['fileName', 'fileSize', 'mimeType', 'uploadedAt', 'title'];
  for (const field of evidenceFields) {
    assert.doesNotMatch(
      modalSource,
      new RegExp(`value=\\{form\\.${field}\\}`),
      `${field} must not be bound to an editable input`,
    );
  }
  assert.doesNotMatch(modalSource, /type="file"/);
});

test('6 the edit surface adds no delete and no replace-file control', () => {
  for (const source of [machinesSource, modalSource]) {
    assert.doesNotMatch(source, /handleDeleteRSR/);
    assert.doesNotMatch(source, /deleteMachineRSR/);
    assert.doesNotMatch(source, /deleteRSRDocument/);
    assert.doesNotMatch(source, /replaceFile|replaceRSR/i);
  }
  assert.doesNotMatch(modalSource, /method: 'DELETE'/);
  assert.doesNotMatch(
    apiSource,
    /rsr\/\$\{rsrId\}\/metadata[\s\S]{0,160}method: 'DELETE'/,
  );
});

test('7 a failed save keeps the form values and surfaces the error', () => {
  // The catch block only sets an error; it never resets form state or closes.
  assert.match(
    modalSource,
    /catch \(caught\) \{[\s\S]*?setError\([\s\S]*?\)\;[\s\S]*?\} finally \{/,
  );
  const catchBlock = modalSource.slice(
    modalSource.indexOf('} catch (caught) {'),
    modalSource.indexOf('} finally {'),
  );
  assert.doesNotMatch(catchBlock, /setForm/);
  assert.doesNotMatch(catchBlock, /onSaved/);
  assert.doesNotMatch(catchBlock, /onCancel/);
  // onSaved runs only on the success path.
  const successBlock = modalSource.slice(
    modalSource.indexOf('const updated = await updateMachineRSRMetadata'),
    modalSource.indexOf('} catch (caught) {'),
  );
  assert.match(successBlock, /onSaved\(updated\)/);
  assert.match(modalSource, /role="alert"/);
});

test('the endpoint is a metadata-only PATCH against the canonical machine route', () => {
  assert.match(
    apiSource,
    /\/api\/machines\/\$\{machineId\}\/rsr\/\$\{rsrId\}\/metadata`,\s*\{\s*method: 'PATCH'/,
  );
  assert.match(apiSource, /const permitted = permittedMetadataPayload\(updates\)/);
  assert.match(apiSource, /body: JSON\.stringify\(permitted\)/);
  assert.match(
    modalSource,
    /updateMachineRSRMetadata\(machineId, rsr\._id, updates\)/,
  );
});
