import { useEffect, useState } from 'react';
import {
  getCustomers,
  getInspectionAssociation,
  getInspectionAssociationMachines,
  saveInspectionAssociation,
  type Customer,
  type InspectionListItem,
} from '../lib/api';

export function InspectionAssociationCorrection({ inspection, onClose, onSaved }: {
  inspection: InspectionListItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [revision, setRevision] = useState(0);
  const [original, setOriginal] = useState<string>(inspection.siteLabel);
  const [history, setHistory] = useState<Array<{ revision: number; createdAt: string; administrator: { name: string }; reason: string; previous: { customerName: string; machineLabel: string }; next: { customerName: string; machineLabel: string } }>>([]);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [machines, setMachines] = useState<Array<{ _id: string; label: string; officeArchived: boolean }>>([]);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [machineChosen, setMachineChosen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getInspectionAssociation(inspection._id).then((data) => {
      if (!active) return;
      setRevision(data.revision || 0);
      setOriginal(`${data.original.customerName} · ${data.original.siteLabel}`);
      setHistory(data.history || []);
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'The association could not be loaded'); });
    return () => { active = false; };
  }, [inspection._id]);

  useEffect(() => {
    if (search.trim().length < 2) { setCustomers([]); return; }
    const timer = window.setTimeout(() => {
      void getCustomers({ search: search.trim(), limit: 8 }).then((result) => setCustomers(result.customers || [])).catch(() => setCustomers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const chooseCustomer = (next: Customer) => {
    setCustomer(next);
    setSearch(next.matchedAlias ? `${next.name} — ${next.matchedAlias}` : next.name);
    setCustomers([]);
    setMachineId(null);
    setMachineChosen(false);
    void getInspectionAssociationMachines(inspection._id, next._id).then((result) => setMachines(result.machines || [])).catch((err) => setError(err instanceof Error ? err.message : 'Machines could not be loaded'));
  };

  const save = async () => {
    const trimmed = reason.trim();
    if (!customer) { setError('Select a registered customer.'); return; }
    if (!machineChosen) { setError('Select a machine or leave the machine unlinked.'); return; }
    if (!trimmed) { setError('A reason for the correction is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await saveInspectionAssociation(inspection._id, { revision, customerId: customer._id, machineId, reason: trimmed });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The correction could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
    <div role="dialog" aria-modal="true" aria-label="Correct Customer / Machine" className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6">
      <h2 className="text-xl font-bold">Correct Customer / Machine</h2>
      <p className="my-2 text-sm text-gray-600">Original submission: {original}. This does not change the inspection record, linked job, or machine hours.</p>
      {error && <p role="alert" className="my-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm">Search customer<input className="mt-1 w-full rounded border p-2" value={search} onChange={(event) => { setSearch(event.target.value); setCustomer(null); }} placeholder="Registered name or trading name" /></label>
      {customers.length > 0 && <div className="mt-1 max-h-36 overflow-auto rounded border">{customers.map((item) => <button key={item._id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => chooseCustomer(item)}>{item.matchedAlias ? `${item.name} — ${item.matchedAlias}` : item.name}</button>)}</div>}
      {customer && <div className="mt-3">
        <p className="text-sm font-semibold">Machines for {customer.name}</p>
        <button type="button" className={`mt-1 block w-full rounded border px-3 py-2 text-left text-sm ${machineChosen && !machineId ? 'bg-[#e8f4fc]' : ''}`} onClick={() => { setMachineId(null); setMachineChosen(true); }}>Leave machine unlinked</button>
        {machines.map((item) => <button key={item._id} type="button" className={`mt-1 block w-full rounded border px-3 py-2 text-left text-sm ${machineId === item._id ? 'bg-[#e8f4fc]' : ''}`} onClick={() => { setMachineId(item._id); setMachineChosen(true); }}>{item.label}</button>)}
        {!machines.length && <p className="mt-1 text-sm text-gray-500">No eligible machines are registered for this customer. Create one in Machine Management, or leave the machine unlinked.</p>}
      </div>}
      <label className="mt-3 block text-sm">Reason<textarea className="mt-1 w-full rounded border p-2" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={saving} className="rounded bg-amber-400 px-4 py-2 font-bold disabled:opacity-50" onClick={() => void save()}>{saving ? 'Saving…' : 'Save correction'}</button>
        <button type="button" className="rounded border px-4 py-2" onClick={onClose}>Close</button>
      </div>
      <h3 className="mt-6 font-semibold">Correction history</h3>
      {!history.length && <p className="text-sm">No association corrections recorded.</p>}
      {history.map((entry) => <div key={entry.revision} className="border-t py-2 text-sm"><p>{new Date(entry.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} — {entry.administrator.name}</p><p>Reason: {entry.reason}</p><p>From {entry.previous.customerName} / {entry.previous.machineLabel} to {entry.next.customerName} / {entry.next.machineLabel}</p></div>)}
    </div>
  </div>;
}
