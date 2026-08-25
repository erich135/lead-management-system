import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canShowAcceptWithoutJob,
  getApprovedJobNumber,
  getSalesRequestOutcomeLabel,
  isAcceptedWithoutJob,
} from '../../constants/salesRequestPermissions.ts';
import { validateSalesRequestForm } from '../../utils/salesRequestValidation.ts';

test('Accept without creating a job is visible only for pending General Visit', () => {
  assert.equal(
    canShowAcceptWithoutJob({ requestType: 'general_visit', status: 'pending' }),
    true,
  );
  for (const requestType of ['rfc', 'loan_rental', 'rfc_new_service_level', 'loan', 'rental']) {
    assert.equal(
      canShowAcceptWithoutJob({ requestType, status: 'pending' }),
      false,
      requestType,
    );
  }
});

test('history outcomes distinguish approved job, accepted no job, and rejected', () => {
  assert.equal(
    getSalesRequestOutcomeLabel({
      status: 'approved',
      approvalOutcome: 'job_created',
      approvedJob: { jobNumber: 'J-1' },
    }),
    'Approved',
  );
  assert.equal(getApprovedJobNumber({ jobNumber: 'J-1' }), 'J-1');
  assert.equal(
    getSalesRequestOutcomeLabel({
      status: 'approved',
      acceptedWithoutJob: true,
      approvalOutcome: 'accepted_no_job',
    }),
    'Accepted — no job created',
  );
  assert.equal(isAcceptedWithoutJob({ acceptedWithoutJob: true }), true);
  assert.equal(getSalesRequestOutcomeLabel({ status: 'declined' }), 'Rejected');
});

test('General Visit required-field validation uses the published schema', () => {
  const missing = validateSalesRequestForm('general_visit', {
    formTemplateType: 'general_visit_site_check',
    formTemplateName: 'Site Check',
    formSchemaSnapshot: {
      fields: [{ id: 'fld_a', label: 'Plant number', required: true, enabled: true }],
    },
    values: { fld_a: '' },
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.missingFields.includes('Plant number'));

  const complete = validateSalesRequestForm('general_visit', {
    formTemplateType: 'general_visit_site_check',
    formTemplateName: 'Site Check',
    formSchemaSnapshot: {
      fields: [{ id: 'fld_a', label: 'Plant number', required: true, enabled: true }],
    },
    values: { fld_a: 'P-12' },
  });
  assert.equal(complete.valid, true);
});

test('RFC, Loan and Rental, and New Service Level validation still run', () => {
  assert.equal(validateSalesRequestForm('rfc', {}).valid, false);
  assert.equal(validateSalesRequestForm('loan_rental', {}).valid, false);
  assert.equal(validateSalesRequestForm('rfc_new_service_level', {}).valid, false);
});
