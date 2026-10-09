import { useEffect, useState } from 'react';
import {
  archiveDeliveryNote,
  listDeliveryNotes,
  openDeliveryNotePrint,
  restoreDeliveryNote,
  type DeliveryNoteListItem,
} from '../lib/api';

function formatOfficeDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
}

/**
 * Office list of submitted delivery notes. There is no job, photo or approval action.
 */
export function DeliveryNotes({ archived = false }: { archived?: boolean }) {
  const [notes, setNotes] = useState<DeliveryNoteListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<DeliveryNoteListItem | null>(null);

  const load = async () => {
    try {
      const result = await listDeliveryNotes({
        search: search.trim(),
        from: from ? new Date(`${from}T00:00:00`).toISOString() : '',
        to: to ? new Date(`${to}T23:59:59`).toISOString() : '',
        page,
        officeArchived: archived ? 'only' : 'exclude',
      });
      setNotes(result.deliveryNotes || []);
      setTotal(result.pagination?.total || result.deliveryNotes?.length || 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delivery notes could not be loaded');
    }
  };

  useEffect(() => {
    void load();
  }, [archived, page, search, from, to]);

  return (
    <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-[#383838] mb-2">{archived ? 'Archived delivery notes' : 'Delivery Notes'}</h2>
      <p className="text-sm text-slate-600 mb-4">Submitted delivery notes stay here with their items and signatures.</p>
      {message ? <p className="text-sm mb-3 text-[#075a8f]">{message}</p> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search note, customer or reference" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} aria-label="Delivered from" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} aria-label="Delivered to" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="button" className="text-sm font-semibold text-[#0969a9]" onClick={() => { setSearch(''); setFrom(''); setTo(''); setPage(1); }}>Clear filters</button>
        <span className="text-sm text-slate-500">{total} matching</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2">Note</th>
            <th>Customer</th>
            <th>Technician</th>
            <th>Delivered</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={note._id} className="border-t border-slate-100">
              <td className="py-2 font-semibold">{note.referenceNumber || 'Delivery note'}</td>
              <td>{note.customerName}</td>
              <td>{`${note.reporter?.firstName || ''} ${note.reporter?.lastName || ''}`.trim()}</td>
              <td>{formatOfficeDate(note.deliveredAt)}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-4">
                  <button type="button" className="font-semibold text-[#0969a9]" onClick={() => void openDeliveryNotePrint(note._id)}>View & Print</button>
                  {archived ? (
                    <button type="button" className="font-semibold" onClick={() => void restoreDeliveryNote(note._id).then(() => { setMessage('Delivery note restored.'); return load(); })}>Restore</button>
                  ) : (
                    <button type="button" className="font-semibold" onClick={() => setArchiveTarget(note)}>Archive</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button type="button" disabled={page <= 1} className="font-semibold disabled:opacity-40" onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
        <span>Page {page}</span>
        <button type="button" disabled={notes.length < 25} className="font-semibold disabled:opacity-40" onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
      {archiveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold">Archive {archiveTarget.referenceNumber || 'this delivery note'}?</h3>
            <p className="mt-2 text-sm text-slate-600">It leaves the active list and stays available under Archived, with its items, comments and signatures kept.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-4 py-2 text-sm font-bold" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button type="button" className="rounded-lg bg-[#f7c12b] px-4 py-2 text-sm font-bold" onClick={() => void archiveDeliveryNote(archiveTarget._id).then(() => { setArchiveTarget(null); setMessage('Delivery note archived.'); return load(); })}>Archive</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
