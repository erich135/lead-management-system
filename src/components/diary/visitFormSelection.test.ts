import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VISIT_CHOOSER_FORM_OPTIONS,
  filterVisitChooserPublishedForms,
  getVisitPrimaryActionLabel,
  getVisitStartActionLabel,
  isVisitSystemPlannerFormType,
  plannerFormTypeToSalesRequestType,
  resolveSalesRequestDraftWrite,
  resolveVisitPlannerFormType,
  resolveVisitSalesRequestType,
  resolveVisitWorkspaceSurface,
  visitAllowsNotesPhotosAndSubmit,
  visitNeedsPublishedFormChooser,
} from './visitFormSelection.ts';

test('generic Visit with no selection needs the three-form chooser', () => {
  assert.equal(
    visitNeedsPublishedFormChooser({ appointmentType: 'site_visit' }),
    true,
  );
  assert.equal(
    visitNeedsPublishedFormChooser({ appointmentType: 'site_visit', appointmentStatus: 'in_progress' }),
    true,
  );
  assert.deepEqual(
    VISIT_CHOOSER_FORM_OPTIONS.map((option) => option.type),
    ['rfc', 'loan_rental', 'new_service_level'],
  );
  assert.equal(
    visitAllowsNotesPhotosAndSubmit({
      appointmentType: 'site_visit',
      hasLoadedSheetForm: false,
    }),
    false,
  );
});

test('RFC selection maps to the published RFC form and rfc sales request', () => {
  assert.equal(resolveVisitPlannerFormType('site_visit', 'rfc'), 'rfc');
  assert.equal(plannerFormTypeToSalesRequestType('rfc'), 'rfc');
  assert.equal(resolveVisitSalesRequestType('site_visit', 'rfc'), 'rfc');
});

test('Loan and Rental selection maps to loan_rental planner form and sales request', () => {
  assert.equal(resolveVisitPlannerFormType('site_visit', 'loan_rental'), 'loan_rental');
  assert.equal(plannerFormTypeToSalesRequestType('loan_rental'), 'loan_rental');
  assert.equal(resolveVisitSalesRequestType('site_visit', 'loan_rental'), 'loan_rental');
});

test('New Service Level selection maps to new_service_level planner form and rfc_new_service_level request', () => {
  assert.equal(
    resolveVisitPlannerFormType('site_visit', 'new_service_level'),
    'new_service_level',
  );
  assert.equal(
    plannerFormTypeToSalesRequestType('new_service_level'),
    'rfc_new_service_level',
  );
  assert.equal(
    resolveVisitSalesRequestType('site_visit', 'new_service_level'),
    'rfc_new_service_level',
  );
});

test('chooser is skipped once a usable selection can be restored', () => {
  assert.equal(
    visitNeedsPublishedFormChooser({
      appointmentType: 'site_visit',
      appointmentStatus: 'in_progress',
      selectedPlannerFormType: 'rfc',
    }),
    false,
  );
  assert.equal(isVisitSystemPlannerFormType('rfc'), true);
  assert.equal(isVisitSystemPlannerFormType('custom_other'), false);
});

test('notes, photos and submit stay hidden until the selected sheet has loaded', () => {
  assert.equal(
    visitAllowsNotesPhotosAndSubmit({
      appointmentType: 'site_visit',
      selectedPlannerFormType: 'rfc',
      hasLoadedSheetForm: false,
    }),
    false,
  );
  assert.equal(
    visitAllowsNotesPhotosAndSubmit({
      appointmentType: 'site_visit',
      selectedPlannerFormType: 'rfc',
      hasLoadedSheetForm: true,
    }),
    true,
  );
});

test('existing typed RFC, loan/rental and new service level appointments skip the chooser', () => {
  assert.equal(visitNeedsPublishedFormChooser({ appointmentType: 'rfc' }), false);
  assert.equal(visitNeedsPublishedFormChooser({ appointmentType: 'loan' }), false);
  assert.equal(visitNeedsPublishedFormChooser({ appointmentType: 'rental' }), false);
  assert.equal(visitNeedsPublishedFormChooser({ appointmentType: 'loan_rental' }), false);
  assert.equal(
    visitNeedsPublishedFormChooser({ appointmentType: 'rfc_new_service_level' }),
    false,
  );
  assert.equal(resolveVisitPlannerFormType('rfc'), 'rfc');
  assert.equal(resolveVisitPlannerFormType('loan_rental'), 'loan_rental');
  assert.equal(resolveVisitPlannerFormType('rfc_new_service_level'), 'new_service_level');
  assert.equal(resolveVisitSalesRequestType('loan'), 'loan');
  assert.equal(resolveVisitSalesRequestType('rental'), 'rental');
});

test('dashboard shows Resume Visit for in-progress appointments or restored sessions', () => {
  assert.equal(getVisitStartActionLabel({ appointmentStatus: 'appointment' }), 'Start Visit');
  assert.equal(
    getVisitStartActionLabel({ appointmentStatus: 'in_progress' }),
    'Resume Visit',
  );
  assert.equal(
    getVisitStartActionLabel({ appointmentStatus: 'appointment', hasVisitSession: true }),
    'Resume Visit',
  );
});

test('chooser metadata drops custom forms and keeps the three system forms in order', () => {
  const filtered = filterVisitChooserPublishedForms([
    { type: 'custom_extra', title: 'Custom' },
    { type: 'new_service_level', title: 'NSL published', description: 'SLA body' },
    { type: 'rfc', title: 'RFC published', version: 4 },
  ]);
  assert.deepEqual(
    filtered.map((form) => form.type),
    ['rfc', 'loan_rental', 'new_service_level'],
  );
  assert.equal(filtered[0].title, 'RFC published');
  assert.equal(filtered[1].title, 'Loan and Rental');
  assert.equal(filtered[2].description, 'SLA body');
});

test('closed visits do not reopen the chooser', () => {
  assert.equal(
    visitNeedsPublishedFormChooser({
      appointmentType: 'site_visit',
      appointmentStatus: 'pending_approval',
    }),
    false,
  );
  assert.equal(
    visitNeedsPublishedFormChooser({
      appointmentType: 'site_visit',
      appointmentStatus: 'completed',
      attended: true,
    }),
    false,
  );
});

test('existing in-progress generic Visit without a selection still opens the chooser', () => {
  assert.equal(
    visitNeedsPublishedFormChooser({
      appointmentType: 'site_visit',
      appointmentStatus: 'in_progress',
      attended: false,
    }),
    true,
  );
});

test('Submit for Approval is the primary action after a sheet has loaded', () => {
  assert.equal(
    getVisitPrimaryActionLabel({
      allowsNotesPhotosAndSubmit: false,
      hasLoadedSheetForm: false,
    }),
    null,
  );
  assert.equal(
    getVisitPrimaryActionLabel({
      allowsNotesPhotosAndSubmit: true,
      hasLoadedSheetForm: true,
    }),
    'Submit for Approval',
  );
});

test('retry reuses an existing draft id instead of creating another sales request', () => {
  assert.deepEqual(resolveSalesRequestDraftWrite('req-1', null), {
    action: 'update',
    id: 'req-1',
  });
  assert.deepEqual(resolveSalesRequestDraftWrite(null, 'req-2'), {
    action: 'update',
    id: 'req-2',
  });
  assert.deepEqual(resolveSalesRequestDraftWrite(null, null), { action: 'create' });
});

test('workspace surfaces keep notes hidden until a published form is ready', () => {
  assert.equal(
    resolveVisitWorkspaceSurface({
      appointmentType: 'site_visit',
      hasLoadedSheetForm: false,
    }),
    'chooser',
  );
  assert.equal(
    resolveVisitWorkspaceSurface({
      appointmentType: 'site_visit',
      hasLoadedSheetForm: false,
      chooserError: 'offline',
    }),
    'chooser_error',
  );
  assert.equal(
    resolveVisitWorkspaceSurface({
      appointmentType: 'site_visit',
      selectedPlannerFormType: 'rfc',
      hasLoadedSheetForm: false,
    }),
    'form_loading',
  );
  assert.equal(
    resolveVisitWorkspaceSurface({
      appointmentType: 'site_visit',
      selectedPlannerFormType: 'loan_rental',
      hasLoadedSheetForm: false,
      templateLoadError: 'failed',
    }),
    'form_error',
  );
  assert.equal(
    resolveVisitWorkspaceSurface({
      appointmentType: 'rfc',
      hasLoadedSheetForm: true,
    }),
    'workspace',
  );
});

test('chooser cards are large enough for a mobile viewport', () => {
  assert.equal(VISIT_CHOOSER_FORM_OPTIONS.length, 3);
  for (const option of VISIT_CHOOSER_FORM_OPTIONS) {
    assert.ok(option.title.length > 0);
    assert.ok(option.description.length > 0);
  }
});
