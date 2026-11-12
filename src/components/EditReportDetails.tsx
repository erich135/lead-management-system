import { useEffect, useState } from 'react';
import { getOfficeReportDetails, saveOfficeReportDetails, OFFICE_REPORT_FIELDS, type OfficeReportDetails, type OfficeReportKind, type OfficeReportValues, type OfficeReportPresentation } from '../lib/api';

export function OfficeReportDetailsSummary({ details }: { details?: OfficeReportPresentation }) {
  if (!details?.revision) return null;
  return <section className="jcr-block jcr-keep" data-office-corrections="">
    <div className="jcr-section-title">Office report details corrected</div>
    <table><tbody>{Object.entries(details.overrides).map(([key, value]) => <tr key={key}><td>{OFFICE_REPORT_FIELDS[key as keyof OfficeReportValues]}</td><td>{value || 'Unavailable'}</td></tr>)}</tbody></table>
    <p className="jcr-note">Original technician submission retained.</p>
  </section>;
}

export function officeReportCorrectionCommit(
  effective: OfficeReportValues,
  values: OfficeReportValues,
  reason: string,
): { requested: false; error: string } | { requested: true; changed: OfficeReportValues; reason: string } {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { requested: false, error: 'A reason for the correction is required.' };
  const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== effective[key as keyof OfficeReportValues])) as OfficeReportValues;
  if (Object.keys(changed).length === 0) return { requested: false, error: 'No report details changed.' };
  return { requested: true, changed, reason: trimmedReason };
}

export function EditReportDetails({ kind, id, onClose, onSaved }: { kind: OfficeReportKind; id: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [details, setDetails] = useState<OfficeReportDetails | null>(null);
  const [values, setValues] = useState<OfficeReportValues>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; getOfficeReportDetails(kind, id).then(data => { if (active) { setDetails(data); setValues(data.effective); } }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, [kind, id]);
  async function save() {
    if (!details) return;
    const commit = officeReportCorrectionCommit(details.effective, values, reason);
    if (!commit.requested) { setError(commit.error); return; }
    setSaving(true); setError('');
    try {
      const updated = await saveOfficeReportDetails(kind, id, details.revision, commit.changed, commit.reason);
      setDetails(updated); setValues(updated.effective); setReason('');
      await onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Correction could not be saved'); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 print:hidden">
    <div role="dialog" aria-modal="true" aria-label="Edit Report Details" className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
      <h2 className="text-xl font-bold">Edit Report Details{details ? ` — ${details.reference}` : ''}</h2>
      <p className="text-sm text-gray-600 my-3">Corrections apply to this report only. Original submissions, signatures and machine/customer records are retained.</p>
      {error && <p role="alert" className="text-red-700 my-2">{error}</p>}
      {!details && !error && <p>Loading report details…</p>}
      {details && <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.entries(OFFICE_REPORT_FIELDS).map(([key, label]) => <label key={key} className="text-sm">{label}<input className="block border rounded p-2 w-full" maxLength={500} value={values[key as keyof OfficeReportValues] || ''} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
        <label className="block text-sm mt-3">Reason for correction<textarea required maxLength={1000} className="block border rounded p-2 w-full" value={reason} onChange={event => setReason(event.target.value)} /></label>
        <div className="flex gap-3 mt-4"><button disabled={saving} className="bg-amber-400 rounded px-4 py-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save correction'}</button><button type="button" disabled={saving} onClick={onClose} className="border rounded px-4 py-2">Close</button></div>
        <h3 className="font-semibold mt-6">Correction history</h3>
        {!details.history.length && <p className="text-sm">No office corrections recorded.</p>}
        {details.history.map(entry => <div key={entry.revision} className="border-t py-3 text-sm"><p>{new Date(entry.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} (South Africa) — {entry.administrator.name}</p><p>Reason: {entry.reason}</p>{entry.changes.map(change => <p key={change.field}>{OFFICE_REPORT_FIELDS[change.field]} — Original: {change.originalValue || 'Unavailable'}; Previous: {change.previousValue || 'Unavailable'}; New: {change.newValue || 'Unavailable'}</p>)}</div>)}
      </form>}
      {!details && <button onClick={onClose} className="border rounded px-4 py-2 mt-4">Close</button>}
    </div>
  </div>;
}
