import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessMachineReadingWorkflow } from './readingAccess.ts';
import {
  buildRsrHistoryFileUrls,
  isPrintableRsrMimeType,
  isRsrHistoryFileAvailable,
  isRsrHistoryRecordType,
  PRINTABLE_RSR_MIME_TYPES,
} from './machineActivityHistory.ts';

// ---------------------------------------------------------------------------
// ARS-READINGS-ACCESS-001
// ---------------------------------------------------------------------------

test('reading access — any truthy (authenticated) user is allowed', () => {
  assert.equal(canAccessMachineReadingWorkflow({ _id: 'u1' }), true);
  assert.equal(canAccessMachineReadingWorkflow({ _id: 'u1', isSuperAdmin: true }), true);
  assert.equal(canAccessMachineReadingWorkflow({}), true);
});

test('reading access — an unauthenticated (null/undefined) user is rejected', () => {
  assert.equal(canAccessMachineReadingWorkflow(null), false);
  assert.equal(canAccessMachineReadingWorkflow(undefined), false);
});

// ---------------------------------------------------------------------------
// ARS-RSR-HISTORY-ACTIONS-001
// ---------------------------------------------------------------------------

const urlHelpers = {
  machineRSRUrl: (machineId: string, rsrId: string) =>
    `https://api.example.test/api/machines/${machineId}/rsr/${rsrId}`,
  rsrDocumentUrl: (documentId: string) =>
    `https://api.example.test/api/rsr-documents/${documentId}?token=job-token`,
};

test('rsr history — only retained RSR history record types are recognised', () => {
  assert.equal(isRsrHistoryRecordType('machineRsr'), true);
  assert.equal(isRsrHistoryRecordType('jobRsr'), true);
  assert.equal(isRsrHistoryRecordType('job'), false);
  assert.equal(isRsrHistoryRecordType('activity'), false);
  assert.equal(isRsrHistoryRecordType('reading'), false);
  assert.equal(isRsrHistoryRecordType('noteAttachment'), false);
});

test('rsr history — print is only offered for the browser-previewable formats', () => {
  for (const mimeType of PRINTABLE_RSR_MIME_TYPES) {
    assert.equal(isPrintableRsrMimeType(mimeType), true);
  }
  assert.equal(isPrintableRsrMimeType('APPLICATION/PDF'), true);
  assert.equal(isPrintableRsrMimeType('image/jpeg'), true);
  assert.equal(isPrintableRsrMimeType('image/png'), true);
  assert.equal(isPrintableRsrMimeType('image/webp'), true);
  assert.equal(isPrintableRsrMimeType('application/msword'), false);
  assert.equal(isPrintableRsrMimeType('application/vnd.ms-excel'), false);
  assert.equal(isPrintableRsrMimeType(undefined), false);
  assert.equal(isPrintableRsrMimeType(42), false);
});

test('rsr history — a record is "available" only once the backend confirmed its file', () => {
  assert.equal(isRsrHistoryFileAvailable({ type: 'machineRsr', file: { filename: 'a.pdf' } }), true);
  assert.equal(isRsrHistoryFileAvailable({ type: 'jobRsr', file: { filename: 'a.pdf' } }), true);
  assert.equal(isRsrHistoryFileAvailable({ type: 'machineRsr' }), false);
  assert.equal(isRsrHistoryFileAvailable({ type: 'jobRsr', file: undefined }), false);
  // Non-RSR types never get file actions from this feature, even with a `file`.
  assert.equal(isRsrHistoryFileAvailable({ type: 'noteAttachment', file: { filename: 'a.pdf' } }), false);
});

test('rsr history — machine RSR URLs reuse the existing authorised machine RSR endpoint', () => {
  const urls = buildRsrHistoryFileUrls(
    { type: 'machineRsr', record: { _id: 'rsr-1', fileName: 'meter-reading.pdf' } },
    'canonical-machine-1',
    'jwt-token-abc',
    urlHelpers,
  );
  assert.ok(urls);
  assert.equal(
    urls!.viewUrl,
    'https://api.example.test/api/machines/canonical-machine-1/rsr/rsr-1?token=jwt-token-abc&inline=1',
  );
  assert.equal(
    urls!.downloadUrl,
    'https://api.example.test/api/machines/canonical-machine-1/rsr/rsr-1?token=jwt-token-abc',
  );
  assert.equal(urls!.downloadFileName, 'meter-reading.pdf');
  // No raw storage path, credential, or bucket identifier is embedded in the URL.
  assert.doesNotMatch(urls!.viewUrl, /gridfs|bucket|s3:\/\//i);
});

test('rsr history — job RSR URLs reuse the existing authorised job RSR endpoint and its own filename fields', () => {
  const urls = buildRsrHistoryFileUrls(
    { type: 'jobRsr', record: { _id: 'job-rsr-1', originalName: 'site-report.jpg' } },
    'canonical-machine-1',
    'jwt-token-abc',
    urlHelpers,
  );
  assert.ok(urls);
  assert.equal(urls!.viewUrl, 'https://api.example.test/api/rsr-documents/job-rsr-1?token=job-token&inline=1');
  assert.equal(urls!.downloadUrl, 'https://api.example.test/api/rsr-documents/job-rsr-1?token=job-token');
  assert.equal(urls!.downloadFileName, 'site-report.jpg');

  const fallback = buildRsrHistoryFileUrls(
    { type: 'jobRsr', record: { _id: 'job-rsr-2', fileName: 'fallback.png' } },
    'canonical-machine-1',
    'jwt-token-abc',
    urlHelpers,
  );
  assert.equal(fallback!.downloadFileName, 'fallback.png');
});

test('rsr history — no URL is built for a non-RSR record, a missing id, or a missing machine id', () => {
  assert.equal(
    buildRsrHistoryFileUrls({ type: 'activity', record: { _id: 'a1' } }, 'm1', 't', urlHelpers),
    null,
  );
  assert.equal(
    buildRsrHistoryFileUrls({ type: 'machineRsr', record: {} }, 'm1', 't', urlHelpers),
    null,
  );
  assert.equal(
    buildRsrHistoryFileUrls(
      { type: 'machineRsr', record: { _id: 'rsr-1', fileName: 'a.pdf' } },
      '',
      't',
      urlHelpers,
    ),
    null,
  );
});
