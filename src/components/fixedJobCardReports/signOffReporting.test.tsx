import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MechanicalChecklistReportDocument } from './MechanicalChecklistReportDocument';
import { RepairStatusReportDocument } from './RepairStatusReportDocument';
import { GenericSectionReportDocument } from './GenericSectionReportDocument';
import { createFixedJobCardFieldResolver } from '../../utils/fixedJobCardFieldResolver';
import { getJobCardReportHeader } from '../../utils/arsJobCardHeaderDefaults';
import { FixedJobCardPrintView } from '../FixedJobCardPrintView';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1cAAAAASUVORK5CYII=';
const sections = [{ id: 'rsr_signatures', title: 'Sign-off', type: 'signatures', fields: [
  { id: 'tech_name', label: 'Technician', type: 'text' },
  { id: 'tech_signature', label: 'Technician signature', type: 'signature' },
  { id: 'tech_date', label: 'Date', type: 'date' },
  { id: 'cust_name', label: 'Customer', type: 'text' },
  { id: 'cust_signature', label: 'Customer signature', type: 'signature' },
  { id: 'cust_date', label: 'Customer date', type: 'date' },
  { id: 'super_signature', label: 'Supervisor', type: 'signature' },
  { id: 'super_date', label: 'Supervisor date', type: 'date' },
] }];
const values = sections[0].fields.map(field => ({ fieldId: field.id, type: field.type,
  value: field.type === 'date' ? '2026-10-29T09:21:36.046Z' : field.type === 'signature' ? 'Signed' : 'Original name',
  ...(field.type === 'signature' ? { signatureData: image } : {}),
}));
const layouts = [
  ['Mechanical', MechanicalChecklistReportDocument], ['Repair', RepairStatusReportDocument],
  ['Generator', GenericSectionReportDocument], ['Dryer', GenericSectionReportDocument], ['Custom', GenericSectionReportDocument],
] as const;

describe('Job Card printed sign-off reference', () => {
  it('reports a clock difference without replacing device time with server time', () => {
    const html = renderToStaticMarkup(<FixedJobCardPrintView
      template={{ name: 'Report', layoutKey: 'generic', sections }} fieldValues={values}
      submittedAt="2026-10-29T13:50:00Z" finishWorkDeviceTime="2026-10-29T14:00:00Z"
      finishWorkClockWarning onClose={() => undefined} />);
    expect(html).toContain('29 Oct 2026, 16:00');
    expect(html).toContain('29 Oct 2026, 15:50');
    expect(html).toContain('Device/server clocks may differ');
  });
  for (const layoutKey of ['mechanical_checklist', 'repair_status_report', 'generator_b_service', 'dryer_sla', 'generic']) {
    it(`passes server acceptance through the actual print view for ${layoutKey}`, () => {
      const html = renderToStaticMarkup(<FixedJobCardPrintView
        template={{ name: 'Report', layoutKey, sections }} fieldValues={values}
        submittedAt="2026-10-30T06:00:00Z" finishWorkDeviceTime="2026-10-29T12:20:01.418Z" onClose={() => undefined} />);
      expect(html).toContain('29 Oct 2026, 14:20');
      expect(html).toContain('30 Oct 2026, 08:00');
      expect(html.match(/Server accepted submission/g)).toHaveLength(1);
      expect(html).not.toContain('Phone submitted');
    });
  }
  for (const [name, Document] of layouts) {
    for (const finishWorkDeviceTime of ['2026-10-29T12:20:02.845Z', '2026-10-30T06:00:00Z', undefined, '', 'invalid', null]) {
      it(`${name}: renders ${String(finishWorkDeviceTime)} without changing templates or values`, () => {
        const before = JSON.stringify({ sections, values });
        const html = renderToStaticMarkup(<Document templateName={name} sections={sections}
          resolver={createFixedJobCardFieldResolver(values)} header={getJobCardReportHeader()} submittedAt="2026-10-29T13:50:00Z" finishWorkDeviceTime={finishWorkDeviceTime} />);
        expect(html.match(/Server accepted submission/g)).toHaveLength(1);
        const expected = finishWorkDeviceTime?.startsWith('2026-10-29') ? '29 Oct 2026, 14:20'
          : finishWorkDeviceTime?.startsWith('2026-10-30') ? '30 Oct 2026, 08:00' : 'Unavailable';
        for (const signer of ['Technician', 'Customer']) {
          expect(html).toContain(`${signer} sign-off reference (Finish Work \u2014 device time)</div><div class="jcr-field-value">${expected}</div>`);
        }
        expect(html).toContain('not an independently verified signature capture time');
        expect(html).toContain(image);
        expect(html).toContain('Original name');
        expect(html).not.toContain('11:21');
        expect(html).toContain('29 Oct 2026, 15:50');
        expect(html).not.toContain('Saved form date');
        expect(JSON.stringify({ sections, values })).toBe(before);
      });
    }
    it(`${name}: missing signatures remain missing`, () => {
      const html = renderToStaticMarkup(<Document templateName={name} sections={sections}
        resolver={createFixedJobCardFieldResolver([])} header={getJobCardReportHeader()} />);
      expect(html).not.toContain(image);
      expect(html).toContain('Unavailable');
    });
  }
});
