import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVisitRecord,
  createVisitSession,
  parseStoredVisitRecord,
  sessionFromStoredRecord,
} from './visitUtils.ts';

test('selected planner form persists across stored-record restore', () => {
  const session = createVisitSession('appt-generic-1');
  session.notes = 'Captured before choosing a form';
  session.photos = [
    { id: 'photo-1', dataUrl: 'data:image/png;base64,abc', caption: 'Gate' },
  ];
  session.selectedPlannerFormType = 'rfc';

  const record = buildVisitRecord(session, new Date().toISOString(), 42, {
    inProgress: true,
  });
  const serialized = JSON.stringify(record);
  const parsed = parseStoredVisitRecord(serialized);
  assert.ok(parsed);
  const restored = sessionFromStoredRecord('appt-generic-1', parsed);
  assert.equal(restored.selectedPlannerFormType, 'rfc');
  assert.equal(restored.notes, 'Captured before choosing a form');
  assert.equal(restored.photos.length, 1);
  assert.equal(restored.startedAt, session.startedAt);
});

test('notes, photos and start time survive attaching a selected form', () => {
  const session = createVisitSession('appt-generic-2');
  const startedAt = session.startedAt;
  session.notes = 'Site access via side door';
  session.photos = [{ id: 'photo-2', dataUrl: 'data:image/jpeg;base64,xyz', caption: '' }];
  session.selectedPlannerFormType = 'loan_rental';

  const restored = sessionFromStoredRecord(
    'appt-generic-2',
    parseStoredVisitRecord(
      JSON.stringify(buildVisitRecord(session, new Date().toISOString(), 15, { inProgress: true })),
    )!,
  );

  assert.equal(restored.selectedPlannerFormType, 'loan_rental');
  assert.equal(restored.notes, 'Site access via side door');
  assert.equal(restored.photos[0].id, 'photo-2');
  assert.equal(restored.startedAt, startedAt);
});

test('selected custom General Visit form survives stored-record restore', () => {
  const session = createVisitSession('appt-generic-gv');
  session.notes = 'Gate signed in';
  session.selectedPlannerFormType = 'general_visit_site_check';
  session.dynamicForm = {
    formTemplateType: 'general_visit_site_check',
    formTemplateName: 'Site Check',
    formTemplateVersion: 1,
    formSchemaSnapshot: {
      name: 'Site Check',
      title: 'Site Check',
      version: 1,
      publishedAt: new Date().toISOString(),
      fields: [],
    },
    values: { fld_notes: 'All clear' },
  };

  const restored = sessionFromStoredRecord(
    'appt-generic-gv',
    parseStoredVisitRecord(
      JSON.stringify(buildVisitRecord(session, new Date().toISOString(), 20, { inProgress: true })),
    )!,
  );

  assert.equal(restored.selectedPlannerFormType, 'general_visit_site_check');
  assert.equal(restored.dynamicForm?.formTemplateName, 'Site Check');
  assert.equal(restored.notes, 'Gate signed in');
});
