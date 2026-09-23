import assert from 'node:assert/strict';
import test from 'node:test';
import type { SalesRequestSubmission } from '../lib/api.ts';
import {
  EXISTING_RECORD_CAPTURE_NOTE,
  NO_RECORDED_HISTORY_MESSAGE,
  formatHistoryValue,
  historyEmptyState,
  readRecordedGps,
  readableFieldPath,
  selectSalesRequestSubmission,
  submissionOutcomeLabel,
} from './salesRequestHistoryView.ts';

function version(partial: Partial<SalesRequestSubmission> & { version: number }): SalesRequestSubmission {
  return {
    _id: String(partial.version),
    salesRequestId: 'req-1',
    captureSource: 'submission',
    submittedAt: '2026-09-19T10:00:00.000Z',
    requestType: 'general_visit',
    submittedFormData: { notes: `v${partial.version}` },
    attachmentRefs: [],
    adminEdits: [],
    outcome: 'pending',
    ...partial,
  };
}

test('empty history is labelled as not recorded', () => {
  assert.equal(historyEmptyState({ historyRecorded: false, submissions: [] }), NO_RECORDED_HISTORY_MESSAGE);
  assert.equal(selectSalesRequestSubmission([], 1), null);
});

test('version selection inspects the chosen snapshot and keeps earlier content', () => {
  const submissions = [
    version({
      version: 1,
      submittedFormData: { notes: 'first' },
      outcome: 'declined',
      declineReason: 'Missing plant number',
    }),
    version({
      version: 2,
      submittedFormData: { notes: 'second' },
      outcome: 'approved',
    }),
  ];
  const first = selectSalesRequestSubmission(submissions, 1);
  const second = selectSalesRequestSubmission(submissions, 2);
  assert.equal(first?.submittedFormData.notes, 'first');
  assert.equal(first?.outcome, 'declined');
  assert.equal(second?.submittedFormData.notes, 'second');
  assert.equal(selectSalesRequestSubmission(submissions)?.version, 2);
});

test('legacy captures are labelled as existing-record, not original submission', () => {
  const captured = version({
    version: 1,
    captureSource: 'existing_record',
    capturedFromExistingRecord: true,
    captureNote: EXISTING_RECORD_CAPTURE_NOTE,
  });
  assert.equal(captured.captureNote, EXISTING_RECORD_CAPTURE_NOTE);
  assert.equal(submissionOutcomeLabel('approved'), 'Approved');
  assert.equal(submissionOutcomeLabel('accepted_no_job'), 'Accepted — no job created');
  assert.equal(submissionOutcomeLabel('declined'), 'Rejected');
  const formatted = formatHistoryValue({
    plant: 'P-12',
    formSchemaSnapshot: { fields: [{ id: 'fld_secret' }] },
    _id: '507f1f77bcf86cd799439011',
  });
  assert.equal(formatted.includes('P-12'), true);
  assert.equal(formatted.includes('{'), false);
  assert.equal(formatted.includes('fld_secret'), false);
  assert.equal(formatted.includes('507f1f77bcf86cd799439011'), false);
  assert.equal(readableFieldPath('formData.values.fld_otherRequirements'), 'Other Requirements');
});

test('recorded GPS uses the visit card fields and drops stored attendance payloads', () => {
  const gps = readRecordedGps({
    visitGpsVerification: {
      verified: true,
      latitude: -26.183329,
      longitude: 28.228386,
      accuracyMeters: 10,
      address: '2 Romeo St',
      capturedBy: '507f1f77bcf86cd799439011',
      appointmentId: '507f1f77bcf86cd799439012',
    },
    attendanceLocation: { type: 'Point', coordinates: [28.228386, -26.183329] },
  });
  assert.equal(gps?.latitude, -26.183329);
  assert.equal(gps?.address, '2 Romeo St');
  assert.equal(Object.prototype.hasOwnProperty.call(gps, 'capturedBy'), false);
  assert.equal(readRecordedGps({ attendanceLocation: { type: 'Point', coordinates: [1, 2] } }), null);
});
