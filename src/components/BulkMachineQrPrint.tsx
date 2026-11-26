import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { getMachinesByCustomer, getMachineQrToken, type Customer, type Machine } from '../lib/api';

// Verified against the running production API; the name includes "dev" intentionally.
export const QR_PRINT_ORIGIN = 'https://ars-dev.lmwfinance.app';

export function eligibleBulkMachines(machines: Machine[], customerId: string): Machine[] {
  const seen = new Set<string>();
  return machines.filter(m => {
    const owner = typeof m.customer === 'string' ? m.customer : m.customer?._id;
    if (!m._id || seen.has(m._id) || owner !== customerId || !m.isActive ||
      (m.dbStatus && m.dbStatus !== 'active') || m.officeArchivedAt || m.isReadOnly ||
      m.canonicalMachineId || m.mergeStatus === 'merged' || m.redirectStatus === 'redirected') return false;
    seen.add(m._id);
    return true;
  });
}

export type PreparedQrLabel = { machine: Machine; scanUrl: string };

export type ProductionQrMachine = {
  id: string; customerName: string | null; make: string; model: string;
  serialNumber: string; assetNumber: string | null; acceptingReadings: boolean;
};

export async function lookupProductionMachine(token: string): Promise<ProductionQrMachine> {
  // Development needs a same-origin bridge; a deployed Office uses the existing
  // fixed public lookup directly. The bridge itself is never built or deployed.
  const endpoint = import.meta.env.DEV ? '/__ars-dev/verify-machine/' : `${QR_PRINT_ORIGIN}/api/public/machine-readings/`;
  const response = await fetch(`${endpoint}${token}`, {
    method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Production verification failed. No labels were printed.');
  const result = await response.json();
  if (result.success !== true || !result.data?.machine || result.data.redirectedFromMachineId) {
    throw new Error('Production machine unavailable or redirected. No labels were printed.');
  }
  return result.data.machine;
}

export async function prepareBulkLabels(
  machines: Machine[],
  fetchQr: (id: string) => Promise<{ token: string; scanUrl: string; machineId?: string }>,
  progress: (done: number) => void,
  current: () => boolean,
  customerName: string,
  verify: (token: string) => Promise<ProductionQrMachine> = lookupProductionMachine,
): Promise<PreparedQrLabel[]> {
  const labels = new Array<PreparedQrLabel>(machines.length);
  let next = 0, done = 0, failed = false;
  await Promise.all(Array.from({ length: Math.min(4, machines.length) }, async () => {
    while (!failed && current()) {
      const index = next++;
      if (index >= machines.length) return;
      try {
        const machine = machines[index];
        const result = await fetchQr(machine._id);
        if (!current()) throw new Error('Batch cancelled.');
        if (result.machineId && result.machineId !== machine._id) throw new Error('Machine identity changed. Reload the customer.');
        // Keep the existing signed token byte-for-byte. Local scanUrl may point at
        // localhost; it is never used as an upstream URL or printed destination.
        if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(result.token || '') || result.token.length > 2048) {
          throw new Error('Invalid QR token. No labels were printed.');
        }
        const production = await verify(result.token);
        if (!current()) throw new Error('Batch cancelled.');
        const sameText = (a: unknown, b: unknown) => (a ?? '') === (b ?? '');
        if (!customerName || production.id !== machine._id || production.customerName !== customerName ||
            production.acceptingReadings !== true || !sameText(production.make, machine.make) ||
            !sameText(production.model, machine.model) || !sameText(production.serialNumber, machine.serialNumber) ||
            !sameText(production.assetNumber, machine.assetNumber)) {
          throw new Error('Production machine identity or details differ. Reload the customer. No labels were printed.');
        }
        labels[index] = { machine, scanUrl: `${QR_PRINT_ORIGIN}/scan/machine/${result.token}` };
        progress(++done);
      } catch (error) { failed = true; throw error; }
    }
  }));
  if (!current() || done !== machines.length) throw new Error('Batch cancelled.');
  return labels;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function bulkLabelDocument(labels: PreparedQrLabel[], customerName: string): string {
  if (!labels.length) throw new Error('Select at least one machine.');
  // Layout and QR options are intentionally identical to MachineQrPanel.
  const content = labels.map(({ machine: m, scanUrl }) => `<div class="label">
    ${renderToStaticMarkup(<QRCodeSVG value={scanUrl} size={130} level="M" includeMargin={true} />)}
    <div class="meta"><strong>${escapeHtml(`${m.make || ''} ${m.model || ''}`.trim() || 'Machine')}</strong>
    ${m.serialNumber ? `S/N: ${escapeHtml(m.serialNumber)}<br/>` : ''}
    ${m.assetNumber ? `Asset: ${escapeHtml(m.assetNumber)}` : ''}</div></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Machine QR Labels</title><style>
  @page { size: 62mm 75mm; margin: 2mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
  .label { width: 58mm; display: flex; flex-direction: column; align-items: center; padding: 1.5mm;
    box-sizing: border-box; break-inside: avoid; page-break-inside: avoid; }
  .label + .label { break-before: page; page-break-before: always; }
  .label svg { display: block; width: 55mm; height: 55mm; flex: none; }
  .meta { width: 55mm; font-size: 8pt; line-height: 1.2; margin-top: 1mm; text-align: center; overflow-wrap: anywhere; }
  .meta strong { display: block; font-size: 9pt; }
  .instructions { padding: 12px; font-size: 12px; color: #555; }
  @media print { .instructions { display: none; } }
  </style></head><body><div class="instructions">${escapeHtml(customerName)} — ${labels.length} labels.
  Brother QL-800 · 62 mm continuous roll · 100% / Actual size · headers and footers off.
  Label length: <span id="label-length">75</span> mm. The 55 mm QR includes its white border.</div>${content}</body></html>`;
}

/** Measure all labels before printing. A common length accommodates the longest
 * details without changing the QR or identification layout; breaks occur only between labels. */
export async function sizeBulkLabels(doc: Document): Promise<number> {
  await doc.fonts.ready;
  const height = Math.max(75, ...Array.from(doc.querySelectorAll('.label'), label =>
    Math.ceil(label.getBoundingClientRect().height * 25.4 / 96 + 4)));
  const style = doc.createElement('style');
  style.textContent = `@page { size: 62mm ${height}mm; margin: 2mm; }`;
  doc.head.appendChild(style);
  const length = doc.getElementById('label-length');
  if (length) length.textContent = String(height);
  return height;
}

export function BulkMachineQrPrint({ customers, onClose }: { customers: Customer[]; onClose: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const popup = useRef<Window | null>(null);
  const busy = useRef(false);
  useEffect(() => () => { generation.current++; popup.current?.close(); }, []);

  const loadCustomer = async (id: string) => {
    const request = ++generation.current;
    popup.current?.close(); popup.current = null; busy.current = false;
    setCustomerId(id); setMachines([]); setSelected(new Set()); setError(''); setPreparing(false); setDone(0);
    setLoading(Boolean(id));
    if (!id) return;
    try {
      const result = await getMachinesByCustomer(id);
      if (request === generation.current) setMachines(eligibleBulkMachines(result.machines, id));
    } catch (e) {
      if (request === generation.current) setError(e instanceof Error ? e.message : 'Could not load machines.');
    } finally { if (request === generation.current) setLoading(false); }
  };

  const printSelected = async () => {
    if (busy.current || !selected.size) return;
    // Open synchronously in the click event, before awaiting network requests.
    const w = window.open('', '_blank', 'width=650,height=800');
    if (!w) { setError('Pop-up blocked. Allow pop-ups for this site and try again.'); return; }
    popup.current = w; busy.current = true;
    w.document.body.textContent = 'Preparing the complete batch. No labels will print until every QR is ready.';
    const request = ++generation.current;
    const current = () => request === generation.current && !w.closed;
    const batch = machines.filter(m => selected.has(m._id));
    setPreparing(true); setDone(0); setError('');
    try {
      const customerName = customers.find(c => c._id === customerId)?.name || '';
      const labels = await prepareBulkLabels(batch, getMachineQrToken, value => { if (current()) setDone(value); }, current, customerName);
      if (!current()) return;
      w.document.open();
      w.document.write(bulkLabelDocument(labels, customers.find(c => c._id === customerId)?.name || 'Customer'));
      w.document.close();
      await sizeBulkLabels(w.document);
      if (!current()) return;
      w.focus(); w.print();
    } catch (e) {
      w.close();
      if (request === generation.current) setError(e instanceof Error ? e.message : 'Batch preparation failed. No labels were printed.');
    } finally {
      if (request === generation.current) { setPreparing(false); busy.current = false; }
    }
  };

  return <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="bulk-qr-title" className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 gap-4">
      <div className="flex justify-between items-center"><h2 id="bulk-qr-title" className="text-xl font-semibold">Bulk Print QR Codes</h2>
        <button type="button" onClick={onClose} aria-label="Close bulk QR printing">Close</button></div>
      <label>Customer<select aria-label="Customer" className="block border rounded p-2 w-full" value={customerId} onChange={e => void loadCustomer(e.target.value)}>
        <option value="">Select a customer…</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
      </select></label>
      {error && <p role="alert" className="text-red-700">{error} <button type="button" onClick={() => void loadCustomer(customerId)}>Reload customer</button></p>}
      {loading && <p role="status">Loading all active machines…</p>}
      {!loading && customerId && !machines.length && !error && <p>No eligible active machines for this customer.</p>}
      <div className="flex gap-4 items-center">
        <button type="button" disabled={loading || preparing || !machines.length} onClick={() => setSelected(new Set(machines.map(m => m._id)))}>Select All</button>
        <button type="button" disabled={preparing || !selected.size} onClick={() => setSelected(new Set())}>Deselect All</button>
        <span aria-live="polite">{selected.size} of {machines.length} selected</span>
      </div>
      <div className="overflow-auto min-h-0"><table className="w-full text-sm text-left"><thead><tr>
        <th>Select</th><th>Make</th><th>Model</th><th>Serial number</th><th>Asset number</th>
      </tr></thead><tbody>{machines.map(m => <tr key={m._id} className="border-t">
        <td className="p-2"><input type="checkbox" aria-label={`Select ${m.serialNumber || m._id}`} checked={selected.has(m._id)} disabled={preparing}
          onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(m._id); else next.delete(m._id); return next; })} /></td>
        <td className="p-2 break-all">{m.make}</td><td className="p-2 break-all">{m.model}</td><td className="p-2 break-all">{m.serialNumber}</td><td className="p-2 break-all">{m.assetNumber || '—'}</td>
      </tr>)}</tbody></table></div>
      {preparing && <p role="status">Preparing {done} of {selected.size} labels…</p>}
      <button type="button" disabled={loading || preparing || !selected.size} onClick={() => void printSelected()} className="bg-slate-800 text-white rounded p-3 disabled:opacity-50">Print Selected ({selected.size})</button>
    </section></div>;
}
