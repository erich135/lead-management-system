import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDynamicVisitSalesRequestFormData } from './visitFormSelection.ts';

test('General Visit submit payload retains template id, name and captured values', () => {
  const payload = buildDynamicVisitSalesRequestFormData({
    formTemplateType: 'general_visit_site_check',
    formTemplateName: 'Site Check',
    formTemplateId: 'tmpl-1',
    formTemplateVersion: 2,
    formSchemaSnapshot: { fields: [{ id: 'fld_a', label: 'Notes', required: true }] },
    values: { fld_a: 'Gate clear' },
  });
  assert.equal(payload.formTemplateType, 'general_visit_site_check');
  assert.equal(payload.formTemplateName, 'Site Check');
  assert.equal(payload.formTemplateId, 'tmpl-1');
  assert.equal(payload.formTemplateVersion, 2);
  assert.equal(payload.formCategory, 'general_visit');
  assert.deepEqual(payload.values, { fld_a: 'Gate clear' });
});
