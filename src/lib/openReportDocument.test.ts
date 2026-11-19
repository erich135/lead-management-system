import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openReportDocument } from './openReportDocument';

function fakeWindow() {
  const written: string[] = [];
  const popup = {
    opener: {} as unknown,
    closed: false,
    document: {
      open() {},
      write(html: string) { written.push(html); },
      close() {},
      getElementById() { return null; },
      createElement() { return { style: {}, addEventListener() {} }; },
      title: 'Inspection',
    },
    close() { this.closed = true; },
  };
  return { popup: popup as unknown as Window, written };
}

describe('report window timing', () => {
  it('opens the window before a delayed large report is written', async () => {
    const { popup, written } = fakeWindow();
    let openedBeforeLoad = false;
    let release: (html: string) => void = () => {};
    const pending = new Promise<string>((resolve) => { release = resolve; });
    const opening = openReportDocument({
      blockedMessage: 'Allow pop-ups to open the inspection report',
      openWindow: () => {
        openedBeforeLoad = true;
        return popup;
      },
      loadHtml: () => pending,
    });
    expect(openedBeforeLoad).toBe(true);
    expect(written).toEqual([]);
    const html = `<html>${'photograph'.repeat(250000)}</html>`;
    release(html);
    await opening;
    expect(written).toEqual([html]);
    expect(written[0].length).toBeGreaterThan(2_000_000);
  });

  it('does not request the report when the popup is blocked', async () => {
    let requested = false;
    await expect(openReportDocument({
      blockedMessage: 'Allow pop-ups to open the inspection report',
      openWindow: () => null,
      loadHtml: async () => {
        requested = true;
        return '<html></html>';
      },
    })).rejects.toThrow('Allow pop-ups to open the inspection report');
    expect(requested).toBe(false);
  });

  it('keeps a network failure in the open window', async () => {
    const { popup, written } = fakeWindow();
    await expect(openReportDocument({
      blockedMessage: 'Allow pop-ups to open the inspection report',
      openWindow: () => popup,
      loadHtml: async () => { throw new TypeError('Failed to fetch'); },
    })).rejects.toThrow('Failed to fetch');
    expect(written[0]).toContain('Failed to fetch');
    expect((popup as unknown as { closed: boolean }).closed).toBe(false);
  });
});

describe('inspection print compatibility', () => {
  it('still prepares the optimised PDF from the opened inspection report', () => {
    const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'api.ts'), 'utf8');
    const start = source.indexOf('export async function openInspectionPrint');
    const end = source.indexOf('export async function getJobCardSubmissions');
    const fn = source.slice(start, end);
    expect(fn.indexOf('openReportDocument')).toBeGreaterThan(-1);
    expect(fn.indexOf('openReportDocument')).toBeLessThan(fn.indexOf('await fetch'));
    expect(fn).toContain('downloadOptimizedOfficePdf');
    expect(fn).toContain('Download PDF (optimised)');
    expect(fn).not.toContain("window.open('', '_blank')");
    const deliveryStart = source.indexOf('export async function openDeliveryNotePrint');
    const delivery = source.slice(deliveryStart, deliveryStart + 700);
    expect(delivery.indexOf('openReportDocument')).toBeLessThan(delivery.indexOf('await fetch'));
  });
});
