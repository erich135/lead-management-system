import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generalVisitFormStatusLabel,
  isGeneralVisitAdminForm,
  isPlannerFormVisibleToRepresentatives,
  splitAdminPlannerForms,
} from './plannerFormEditorUtils.ts';
import type { PlannerFormAdminTemplate } from '../../lib/api';

function template(
  overrides: Partial<PlannerFormAdminTemplate> & { type: string },
): PlannerFormAdminTemplate {
  return {
    draft: { name: overrides.type, title: overrides.type, fields: [] },
    published: null,
    hasUnpublishedChanges: true,
    isActive: true,
    isSystem: false,
    ...overrides,
  };
}

test('Form Editor keeps RFC, Loan and Rental, and New Service Level as system forms', () => {
  const { systemForms, generalVisitForms } = splitAdminPlannerForms([
    template({
      type: 'rfc',
      isSystem: true,
      formCategory: 'system',
      published: {
        name: 'RFC',
        title: 'RFC',
        fields: [],
        version: 1,
        publishedAt: '2026-01-01',
      },
    }),
    template({
      type: 'general_visit_walk',
      formCategory: 'general_visit',
      draft: { name: 'Walk', title: 'Walk', fields: [] },
    }),
  ]);
  assert.deepEqual(
    systemForms.map((form) => form.type),
    ['rfc', 'loan_rental', 'new_service_level'],
  );
  assert.deepEqual(
    generalVisitForms.map((form) => form.type),
    ['general_visit_walk'],
  );
});

test('draft and unpublished General Visit forms are hidden from representatives', () => {
  const draft = template({
    type: 'general_visit_walk',
    formCategory: 'general_visit',
    published: null,
    hasUnpublishedChanges: true,
  });
  assert.equal(isPlannerFormVisibleToRepresentatives(draft), false);
  assert.equal(generalVisitFormStatusLabel(draft), 'Draft');

  const published = template({
    type: 'general_visit_walk',
    formCategory: 'general_visit',
    published: {
      name: 'Walk',
      title: 'Walk',
      fields: [],
      version: 1,
      publishedAt: '2026-01-01',
    },
    hasUnpublishedChanges: false,
  });
  assert.equal(isPlannerFormVisibleToRepresentatives(published), true);
  assert.equal(isGeneralVisitAdminForm(published), true);

  const archived = { ...published, isActive: false };
  assert.equal(isPlannerFormVisibleToRepresentatives(archived), false);
  assert.equal(generalVisitFormStatusLabel(archived), 'Archived');
});
