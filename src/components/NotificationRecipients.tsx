import { useEffect, useState } from 'react';
import { getCustomers, getNotificationRecipients, saveNotificationRecipient, type Customer, type NotificationRecipientRecord } from '../lib/api';

const emptyForm = {
  email: '',
  displayName: '',
  group: 'global' as 'global' | 'customer',
  customerId: '',
  customerName: '',
  active: true,
  serviceDue: false,
  checklist: false,
};

export function NotificationRecipients() {
  const [rows, setRows] = useState<NotificationRecipientRecord[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerChoices, setCustomerChoices] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => getNotificationRecipients().then((data) => {
    setRows(data.recipients || []);
    setDryRun(data.dryRun !== false);
  }).catch((err) => setError(err instanceof Error ? err.message : 'Recipients could not be loaded'));

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (form.group !== 'customer' || customerQuery.trim().length < 2) {
      setCustomerChoices([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void getCustomers({ search: customerQuery.trim(), limit: 8 }).then((result) => setCustomerChoices(result.customers || [])).catch(() => setCustomerChoices([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerQuery, form.group]);

  const enabled = (row: NotificationRecipientRecord, typeId: string) => row.subscriptions?.some((item) => item.typeId === typeId && item.enabled);

  const startEdit = (row: NotificationRecipientRecord) => {
    setEditingId(row._id);
    setForm({
      email: row.email,
      displayName: row.displayName,
      group: row.group,
      customerId: row.customerId ? String(row.customerId) : '',
      customerName: '',
      active: row.active !== false,
      serviceDue: enabled(row, 'service_due'),
      checklist: enabled(row, 'checklist'),
    });
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const enabledTypeIds = [form.serviceDue ? 'service_due' : '', form.checklist ? 'checklist' : ''].filter(Boolean);
    try {
      await saveNotificationRecipient({
        email: form.email,
        displayName: form.displayName,
        group: form.group,
        customerId: form.group === 'customer' ? form.customerId : null,
        active: form.active,
        enabledTypeIds,
      }, editingId || undefined);
      setForm(emptyForm);
      setEditingId(null);
      setCustomerQuery('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recipient could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">Notification recipients</h3>
        <p className="text-xs text-gray-500">Checklist and Service Due stay off until a later release. {dryRun ? 'No email is sent from this register.' : ''}</p>
      </div>
      {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-500">
            <tr>
              <th className="py-1 pr-3">Name</th>
              <th className="pr-3">Email</th>
              <th className="pr-3">Group</th>
              <th className="pr-3">Checklist</th>
              <th className="pr-3">Service Due</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-gray-100">
                <td className="py-2 pr-3">{row.displayName}</td>
                <td className="pr-3">{row.email}</td>
                <td className="pr-3">{row.group === 'customer' ? 'Customer' : 'Global'}</td>
                <td className="pr-3">{enabled(row, 'checklist') ? 'Yes' : 'No'}</td>
                <td className="pr-3">{enabled(row, 'service_due') ? 'Yes' : 'No'}</td>
                <td>
                  <button type="button" className="font-semibold text-[#0969a9]" onClick={() => startEdit(row)}>{row.active ? 'Yes' : 'No'}</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="py-2 text-gray-500">No recipients yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className="rounded border px-2 py-1.5 text-sm" placeholder="Display name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        <input className="rounded border px-2 py-1.5 text-sm" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <select className="rounded border px-2 py-1.5 text-sm" value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value as 'global' | 'customer', customerId: '' })}>
          <option value="global">Global ARS</option>
          <option value="customer">Customer-specific</option>
        </select>
        {form.group === 'customer' ? (
          <div>
            <input className="w-full rounded border px-2 py-1.5 text-sm" placeholder="Search customer" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} />
            {customerChoices.length > 0 && (
              <div className="mt-1 max-h-28 overflow-auto rounded border bg-white">
                {customerChoices.map((customer) => (
                  <button key={customer._id} type="button" className="block w-full px-2 py-1 text-left text-sm hover:bg-slate-50" onClick={() => { setForm({ ...form, customerId: customer._id, customerName: customer.name }); setCustomerQuery(customer.name); setCustomerChoices([]); }}>
                    {customer.name}
                  </button>
                ))}
              </div>
            )}
            {form.customerName && <p className="mt-1 text-xs text-gray-500">Selected: {form.customerName}</p>}
          </div>
        ) : <div />}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.checklist} onChange={(event) => setForm({ ...form, checklist: event.target.checked })} /> Checklist</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.serviceDue} onChange={(event) => setForm({ ...form, serviceDue: event.target.checked })} /> Service Due</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active</label>
        <div className="flex gap-2">
          <button type="button" disabled={saving} onClick={() => void save()} className="rounded bg-[#f7c12b] px-3 py-1.5 text-sm font-bold text-[#383838] disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save recipient' : 'Add recipient'}</button>
          {editingId && <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
        </div>
      </div>
    </section>
  );
}
