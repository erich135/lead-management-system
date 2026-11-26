import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { eligibleBulkMachines, prepareBulkLabels, bulkLabelDocument, lookupProductionMachine, QR_PRINT_ORIGIN, type ProductionQrMachine } from './BulkMachineQrPrint';
import type { Machine } from '../lib/api';

const machine = (id: string, extra: Partial<Machine> = {}): Machine => ({
  _id: id, make: 'Atlas', model: 'GA', serialNumber: `SN-${id}`, assetNumber: `A-${id}`,
  customer: { _id: 'c1', name: 'Customer one' }, isActive: true, ...extra,
} as Machine);
const token = (id: string) => `header.payload-${id}.signature`;
const url = (id: string) => `${QR_PRINT_ORIGIN}/scan/machine/${token(id)}`;
const lookup = async (t: string): Promise<ProductionQrMachine> => {
  const id = t.split('.')[1].slice(8);
  const m = machine(id);
  return { id, customerName: 'Customer one', make: m.make, model: m.model, serialNumber: m.serialNumber, assetNumber: m.assetNumber, acceptingReadings: true };
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('customer bulk QR printing', () => {
  it('uses the restricted dev bridge and the fixed public lookup in production without credentials or redirects', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    for (const dev of [true, false]) {
      vi.stubEnv('DEV', dev);
      fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { machine: await lookup(token('1')) } })));
      await expect(lookupProductionMachine(token('1'))).resolves.toMatchObject({ id: '1' });
      expect(fetch).toHaveBeenLastCalledWith(`${dev ? '/__ars-dev/verify-machine/' : QR_PRINT_ORIGIN + '/api/public/machine-readings/'}${token('1')}`, expect.objectContaining({
        method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' },
      }));
    }
  });
  it('rejects failed, malformed and redirected production responses', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    for (const body of [{ success: false }, { success: true, data: {} }, { success: true, data: { machine: await lookup(token('1')), redirectedFromMachineId: 'old' } }]) {
      fetch.mockResolvedValueOnce(new Response(JSON.stringify(body)));
      await expect(lookupProductionMachine(token('1'))).rejects.toThrow('unavailable or redirected');
    }
    fetch.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    await expect(lookupProductionMachine(token('1'))).rejects.toThrow('verification failed');
    fetch.mockResolvedValueOnce(new Response('not JSON'));
    await expect(lookupProductionMachine(token('1'))).rejects.toThrow();
  });
  it('keeps only unique active machines belonging to the selected customer', () => {
    const rows = [machine('1'), machine('1'), machine('2', { customer: 'c2' }), machine('3', { isActive: false }),
      machine('4', { officeArchivedAt: '2026-01-01' }), machine('5', { dbStatus: 'archived' }),
      machine('6', { isReadOnly: true }), machine('7', { canonicalMachineId: '1' }),
      machine('8', { mergeStatus: 'merged' }), machine('9', { redirectStatus: 'redirected' })];
    expect(eligibleBulkMachines(rows, 'c1').map(m => m._id)).toEqual(['1']);
  });
  it('prepares 500 labels in stable order with at most four outstanding requests', async () => {
    let active = 0, max = 0;
    const progress: number[] = [];
    const rows = Array.from({ length: 500 }, (_, i) => machine(String(i)));
    const result = await prepareBulkLabels(rows, async id => {
      max = Math.max(max, ++active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--; return { token: token(id), scanUrl: `http://localhost:5173/scan/machine/${token(id)}`, machineId: id };
    }, n => progress.push(n), () => true, 'Customer one', lookup);
    expect(max).toBe(4); expect(progress[progress.length - 1]).toBe(500);
    expect(result.map(l => l.machine._id)).toEqual(rows.map(m => m._id));
    expect(result[0].scanUrl).toBe(url('0'));
    expect(bulkLabelDocument(result, 'Customer').match(/class="label"/g)).toHaveLength(500);
  });
  it('rejects a failed or cancelled batch and never returns partial output', async () => {
    await expect(prepareBulkLabels([machine('1'), machine('2')], async id => {
      if (id === '2') throw new Error('QR unavailable'); return { token: token(id), scanUrl: url(id) };
    }, () => {}, () => true, 'Customer one', lookup)).rejects.toThrow('QR unavailable');
    let current = true;
    await expect(prepareBulkLabels([machine('1')], async id => {
      current = false; return { token: token(id), scanUrl: url(id) };
    }, () => {}, () => current, 'Customer one', lookup)).rejects.toThrow('cancelled');
  });
  it('rejects malformed tokens and redirected machine identities', async () => {
    for (const invalid of ['', 'https://example.com/a', 'a.b.c?x=1', 'a.b.c/submit']) {
      await expect(prepareBulkLabels([machine('1')], async () => ({ token: invalid, scanUrl: '' }), () => {}, () => true, 'Customer one', lookup)).rejects.toThrow('token');
    }
    await expect(prepareBulkLabels([machine('1')], async () => ({ token: token('2'), scanUrl: url('2'), machineId: '2' }), () => {}, () => true, 'Customer one', lookup)).rejects.toThrow('identity');
  });
  it('checks every public identity field and aborts on failed production verification', async () => {
    const qr = async () => ({ token: token('1'), scanUrl: 'http://localhost:5173/ignored' });
    for (const change of [{ id: 'other' }, { customerName: 'Other' }, { make: 'Other' }, { model: 'Other' }, { serialNumber: 'Other' }, { assetNumber: 'Other' }, { acceptingReadings: false }]) {
      await expect(prepareBulkLabels([machine('1')], qr, () => {}, () => true, 'Customer one', async t => ({ ...await lookup(t), ...change }))).rejects.toThrow('differ');
    }
    await expect(prepareBulkLabels([machine('1')], qr, () => {}, () => true, 'Customer one', async () => { throw new Error('Unavailable'); })).rejects.toThrow('Unavailable');
    const seen: string[] = [];
    const labels = await prepareBulkLabels([machine('1')], qr, () => {}, () => true, 'Customer one', async t => { seen.push(t); return lookup(t); });
    expect(seen).toEqual([token('1')]);
    expect(labels[0].scanUrl).toBe(url('1'));
  });
  it('preserves individual QR SVG output and identification, escapes HTML, and breaks only between labels', () => {
    const rows = [machine('1', { make: '<script>', assetNumber: '"<&' }), machine('2'), machine('3', { serialNumber: 'SERIAL-'.repeat(35), assetNumber: 'ASSET-'.repeat(35) })];
    const labels = rows.map(m => ({ machine: m, scanUrl: url(m._id) }));
    const html = bulkLabelDocument(labels, '<Customer>');
    expect(html.match(/class="label"/g)).toHaveLength(3);
    expect(html).toContain(renderToStaticMarkup(<QRCodeSVG value={url('1')} size={130} level="M" includeMargin={true} />));
    expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('.label + .label { break-before: page;');
    expect(html).not.toContain('break-after');
    expect(() => bulkLabelDocument([], '')).toThrow('Select');
    const individual = readFileSync('src/components/MachineQrPanel.tsx', 'utf8');
    for (const style of ['@page { size: 62mm 75mm; margin: 2mm; }', 'width: 55mm; height: 55mm; flex: none;', 'overflow-wrap: anywhere;']) {
      expect(html).toContain(style); expect(individual).toContain(style);
    }
  });
});
