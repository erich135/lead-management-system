import { useEffect, useState } from 'react';
import { getJobCardMachineAssociation, saveJobCardMachineAssociation, type JobCardMachineAssociation } from '../lib/api';

export function JobCardMachineLink({ submissionId, onClose, onSaved }: {
  submissionId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [detail, setDetail] = useState<JobCardMachineAssociation | null>(null);
  const [machineId, setMachineId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getJobCardMachineAssociation(submissionId).then((data) => { if (active) setDetail(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'The machines could not be loaded'); });
    return () => { active = false; };
  }, [submissionId]);

  const save = async () => {
    const trimmed = reason.trim();
    if (!detail) return;
    if (!machineId) { setError('Select a machine for this customer.'); return; }
    if (!trimmed) { setError('A reason for the correction is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await saveJobCardMachineAssociation(submissionId, { revision: detail.revision, machineId, reason: trimmed });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The machine could not be linked');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
    <div role="dialog" aria-modal="true" aria-label="Link to Machine" className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6">
      <h2 className="text-xl font-bold">Link to Machine</h2>
      <p className="my-2 text-sm text-gray-600">Customer: {detail?.customerName || 'Loading…'}. The job customer cannot be changed. The original report and machine hours stay as submitted.</p>
      {error && <p role="alert" className="my-2 text-sm text-red-700">{error}</p>}
      {detail && <p className="text-sm">Original machine: {detail.originalMachineLabel}. Effective machine: {detail.effectiveMachineLabel}.</p>}
      <div className="mt-3 max-h-64 space-y-1 overflow-auto">
        {(detail?.machines || []).map((machine) => (
          <button key={machine._id} type="button" className={`block w-full rounded border px-3 py-2 text-left text-sm ${machineId === machine._id ? 'bg-[#e8f4fc]' : ''}`} onClick={() => setMachineId(machine._id)}>{machine.label}</button>
        ))}
        {detail && !detail.machines.length && <p className="text-sm text-gray-500">No eligible machines are registered for this customer.</p>}
      </div>
      <label className="mt-3 block text-sm">Reason<textarea className="mt-1 w-full rounded border p-2" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={saving} className="rounded bg-amber-400 px-4 py-2 font-bold disabled:opacity-50" onClick={() => void save()}>{saving ? 'Saving…' : 'Save link'}</button>
        <button type="button" className="rounded border px-4 py-2" onClick={onClose}>Close</button>
      </div>
      <h3 className="mt-6 font-semibold">Link history</h3>
      {!detail?.history.length && <p className="text-sm">No machine links recorded.</p>}
      {detail?.history.map((entry) => <div key={entry.revision} className="border-t py-2 text-sm"><p>{new Date(entry.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} — {entry.administrator.name}</p><p>Reason: {entry.reason}</p><p>Machine: {entry.machineLabel}</p></div>)}
    </div>
  </div>;
}
