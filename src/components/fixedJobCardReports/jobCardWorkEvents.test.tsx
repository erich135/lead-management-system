import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JobCardWorkEvents } from './JobCardWorkEvents';
import { FixedJobCardPrintView } from '../FixedJobCardPrintView';
import type { JobCardWorkEvent } from '../../lib/api';

const events: JobCardWorkEvent[] = [
  { _id: 'start', action: 'start', user: { firstName: 'Nico', lastName: 'De Jonge' }, deviceTime: '2026-10-29T09:21:00Z', serverReceivedAt: '2026-10-29T09:22:00Z', location: { lat: -26.2, lng: 28.1 } },
  { _id: 'finish', action: 'finish', user: { firstName: 'Other', lastName: 'Technician' }, deviceTime: '2026-10-29T12:20:00Z', serverReceivedAt: '2026-10-29T13:50:00Z', location: { lat: 0, lng: 0 } },
];
describe('Job Card Start and Finish table', () => {
  it('keeps device/receipt times and actual event actors separate with clickable GPS', () => {
    const html = renderToStaticMarkup(<JobCardWorkEvents events={events} />);
    expect(html).toContain('Nico De Jonge');
    expect(html).toContain('Other Technician');
    expect(html).toContain('29 Oct 2026, 14:20');
    expect(html).toContain('29 Oct 2026, 15:50');
    expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=-26.2,28.1');
    expect(html).toContain('query=0,0');
  });
  it('shows missing events as unavailable, without substituting submission times', () => {
    const html = renderToStaticMarkup(<JobCardWorkEvents />);
    expect(html).toContain('Start Work');
    expect(html).toContain('Finish Work');
    expect(html.match(/<td>Unavailable<\/td>/g)).toHaveLength(8);
    expect(html).not.toContain('href=');
  });
  it('keeps every repeated event and its technician instead of combining visits', () => {
    const input = [...events, { ...events[0], _id: 'start2' }, { ...events[1], _id: 'finish2' }];
    const before = JSON.stringify(input);
    const html = renderToStaticMarkup(<JobCardWorkEvents events={input} />);
    expect(html.match(/<td>Start Work<\/td>/g)).toHaveLength(2);
    expect(html.match(/<td>Finish Work<\/td>/g)).toHaveLength(2);
    expect(html).toContain('Multiple recorded events');
    expect(JSON.stringify(input)).toBe(before);
  });
  it('handles invalid times, absent actors and invalid coordinates truthfully', () => {
    const html = renderToStaticMarkup(<JobCardWorkEvents events={[{ action: 'start', user: 'id-only', deviceTime: 'invalid', serverReceivedAt: null, location: { lat: 91, lng: 0 } }]} />);
    expect(html.match(/<td>Unavailable<\/td>/g)).toHaveLength(8);
    expect(html).not.toContain('id-only');
    expect(html).not.toContain('href=');
  });

  for (const [name, layoutKey] of [
    ['compressor mechanical', 'mechanical_checklist'], ['mobile mechanical', 'mechanical_checklist_mobile'],
    ['repair', 'repair_status_report'], ['generator', 'generator_b_service'], ['dryer', 'dryer_sla'], ['custom', 'generic'],
  ]) it(`${name}: adds only the footer inside the existing PDF target`, () => {
    const sections = [{ id: 'rsr_signatures', type: 'signatures', title: 'Sign-off', fields: [
      { id: 'tech_name', type: 'text', label: 'Name' }, { id: 'tech_signature', type: 'signature', label: 'Signature' },
      { id: 'tech_date', type: 'date', label: 'Date' }, { id: 'cust_name', type: 'text', label: 'Customer' },
      { id: 'cust_signature', type: 'signature', label: 'Signature' }, { id: 'cust_date', type: 'date', label: 'Date' },
    ] }];
    const props = { template: { name, layoutKey, sections }, fieldValues: [
      { fieldId: 'tech_signature', type: 'signature', value: 'Signed', signatureData: 'data:image/png;base64,original' },
    ], submittedAt: '2026-10-29T13:50:00Z', finishWorkDeviceTime: '2026-10-29T12:20:00Z', workEvents: events, onClose: () => undefined };
    const before = JSON.stringify(props);
    const original = renderToStaticMarkup(<FixedJobCardPrintView {...props} />);
    const updated = renderToStaticMarkup(<FixedJobCardPrintView {...props} submissionId="submission-1" />);
    const footer = updated.match(/<div class="jcr-block jcr-keep" data-job-card-work-events="">[\s\S]*?<\/div>/)?.[0];
    expect(footer).toBeTruthy();
    expect(updated.replace(footer!, '')).toBe(original);
    expect(updated.indexOf(footer!)).toBeGreaterThan(updated.indexOf('Server accepted submission'));
    expect(updated).toContain('data:image/png;base64,original');
    expect(JSON.stringify(props)).toBe(before);
  });
});
