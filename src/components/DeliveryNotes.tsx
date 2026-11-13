import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { archiveDeliveryNote, restoreDeliveryNote, listDeliveryNotes, openDeliveryNotePrint, getDeliveryNote, saveDeliveryDraft, assignDeliveryNote, correctAssignedDelivery, getCustomers, getCustomerSelectionStatus, searchDeliveryCustomerJobs, getTechnicians, getBranches, type DeliveryNoteListItem } from '../lib/api';
import {DeliveryLookup, type DeliveryLookupOption} from './DeliveryLookup';
import { deliveryNoteActions } from './deliveryNoteActions';
import { customerSearchLabel } from '../lib/customerAlias';
const findDeliveryCustomers = async (search:string):Promise<DeliveryLookupOption[]> => (await getCustomers({search,limit:50})).customers.map(c=>({id:c._id,label:customerSearchLabel(c)}));
type Part = {
    itemId: string;
    description: string;
    partNumber: string;
    expectedQuantity: string;
    unit: string;
};
type Draft = {
    id?: string;
    status?: 'draft' | 'assigned';
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
function InstructionDialog({ note, onClose }: { note: DeliveryNoteListItem; onClose: () => void }) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return <div role="dialog" aria-modal="true" aria-labelledby="delivery-instruction-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
        <div className="relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-800 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            <h2 id="delivery-instruction-title" className="pr-12 text-xl font-bold">{note.referenceNumber} — Assigned instruction</h2>
            <p className="mt-3">{note.customerName} — {note.jobNumber || 'No linked job'}</p>
            <p>{note.customerAddress}</p>
            <p className="my-3 whitespace-pre-wrap">{note.instruction?.instructions || note.comments || 'No office instructions'}</p>
            <table className="w-full text-sm"><thead><tr><th className="text-left">Description</th><th className="text-left">Part number</th><th className="text-left">Expected</th><th className="text-left">Unit</th></tr></thead><tbody>{(note.instruction?.items || note.items)?.map(p => <tr key={p.itemId} className="border-t"><td className="py-2">{p.description}</td><td>{p.partNumber}</td><td>{p.expectedQuantity}</td><td>{p.unit}</td></tr>)}</tbody></table>
            <div className="mt-6 flex justify-end"><button type="button" onClick={onClose} className="rounded-lg bg-[#0969a9] px-4 py-2 font-bold text-white">Close</button></div>
        </div>
    </div>;
}
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
    const [customerSearch,setCustomerSearch]=useState(''),[jobSearch,setJobSearch]=useState(''),[customerArchived,setCustomerArchived]=useState(false);
    const findDeliveryJobs=useCallback(async(search:string):Promise<DeliveryLookupOption[]>=>{if(!draft?.customerId)return [];return (await searchDeliveryCustomerJobs(draft.customerId,search)).jobs.map(j=>({id:j._id,label:j.statusName?`${j.jobNumber} — ${j.statusName}`:j.jobNumber}));},[draft?.customerId]);
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
            const r = await listDeliveryNotes({ page, search, status: tab === 'outstanding' ? 'outstanding' : tab === 'archived' ? 'any' : 'completed', officeArchived: tab === 'archived' ? 'only' : 'exclude', outcome, from: from ? new Date(from + 'T00:00:00+02:00').toISOString() : '', to: to ? new Date(to + 'T23:59:59.999+02:00').toISOString() : '', technician: technicianFilter });
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
            if (draft.status === 'assigned' && draft.id) {
                await correctAssignedDelivery(draft.id, body);
                setDraft(null);
                setMessage('Correction saved. The technician sees it after the phone refreshes this delivery online.');
                await load();
                return;
            }
            const r = await saveDeliveryDraft(draft.id, body);
            const saved = r.deliveryNote;
            const next = { ...draft, id: saved._id, revision: saved.revision || 0 };
            setDraft(next);
            if (assign) {
                await assignDeliveryNote(saved._id, { ...body, revision: saved.revision });
                setDraft(null);
                setMessage('Delivery assigned.');
            }
            else
                setMessage('Draft saved.');
            await load();
        });
    }
    async function edit(id: string) {
        await run(async () => {
            const n = (await getDeliveryNote(id)).deliveryNote;
            const customerId = n.customer || '';
            let archived = false;
            let searchName = n.customerName || '';
            if (customerId) {
                try {
                    const status = await getCustomerSelectionStatus(customerId);
                    archived = status.selectable === false;
                    if (archived) searchName = `${n.customerName || status.name} (Archived)`;
                } catch {
                    archived = false;
                }
            }
            setCustomerArchived(archived);
            setCustomerSearch(searchName);
            setJobSearch(n.jobNumber || '');
            const assigned = n.status === 'assigned';
            const sourceItems = assigned && n.instruction?.items?.length ? n.instruction.items : (n.items || []);
            setDraft({ id: n._id, status: assigned ? 'assigned' : 'draft', revision: n.revision || 0, clientDraftId: 'existing-draft', customerId, customerName: n.customerName, jobId: n.job || '', branchId: n.branch || '', technicianId: typeof n.assignedTechnician === 'string' ? n.assignedTechnician : n.assignedTechnician?._id || '', instructions: assigned ? (n.instruction?.instructions ?? n.comments ?? '') : (n.comments || ''), items: sourceItems.map(p => ({ ...p, partNumber: p.partNumber || '', unit: p.unit || '', expectedQuantity: String(p.expectedQuantity || '') })) });
        });
    }
    return <section className="bg-white rounded-lg shadow p-6">
 <div className="flex justify-between"><h1 className="text-2xl font-bold">Delivery Notes</h1>{management && canPrepare && !draft && <button className="bg-[#0969a9] text-white rounded-lg px-4 py-2" onClick={() => {setCustomerSearch('');setJobSearch('');setCustomerArchived(false);setDraft(blank());}}>Create Delivery Note</button>}</div>
 {message && <p role="status" className="my-3 p-3 bg-blue-50">{message}</p>}
 {management && <div className="flex gap-4 my-4">{['outstanding', 'completed', 'archived'].map(t => <button key={t} className={tab === t ? 'font-bold text-[#0969a9]' : 'text-slate-600'} onClick={() => { setTab(t); setPage(1); }}>{t === 'outstanding' ? 'Active / outstanding' : t === 'completed' ? 'Completed' : 'Archived'}</button>)}</div>}
 {draft && <div className="my-4 border rounded-xl p-4 space-y-4"><fieldset disabled={busy}><h2 className="text-lg font-bold">{draft.status === 'assigned' ? 'Correct assigned delivery' : draft.id ? 'Edit delivery draft' : 'Create Delivery Note'}</h2>
 {draft.status === 'assigned' && <p className="text-sm text-slate-600">Customer, job, branch and technician stay on this assignment. Parts and office instructions can be corrected until the note is signed.</p>}
 <div>Customer (required)<DeliveryLookup label="Customer search" value={customerSearch} selected={!!draft.customerId} disabled={draft.status === 'assigned'} search={findDeliveryCustomers} onChange={value=>{setCustomerSearch(value);if(!value.trim()){setCustomerArchived(false);setJobSearch('');patch({customerId:'',customerName:'',jobId:''});return;}if(customerArchived&&draft.customerId)return;setJobSearch('');patch({customerId:'',customerName:'',jobId:''});}} onSelect={c=>{setCustomerArchived(false);setCustomerSearch(c.label);setJobSearch('');patch({customerId:c.id,customerName:c.label,jobId:''});}}/>{customerArchived&&<p className="text-sm text-slate-600">Archived. This note keeps its original customer.</p>}</div>
 <label className="block">Branch<select aria-label="Branch" className={input} value={draft.branchId} disabled={draft.status === 'assigned'} onChange={e => patch({ branchId: e.target.value })}><option value="">Choose branch</option>{branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></label>
 <div>Job Number (optional)<DeliveryLookup key={draft.customerId} label="Job search" value={jobSearch} selected={!!draft.jobId} disabled={!draft.customerId || draft.status === 'assigned'} search={findDeliveryJobs} onChange={value=>{setJobSearch(value);patch({jobId:''});}} onSelect={j=>{setJobSearch(j.label);patch({jobId:j.id});}}/>{draft.jobId && draft.status !== 'assigned' && <button type="button" onClick={()=>{setJobSearch('');patch({jobId:''});}}>Clear linked job</button>}</div>
 <h3 className="font-bold">Parts to deliver ({draft.items.length})</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Description *</th><th>Part number</th><th>Expected quantity *</th><th>Unit</th><th>Draft row actions</th></tr></thead><tbody>{draft.items.map((p, i) => <tr key={p.itemId}>{(['description', 'partNumber', 'expectedQuantity', 'unit'] as const).map(k => <td key={k}><input aria-label={`${k} ${i + 1}`} className={input} type={k === 'expectedQuantity' ? 'number' : 'text'} min={k === 'expectedQuantity' ? '0' : undefined} step="any" value={p[k]} onChange={e => patch({ items: draft.items.map(q => q.itemId === p.itemId ? { ...q, [k]: e.target.value } : q) })}/></td>)}<td className="whitespace-nowrap"><button aria-label={`Move part ${i + 1} up`} disabled={i === 0} onClick={() => { const a = [...draft.items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; patch({ items: a }); }}>Up</button> <button aria-label={`Move part ${i + 1} down`} disabled={i === draft.items.length - 1} onClick={() => { const a = [...draft.items]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; patch({ items: a }); }}>Down</button> <button type="button" aria-label={`Remove part ${i + 1}`} onClick={() => patch({ items: draft.items.filter(q => q.itemId !== p.itemId) })}>Remove</button></td></tr>)}</tbody></table></div><button className="font-bold text-[#0969a9]" onClick={() => patch({ items: [...draft.items, part()] })}>Add Part</button>
 <label className="block">Technician<select aria-label="Technician" className={input} value={draft.technicianId} disabled={draft.status === 'assigned'} onChange={e => patch({ technicianId: e.target.value })}><option value="">Choose technician before assignment</option>{techs.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></label>
 <label className="block">Delivery instructions<textarea aria-label="Delivery instructions" className={input} value={draft.instructions} onChange={e => patch({ instructions: e.target.value })}/></label>
 <div className="flex gap-4">{draft.status === 'assigned' ? <button disabled={busy} className="bg-[#0969a9] text-white rounded-lg px-4 py-2" onClick={() => void save(false)}>Save correction</button> : <><button disabled={busy} onClick={() => void save(false)}>Save Draft</button><button disabled={busy} className="bg-[#0969a9] text-white rounded-lg px-4 py-2" onClick={() => void save(true)}>Assign to Technician</button></>}<button disabled={busy} onClick={() => setDraft(null)}>Close editor</button></div></fieldset></div>}
 <div className="flex gap-3 my-4"><input className={input} aria-label="Search deliveries" placeholder="Search note, customer or reference" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/><select aria-label="Delivery outcome" value={outcome} onChange={e => { setOutcome(e.target.value); setPage(1); }}><option value="">All outcomes</option><option value="full">Full</option><option value="partial">Partial</option></select><input aria-label="Delivered from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}/><input aria-label="Delivered to" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}/><select aria-label="Filter technician" value={technicianFilter} onChange={e => { setTechnicianFilter(e.target.value); setPage(1); }}><option value="">All technicians</option>{techs.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select><span>{total} matching</span></div>
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Note</th><th>Customer / job</th><th>Technician</th><th>Assigned</th><th>Completed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{notes.map(n => { const actions = deliveryNoteActions(n, tab); return <tr key={n._id} className="border-t"><td className="p-3 font-bold">{n.referenceNumber}</td><td>{n.customerName || 'Draft customer'}<br />{n.jobNumber || 'No linked job'}</td><td>{typeof n.assignedTechnician === 'object' ? n.assignedTechnician.name : `${n.reporter?.firstName || ''} ${n.reporter?.lastName || ''}`}</td><td>{date(n.assignedAt)}</td><td>{date(n.deliveredAt)}</td><td>{n.status === 'draft' ? 'Draft' : n.status === 'assigned' ? 'Assigned' : n.workflow !== 'office' ? 'Submitted (legacy)' : n.deliveryOutcome === 'partial' ? 'Partial' : 'Full'}</td><td className="space-x-3">{actions.edit && canPrepare ? <button onClick={() => void edit(n._id)}>Edit</button> : null}{actions.view ? <button onClick={() => void run(async () => setViewed((await getDeliveryNote(n._id)).deliveryNote))}>View instruction</button> : null}{actions.print ? <button onClick={() => void run(() => openDeliveryNotePrint(n._id))}>View & Print</button> : null}{actions.restore ? <button onClick={() => void run(async () => { await restoreDeliveryNote(n._id); await load(); })}>Restore</button> : null}{actions.archive ? <button onClick={() => setArchiveTarget(n)}>Archive</button> : null}</td></tr>; })}</tbody></table></div>
 {tab === 'outstanding' && <p className="text-sm text-slate-600 my-3">Drafts and assigned notes can be corrected until they are signed. A completed note is read-only. The technician receives a corrected instruction the next time the phone refreshes online. A draft already on the phone keeps entered quantities for the same parts, and a signed or queued submission is not replaced. Archive removes a note from this list without deleting it.</p>}
 <div className="flex gap-4 mt-4"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</button></div>
 {viewed && <InstructionDialog note={viewed} onClose={() => setViewed(null)} />}
        {archiveTarget && <div role="dialog" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white p-6 rounded-xl max-w-md"><h2>Archive {archiveTarget.referenceNumber}?</h2><p className="my-3 text-sm">{archiveTarget.status === 'assigned' ? 'The note leaves Active / outstanding. The technician will no longer be offered it. A copy already on their phone is not deleted, and a later submission will not change this note.' : archiveTarget.status === 'draft' ? 'The draft leaves Active / outstanding and remains under Archived. Nothing is deleted.' : 'Its signed contents remain available and printable under Archived. Nothing is deleted.'}</p><button disabled={busy} onClick={() => void run(async () => { await archiveDeliveryNote(archiveTarget._id); setArchiveTarget(null); await load(); })}>Confirm Archive</button><button onClick={() => setArchiveTarget(null)}>Cancel</button></div></div>}
 </section>;
}
