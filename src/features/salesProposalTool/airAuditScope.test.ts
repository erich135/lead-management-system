import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_AIR_AUDIT_SCOPE,
  normaliseAirAuditScope,
  SITE_HEADER_MEASURED_HEADING,
} from './airAuditScope.ts';
import { draftsFromCurrentEquipment, toCurrentEquipmentPayload } from './equipmentState.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('Air Audit scope defaults to site / common header and can select one compressor', () => {
  assert.deepEqual(normaliseAirAuditScope(undefined, ['m1']), DEFAULT_AIR_AUDIT_SCOPE);
  assert.deepEqual(normaliseAirAuditScope({ type: 'single_machine' }, ['only']), {
    type: 'single_machine',
    currentEquipmentId: 'only',
  });
  assert.deepEqual(normaliseAirAuditScope({ type: 'single_machine' }, ['m1', 'm2']), {
    type: 'single_machine',
    currentEquipmentId: null,
  });
  assert.deepEqual(
    normaliseAirAuditScope({ type: 'site_header', currentEquipmentId: 'm1' }, ['m1']),
    { type: 'site_header', currentEquipmentId: null },
  );
  assert.equal(SITE_HEADER_MEASURED_HEADING, 'Measured site air demand');
});

test('draft keys persist as current equipment ids for Air Audit association', () => {
  const payload = toCurrentEquipmentPayload([
    {
      key: 'machine-keep',
      arsMachineId: null,
      make: 'Atlas Copco',
      model: 'GA250',
      serialNumber: 'ABC123',
      specLibraryRecordId: 'lib-1',
      selectedSpec: null,
      changingSpec: false,
      sourceBacked: null,
      capturingSheet: false,
    },
  ]);
  assert.equal(payload[0].id, 'machine-keep');
  const drafts = draftsFromCurrentEquipment(payload);
  assert.equal(drafts[0].key, 'machine-keep');
});

test('editor asks a compact scope question after CSV upload without blocking the upload', () => {
  const editor = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
    'utf8',
  );
  const fields = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/AirAuditScopeFields.tsx'),
    'utf8',
  );
  assert.match(editor, /AirAuditScopeFields/);
  assert.match(editor, /proposal\.airAudit &&/);
  assert.match(editor, /airAuditScope/);
  assert.doesNotMatch(editor, /disabled=\{.*currentEquipment/);
  assert.match(fields, /What does this Air Audit measure\?/);
  assert.match(fields, /One compressor/);
  assert.match(fields, /Site \/ common air header/);
  assert.match(fields, /Which machine was measured\?/);
  assert.match(
    fields,
    /Select the measured current machine below before using machine-specific performance comparisons/,
  );
  assert.doesNotMatch(fields, /disabled/);
});

test('an attached Air Audit can be explicitly removed from the proposal', () => {
  const editor = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
    'utf8',
  );
  const upload = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/AirAuditUpload.tsx'),
    'utf8',
  );
  const api = fs.readFileSync(path.join(FEATURE_ROOT, 'api.ts'), 'utf8');
  assert.match(editor, /handleRemoveAirAudit/);
  assert.match(editor, /Air Audit removed\./);
  assert.match(upload, /Remove Air Audit/);
  assert.match(api, /method: 'DELETE'/);
  assert.match(api, /proposals\/\$\{id\}\/air-audit/);
});

test('customer proposal uses backend measured heading and stays on two pages', () => {
  const preview = fs.readFileSync(
    path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
    'utf8',
  );
  assert.match(preview, /doc\.airAudit\.measuredHeading/);
  assert.doesNotMatch(preview, /Current machine measured airflow/);
  assert.match(preview, /spt-customer-proposal-page-2/);
  assert.doesNotMatch(preview, /spt-customer-proposal-page-3/);
  assert.doesNotMatch(preview, /degradation/i);
});

test('TODO 4 does not add degradation, evidence, workflow or a new collection', () => {
  const files = listFiles(FEATURE_ROOT).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(/calcDegradation|degradationPercent|publishedVsMeasured/i.test(text), false, file);
    assert.equal(text.includes('evidenceStatus'), false, file);
    assert.equal(text.includes('readinessEngine'), false, file);
    assert.equal(text.includes('measurementPoint'), false, file);
    assert.equal(text.includes('GuidedProposalWizard'), false, file);
  }
});
