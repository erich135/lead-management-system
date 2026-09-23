import test from 'node:test';
import assert from 'node:assert/strict';
import { presentSalesRequestForm } from './salesRequestFormPresentation.ts';
import { safeInternalPath } from './loginRedirect.ts';

test('originating RFQ presentation uses labels instead of raw JSON keys', () => {
  const sections = presentSalesRequestForm('rfc', {
    sectionB: { serviceScope: 'minor_service', make: 'Atlas' },
    sectionA: { otherRequirements: 'Keep\n\nparagraphs' },
  });
  const labels = sections.flatMap((section) => section.rows.map((row) => row.label));
  assert.ok(labels.includes('Service scope'));
  assert.ok(labels.includes('Other requirements or notes'));
  const notes = sections.flatMap((section) => section.rows).find((row) => row.label === 'Other requirements or notes');
  assert.equal(notes?.value, 'Keep\n\nparagraphs');
});

test('dynamic RFQ presentation hides schema dumps and field ids', () => {
  const sections = presentSalesRequestForm('rfc', {
    formTemplateName: 'Internal Request For Costing',
    formTemplateId: '507f1f77bcf86cd799439011',
    formSchemaSnapshot: {
      fields: [{ id: 'fld_otherRequirements', label: 'Other Requirements / Notes', type: 'textarea' }],
    },
    values: { fld_otherRequirements: 'Keep this note' },
  });
  const rendered = JSON.stringify(sections);
  assert.match(rendered, /Other Requirements \/ Notes/);
  assert.match(rendered, /Keep this note/);
  assert.equal(rendered.includes('fld_otherRequirements'), false);
  assert.equal(rendered.includes('507f1f77bcf86cd799439011'), false);
  assert.equal(rendered.includes('formSchemaSnapshot'), false);
});

test('login next only accepts in-app paths', () => {
  assert.equal(safeInternalPath('/sales-leads?tab=requests&rfq=abc'), '/sales-leads?tab=requests&rfq=abc');
  assert.equal(safeInternalPath('https://evil.example'), null);
  assert.equal(safeInternalPath('//evil.example'), null);
});
