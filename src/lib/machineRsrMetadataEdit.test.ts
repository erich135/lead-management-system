import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EDITABLE_MACHINE_RSR_FIELDS,
  changedFields,
  initialForm,
  missingRequiredField,
  permittedMetadataPayload,
  type FormState,
} from './machineRsrMetadataEdit.ts';

const uploadedRsr = {
  workDate: '2026-05-01T00:00:00.000Z',
  rsrNumber: 'RSR-1000',
  jobNumber: 'J-1000',
  poNumber: 'PO-1000',
  invNumber: 'INV-1000',
  quoteDate: '2026-04-20T00:00:00.000Z',
  value: 1500,
  tech: 'Original Tech',
  hoursWorked: 4,
  description: 'Original description',
  comments: 'Original comments',
};

test('2 existing values populate the edit form', () => {
  const form = initialForm(uploadedRsr);

  assert.equal(form.workDate, '2026-05-01');
  assert.equal(form.quoteDate, '2026-04-20');
  assert.equal(form.rsrNumber, 'RSR-1000');
  assert.equal(form.jobNumber, 'J-1000');
  assert.equal(form.poNumber, 'PO-1000');
  assert.equal(form.invNumber, 'INV-1000');
  assert.equal(form.value, '1500');
  assert.equal(form.tech, 'Original Tech');
  assert.equal(form.hoursWorked, '4');
  assert.equal(form.description, 'Original description');
  assert.equal(form.comments, 'Original comments');
});

test('2b an RSR with no report metadata populates empty rather than undefined', () => {
  const form = initialForm({});
  for (const field of EDITABLE_MACHINE_RSR_FIELDS) {
    assert.equal(form[field], '', `${field} should be an empty string`);
  }
  assert.equal(initialForm({ workDate: 'not-a-date' }).workDate, '');
});

test('3 saving sends only the permitted fields that actually changed', () => {
  const original = initialForm(uploadedRsr);
  const edited: FormState = { ...original, tech: 'Corrected Tech', hoursWorked: '7.5' };

  const updates = changedFields(edited, original);

  assert.deepEqual(updates, { tech: 'Corrected Tech', hoursWorked: 7.5 });
  // Untouched fields are omitted entirely.
  assert.equal('rsrNumber' in updates, false);
  assert.equal('workDate' in updates, false);
});

test('3b an unchanged form sends nothing', () => {
  const original = initialForm(uploadedRsr);
  assert.deepEqual(changedFields({ ...original }, original), {});
});

test('3c a cleared optional field is sent as an explicit null', () => {
  const original = initialForm(uploadedRsr);
  const edited: FormState = { ...original, comments: '   ' };
  assert.deepEqual(changedFields(edited, original), { comments: null });
});

test('5 file identity, uploader and upload date can never be sent', () => {
  const forbidden = [
    'title',
    'visibility',
    'fileName',
    'fileUrl',
    'fileSize',
    'mimeType',
    'uploadedBy',
    'uploadedAt',
    'jobId',
    'currentHours',
    'nextServiceHours',
    'nextServiceDate',
    '_id',
  ];
  for (const field of forbidden) {
    assert.equal(
      (EDITABLE_MACHINE_RSR_FIELDS as readonly string[]).includes(field),
      false,
      `${field} must not be editable`,
    );
  }

  const payload = permittedMetadataPayload({
    tech: 'Corrected Tech',
    fileName: 'attacker.pdf',
    fileUrl: 'deadbeefdeadbeefdeadbeef',
    uploadedBy: 'someone-else',
    uploadedAt: '2020-01-01T00:00:00.000Z',
    title: 'Renamed',
    _id: 'other-id',
  });
  assert.deepEqual(payload, { tech: 'Corrected Tech' });
});

test('7 a required field may be corrected but not emptied', () => {
  const original = initialForm(uploadedRsr);
  assert.equal(missingRequiredField(original), undefined);
  assert.equal(missingRequiredField({ ...original, workDate: '' }), 'workDate');
  assert.equal(
    missingRequiredField({ ...original, workDate: '2026-06-02' }),
    undefined,
  );
  // Clearing an optional field is allowed.
  assert.equal(missingRequiredField({ ...original, comments: '' }), undefined);
});
