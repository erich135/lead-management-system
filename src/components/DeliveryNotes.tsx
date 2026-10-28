import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { archiveDeliveryNote, restoreDeliveryNote, listDeliveryNotes, openDeliveryNotePrint, getDeliveryNote, saveDeliveryDraft, assignDeliveryNote, getCustomers, getJobs, getTechnicians, getBranches, type DeliveryNoteListItem } from '../lib/api';
type Part = {
    itemId: string;
    description: string;
    partNumber: string;
    expectedQuantity: string;
    unit: string;
};
type Draft = {
    id?: string;
    revision: number;
    clientDraftId: string;
    customerId: string;
    customerName: string;
    jobId: string;
    branchId: string;
    technicianId: string;
    instructions: string;
    items: Part[];
};
const part = (): Part => ({ itemId: crypto.randomUUID(), description: '', partNumber: '', expectedQuantity: '', unit: '' });
const blank = (): Draft => ({ revision: 0, clientDraftId: crypto.randomUUID(), customerId: '', customerName: '', jobId: '', branchId: '', technicianId: '', instructions: '', items: [part()] });
const date = (s?: string) => s ? new Date(s).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : '';
const input = 'border border-slate-300 rounded-lg p-2 text-sm w-full';
export function DeliveryNotes({ archived = false, management = false }: {
    archived?: boolean;
    management?: boolean;
}) {
    const { hasPermission, isSuperAdmin } = useAuth();
    const canPrepare = isSuperAdmin || (hasPermission('jobs.create') && hasPermission('job_card_submissions.read'));
    const [tab, setTab] = useState(archived ? 'archived' : management ? 'outstanding' : 'completed');
    const [notes, setNotes] = useState<DeliveryNoteListItem[]>([]), [page, setPage] = useState(1), [total, setTotal] = useState(0), [search, setSearch] = useState(''), [outcome, setOutcome] = useState('');
    const [message, setMessage] = useState(''), [draft, setDraft] = useState<Draft | null>(null), [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const [customers, setCustomers] = useState<Array<{
        _id: string;
        name: string;
    }>>([]), [customerSearch, setCustomerSearch] = useState(''), [jobSearch, setJobSearch] = useState(''), [jobs, setJobs] = useState<Array<{
        _id: string;
        jobNumber: string;
        branch?: {
            _id: string;
        };
    }>>([]);
    const [techs, setTechs] = useState<Array<{
        _id: string;
        name: string;
    }>>([]), [branches, setBranches] = useState<Array<{
        _id: string;
        name: string;
    }>>([]);
    const [from, setFrom] = useState(''), [to, setTo] = useState(''), [technicianFilter, setTechnicianFilter] = useState('');
    const [viewed, setViewed] = useState<DeliveryNoteListItem | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<DeliveryNoteListItem | null>(null);
    async function load() {
        try {
            const r = await listDeliveryNotes({ page, search, status: tab === 'outstanding' ? 'outstanding' : 'completed', officeArchived: tab === 'archived' ? 'only' : 'exclude', outcome, from: from ? new Date(from + 'T00:00:00+02:00').toISOString() : '', to: to ? new Date(to + 'T23:59:59.999+02:00').toISOString() : '', technician: technicianFilter });
            setNotes(r.deliveryNotes);
            setTotal(r.pagination?.total || 0);
        }
        catch (e) {
            setMessage(String((e as Error).message));
        }
    }
    useEffect(() => { setTab(archived ? 'archived' : management ? 'outstanding' : 'completed'); setPage(1); }, [archived, management]);
    useEffect(() => { void load(); }, [page, search, tab, outcome, from, to, technicianFilter]);
    useEffect(() => {
        if (management && canPrepare) {
            void getTechnicians().then(r => setTechs(r.technicians.filter(t => t.isActive !== false))).catch(e => setMessage(e.message));
            void getBranches().then(r => setBranches(r.branches)).catch(e => setMessage(e.message));
        }
    }, [management, canPrepare]);
    async function run(action: () => Promise<void>) {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        setMessage('');
        try {
            await action();
        }
        catch (e) {
            setMessage((e as Error).message);
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    function patch(p: Partial<Draft>) { setDraft(d => d ? { ...d, ...p } : d); }
    async function save(assign: boolean) {
        if (!draft)
            return;
        await run(async () => {
            const body = { ...draft, items: draft.items.map(p => ({ ...p, expectedQuantity: p.expectedQuantity })), instructions: draft.instructions };
            const r = await saveDeliveryDraft(draft.id, body);
            const saved = r.deliveryNote;
            const next = { ...draft, id: saved._id, revision: saved.revision || 0 };
            setDraft(next);
            if (assign) {
                await assignDeliveryNote(saved._id, { ...body, revision: saved.revision });
                setDraft(null);
                setMessage('Delivery assigned. Its instruction is now locked.');
            }
            else
                setMessage('Draft saved.');
            await load();
        });
    }
    async function edit(id: string) { await run(async () => { const n = (await getDeliveryNote(id)).deliveryNote; setDraft({ id: n._id, revision: n.revision || 0, clientDraftId: 'existing-draft', customerId: n.customer || '', customerName: n.customerName, jobId: n.job || '', branchId: n.branch || '', technicianId: typeof n.assignedTechnician === 'string' ? n.assignedTechnician : n.assignedTechnician?._id || '', instructions: n.comments || '', items: (n.items || []).map(p => ({ ...p, partNumber: p.partNumber || '', unit: p.unit || '', expectedQuantity: String(p.expectedQuantity || '') })) }); }); }
    return <section className="bg-white rounded-lg shadow p-6">
 <div className="flex justify-between"><h1 className="text-2xl font-bold">Delivery Notes</h1>{management && canPrepare && !draft && <button className="bg-[#0969a9] text-white rounded-lg px-4 py-2" onClick={() => setDraft(blank())}>Create Delivery Note</button>}</div>
 {message && <p role="status" className="my-3 p-3 bg-blue-50">{message}</p>}
 {management && <div className="flex gap-4 my-4">{['outstanding', 'completed', 'archived'].map(t => <button key={t} className={tab === t ? 'font-bold text-[#0969a9]' : 'text-slate-600'} onClick={() => { setTab(t); setPage(1); }}>{t === 'outstanding' ? 'Active / outstanding' : t === 'completed' ? 'Completed' : 'Archived'}</button>)}</div>}
 {draft && <div className="my-4 border rounded-xl p-4 space-y-4"><fieldset disabled={busy}><h2 className="text-lg font-bold">{draft.id ? 'Edit delivery draft' : 'Create Delivery Note'}</h2>
 <label className="block">Customer (required)<div className="flex gap-2"><input aria-label="Customer search" className={input} value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Find customer"/><button onClick={() => void run(async () => setCustomers((await getCustomers({ search: customerSearch, limit: 50 })).customers))}>Find customer</button></div><select aria-label="Customer" className={input} value={draft.customerId} onChange={e => patch({ customerId: e.target.value, customerName: customers.find(c => c._id === e.target.value)?.name || '', jobId: '' })}><option value="">Choose customer</option>{draft.customerId && !customers.some(c => c._id === draft.customerId) && <option value={draft.customerId}>{draft.customerName}</option>}{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
 <label className="block">Branch<select aria-label="Branch" className={input} value={draft.branchId} onChange={e => patch({ branchId: e.target.value })}><option value="">Choose branch</option>{branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>
 <label className="block">Job (optional)<div className="flex gap-2"><input aria-label="Job search" className={input} value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search jobs for selected customer"/><button disabled={!draft.customerId} onClick={() => void run(async () => setJobs((await getJobs({ customer: draft.customerId, search: jobSearch, allTime: 'true', limit: 100 })).jobs))}>Find job</button></div><select aria-label="Job" className={input} value={draft.jobId} onChange={e => patch({ jobId: e.target.value, branchId: jobs.find(j => j._id === e.target.value)?.branch?._id || draft.branchId })}><option value="">No linked job</option>{draft.jobId && !jobs.some(j => j._id === draft.jobId) && <option value={draft.jobId}>{draft.jobId}</option>}{jobs.map(j => <option key={j._id} value={j._id}>{j.jobNumber}</option>)}</select></label>
 <h3 className="font-bold">Parts to deliver ({draft.items.length})</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Description *</th><th>Part number</th><th>Expected quantity *</th><th>Unit</th><th>Draft row actions</th></tr></thead><tbody>{draft.items.map((p, i) => <tr key={p.itemId}>{(['description', 'partNumber', 'expectedQuantity', 'unit'] as const).map(k => <td key={k}><input aria-label={`${k} ${i + 1}`} className={input} type={k === 'expectedQuantity' ? 'number' : 'text'} min={k === 'expectedQuantity' ? '0' : undefined} step="any" value={p[k]} onChange={e => patch({ items: draft.items.map(q => q.itemId === p.itemId ? { ...q, [k]: e.target.value } : q) })}/></td>)}<td className="whitespace-nowrap"><button aria-label={`Move part ${i + 1} up`} disabled={i === 0} onClick={() => { const a = [...draft.items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; patch({ items: a }); }}>?</button> <button aria-label={`Move part ${i + 1} down`} disabled={i === draft.items.length - 1} onClick={() => { const a = [...draft.items]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; patch({ items: a }); }}>?</button> <button onClick={() => patch({ items: draft.items.filter(q => q.itemId !== p.itemId) })}>Remove</button></td></tr>)}</tbody></table></div><button className="font-bold text-[#0969a9]" onClick={() => patch({ items: [...draft.items, part()] })}>Add Part</button>
 <label className="block">Technician<select aria-label="Technician" className={input} value={draft.technicianId} onChange={e => patch({ technicianId: e.target.value })}><option value="">Choose technician before assignment</option>{techs.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></label>
 <label className="block">Delivery instructions<textarea aria-label="Delivery instructions" className={input} value={draft.instructions} onChange={e => patch({ instructions: e.target.value })}/></label>
 <div className="flex gap-4"><button disabled={busy} onClick={() => void save(false)}>Save Draft</button><button disabled={busy} className="bg-[#0969a9] text-white rounded-lg px-4 py-2" onClick={() => void save(true)}>Assign to Technician</button><button disabled={busy} onClick={() => setDraft(null)}>Close editor</button></div></fieldset></div>}
 <div className="flex gap-3 my-4"><input className={input} aria-label="Search deliveries" placeholder="Search note, customer or reference" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/><select aria-label="Delivery outcome" value={outcome} onChange={e => { setOutcome(e.target.value); setPage(1); }}><option value="">All outcomes</option><option value="full">Full</option><option value="partial">Partial</option></select><input aria-label="Delivered from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}/><input aria-label="Delivered to" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}/><select aria-label="Filter technician" value={technicianFilter} onChange={e => { setTechnicianFilter(e.target.value); setPage(1); }}><option value="">All technicians</option>{techs.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select><span>{total} matching</span></div>
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Note</th><th>Customer / job</th><th>Technician</th><th>Assigned</th><th>Completed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{notes.map(n => <tr key={n._id} className="border-t"><td className="p-3 font-bold">{n.referenceNumber}</td><td>{n.customerName || 'Draft customer'}<br />{n.jobNumber || 'No linked job'}</td><td>{typeof n.assignedTechnician === 'object' ? n.assignedTechnician.name : `${n.reporter?.firstName || ''} ${n.reporter?.lastName || ''}`}</td><td>{date(n.assignedAt)}</td><td>{date(n.deliveredAt)}</td><td>{n.status === 'draft' ? 'Draft' : n.status === 'assigned' ? 'Assigned' : n.workflow !== 'office' ? 'Submitted (legacy)' : n.deliveryOutcome === 'partial' ? 'Partial' : 'Full'}</td><td className="space-x-3">{n.status === 'draft' && canPrepare ? <button onClick={() => void edit(n._id)}>Edit Draft</button> : n.status === 'assigned' ? <button onClick={() => void run(async () => setViewed((await getDeliveryNote(n._id)).deliveryNote))}>View instruction (locked)</button> : <><button onClick={() => void run(() => openDeliveryNotePrint(n._id))}>View & Print</button>{tab === 'archived' ? <button onClick={() => void run(async () => { await restoreDeliveryNote(n._id); await load(); })}>Restore</button> : <button onClick={() => setArchiveTarget(n)}>Archive</button>}</>}</td></tr>)}</tbody></table></div>
 {tab === 'outstanding' && <p className="text-sm text-slate-600 my-3">Assigned instructions cannot be amended. Agree any discrepancy with the technician and record it in the signed delivery exceptions. Prepare a separate draft for any subsequent authorised delivery; never replace their active instruction.</p>}
 <div className="flex gap-4 mt-4"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</button></div>
 {viewed && <div role="dialog" className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-8"><div className="bg-white p-6 rounded-xl max-w-4xl mx-auto"><h2>{viewed.referenceNumber} - Assigned instruction (read-only)</h2><p>{viewed.customerName} - {viewed.jobNumber || 'No linked job'}</p><p>{viewed.customerAddress}</p><p>{viewed.comments}</p><table className="w-full"><thead><tr><th>Description</th><th>Part number</th><th>Expected</th><th>Unit</th></tr></thead><tbody>{viewed.items?.map(p => <tr key={p.itemId}><td>{p.description}</td><td>{p.partNumber}</td><td>{p.expectedQuantity}</td><td>{p.unit}</td></tr>)}</tbody></table><button onClick={() => setViewed(null)}>Close instruction</button></div></div>}
        {archiveTarget && <div role="dialog" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white p-6 rounded-xl"><h2>Archive {archiveTarget.referenceNumber}?</h2><p>Its signed contents remain available and printable under Archived.</p><button disabled={busy} onClick={() => void run(async () => { await archiveDeliveryNote(archiveTarget._id); setArchiveTarget(null); await load(); })}>Confirm Archive</button><button onClick={() => setArchiveTarget(null)}>Cancel</button></div></div>}
 </section>;
}
