import { useCallback, useEffect, useRef, useState } from 'react';
import { getNotificationRecipients, saveNotificationRecipient, type NotificationRecipientRecord } from '../lib/api';
import {
  notificationRecipientEditDraft,
  notificationRecipientMatchesScope,
  notificationRecipientSaveBody,
  type NotificationRecipientDraft,
  type NotificationRecipientScope,
} from '../lib/notificationRecipientForm';

function emptyDraft(scope: NotificationRecipientScope): NotificationRecipientDraft {
  return {
    email: '', displayName: '', group: scope.group,
    customerId: scope.group === 'customer' ? scope.customerId : '',
    customerName: '', customerMissing: false, active: true,
    serviceDue: false, checklist: false, updatedAt: undefined,
  };
}

export function NotificationRecipients({ scope }: { scope: NotificationRecipientScope }) {
  // A different permanent Customer ID always starts a separate editor and request state.
  return <RecipientRegister key={scope.group === 'customer' ? scope.customerId : 'global'} scope={scope} />;
}

export function ArchivedCustomerNotificationRecipients({ customerId }: { customerId: string }) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm text-orange-800">Archived customer. Recipient changes keep this customer archived and preserve its existing associations.</p>
      <NotificationRecipients scope={{ group: 'customer', customerId }} />
    </div>
  );
}

function RecipientRegister({ scope }: { scope: NotificationRecipientScope }) {
  const group = scope.group;
  const customerId = scope.group === 'customer' ? scope.customerId : undefined;
  const [rows, setRows] = useState<NotificationRecipientRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyDraft(scope));
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++request.current;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getNotificationRecipients({ group, customerId });
      if (requestId !== request.current) return false;
      const currentScope: NotificationRecipientScope = group === 'customer'
        ? { group, customerId: customerId! } : { group };
      setRows((data.recipients || []).filter((row) => notificationRecipientMatchesScope(row, currentScope)));
      setWarning(data.mirrorSyncWarning || '');
      return true;
    } catch (err) {
      if (requestId === request.current) {
        setLoadError(err instanceof Error ? err.message : 'Recipients could not be loaded.');
      }
      return false;
    } finally {
      if (requestId === request.current) setLoading(false);
    }
  }, [group, customerId]);

  useEffect(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]);

  const reset = () => {
    setEditingId(null);
    setForm(emptyDraft(scope));
    setSaveError('');
  };
  const enabled = (row: NotificationRecipientRecord, typeId: string) => row.subscriptions?.some((item) => item.typeId === typeId && item.enabled);
  const startEdit = (row: NotificationRecipientRecord) => {
    if (!notificationRecipientMatchesScope(row, scope)) return;
    setEditingId(row._id);
    setForm(notificationRecipientEditDraft(row));
    setSaveError('');
    setSuccess('');
  };
  const save = async () => {
    setSaving(true);
    setSaveError('');
    setSuccess('');
    try {
      const body = notificationRecipientSaveBody(form, scope, Boolean(editingId));
      const saved = await saveNotificationRecipient(body, editingId || undefined);
      reset();
      // The server confirmed the write. A failed refresh must never invite another create.
      const refreshed = await load();
      setWarning(saved.mirrorSyncWarning || saved.recipient?.mirrorSyncWarning || '');
      setSuccess(refreshed ? 'Recipient saved.' : 'Recipient saved, but the register could not be refreshed. Reload before making another change.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Recipient could not be saved.');
    } finally {
      setSaving(false);
    }
  };
  const busy = loading || saving;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4" aria-label={group === 'customer' ? 'Customer notification recipients' : 'Global ARS notification recipients'}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{group === 'customer' ? 'Notification Recipients' : 'Global ARS Recipients'}</h3>
          <p className="mt-1 text-xs text-gray-600">Checklist and Service Due email delivery remain disabled. Subscriptions do not turn on a machine Checklist or send an email.</p>
          <p className="mt-1 text-xs text-gray-500">Recipient changes save separately from customer details. Customer contact details are not automatically subscribed.</p>
          {customerId && <p className="mt-1 break-all font-mono text-xs text-gray-500">Customer ID: {customerId}</p>}
        </div>
        <button type="button" disabled={busy} onClick={() => { reset(); setSuccess(''); void load(); }} className="shrink-0 rounded border px-3 py-1.5 text-sm disabled:opacity-50">Reload recipients</button>
      </div>
      {loadError && <p role="alert" className="mb-2 text-sm text-red-700">Could not refresh recipients: {loadError}</p>}
      {saveError && <p role="alert" className="mb-2 text-sm text-red-700">{saveError}</p>}
      {warning && <p role="status" className="mb-2 text-sm text-amber-800">{warning}</p>}
      {success && <p role="status" className="mb-2 text-sm text-green-800">{success}</p>}
      {loading ? <p role="status" className="py-3 text-sm text-gray-500">Loading recipients…</p> : !loadError && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-gray-500"><tr>
              <th className="py-1 pr-3">Recipient Name</th><th className="pr-3">Email</th>
              <th className="pr-3">Checklist</th><th className="pr-3">Service Due</th><th className="pr-3">Active</th><th><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-gray-100">
                  <td className="py-2 pr-3">{row.displayName}<div className="font-mono text-xs text-gray-400">{row._id}</div></td>
                  <td className="pr-3">{row.email}</td>
                  <td className="pr-3">{enabled(row, 'checklist') ? 'Yes' : 'No'}</td>
                  <td className="pr-3">{enabled(row, 'service_due') ? 'Yes' : 'No'}</td>
                  <td className="pr-3">{row.active ? 'Yes' : 'No'}</td>
                  <td><button type="button" disabled={saving} className="font-semibold text-[#0969a9] disabled:opacity-50" aria-label={`Edit recipient ${row.displayName || row.email}`} onClick={() => startEdit(row)}>Edit</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="py-3 text-gray-500">No {group === 'customer' ? 'recipients for this customer' : 'Global ARS recipients'} yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <fieldset disabled={busy || Boolean(loadError)} className="mt-4 rounded-lg border border-gray-200 p-3 disabled:opacity-60">
        <legend className="px-1 text-sm font-semibold">{editingId ? 'Edit recipient' : 'Add recipient'}</legend>
        {editingId && <p className="mb-2 break-all font-mono text-xs text-gray-500">Recipient ID: {editingId}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">Recipient Name<input required className="mt-1 block w-full rounded border px-2 py-1.5" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
          <label className="text-sm">Email Address<input type="email" required className="mt-1 block w-full rounded border px-2 py-1.5" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.checklist} onChange={(event) => setForm({ ...form, checklist: event.target.checked })} /> Checklist</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.serviceDue} onChange={(event) => setForm({ ...form, serviceDue: event.target.checked })} /> Service Due</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} className="rounded bg-[#f7c12b] px-3 py-1.5 text-sm font-bold text-[#383838]">{saving ? 'Saving…' : editingId ? 'Save recipient' : 'Add recipient'}</button>
            {editingId && <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={reset}>Cancel edit</button>}
          </div>
        </div>
      </fieldset>
      <p className="mt-2 text-xs text-gray-500">Clear Active to deactivate a recipient. Its ID and history stay in place.</p>
    </section>
  );
}
