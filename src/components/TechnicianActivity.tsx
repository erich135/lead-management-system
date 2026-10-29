import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Info, RefreshCw, Search, Smartphone, Users, X, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTechnicianActivity, getTechnicianAppRelease } from '../lib/api';
import { Tooltip } from './ui/Tooltip';
import {
  activityDate, deviceVersionKnown, filterTechnicians, observationFreshness, recordedActivities,
  reportingContact, technicianSummary, technicianVersion,
  type ActivitySort, type AppDeviceObservation, type TechnicianActivityResult, type TechnicianActivityRow, type VersionState,
} from '../lib/technicianActivity';

const versionHelp = 'Versions are last-reported native APK observations, not guaranteed current installations. Every known device is considered: one older reported build flags the technician, even if another phone is newer. Missing or incomplete reports are Unknown; timestamps show when they were observed. OTA JavaScript identity is separate.';
const activityHelp = 'Recently Active counts active technician records with a successful account/app login, a work event received, a Job Card accepted or a delivery completed/received in the last seven days. It is not online presence. Cards describe all records, independently of table filters.';

function Devices({ devices, referenceAt }: { devices: AppDeviceObservation[]; referenceAt: string }) {
  if (!devices.length) return <p className="text-sm text-neutral-500">Unknown — no device report has been received.</p>;
  return <div className="divide-y divide-neutral-200">{devices.map((d, i) => <section key={d._id} className="py-4 first:pt-0">
    <div className="flex items-center gap-2 text-sm font-medium text-neutral-800">Device {i + 1} · {d.deviceModel || 'Unknown model'}</div>
    <dl className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
      <dt className="text-neutral-500">Native APK</dt><dd className="font-medium">{deviceVersionKnown(d, referenceAt) ? `${d.nativeVersion} (${d.nativeBuild})` : 'Unknown'}</dd>
      <dt className="text-neutral-500">Device</dt><dd>{[d.manufacturer, d.deviceModel].filter(Boolean).join(' ') || 'Unknown'} · Android {d.androidVersion || 'Unknown'}</dd>
      <dt className="text-neutral-500">Server contact</dt><dd>{activityDate(d.lastReceivedAt)}<span className="block mt-0.5 text-neutral-500">{observationFreshness(d.lastReceivedAt, referenceAt)}</span></dd>
      <dt className="text-neutral-500">First received</dt><dd>{activityDate(d.firstReceivedAt)}</dd>
      <dt className="text-neutral-500">Installation ID</dt><dd className="break-all">{d.installationId}</dd>
      <dt className="text-neutral-500">Account ID</dt><dd className="break-all">{d.user}</dd>
      <dt className="text-neutral-500">OTA JavaScript</dt><dd className="break-all">{d.otaUpdateId || 'Bundled / not reported'}</dd>
      <dt className="text-neutral-500">OTA runtime</dt><dd>{d.otaRuntimeVersion || 'Unknown'} · {d.otaChannel || 'Unknown channel'}</dd>
    </dl>
  </section>)}</div>;
}

function DetailDrawer({ technician, devices, referenceAt, onClose }: {
  technician: TechnicianActivityRow | null; devices: AppDeviceObservation[]; referenceAt: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const [tab, setTab] = useState('Overview');
  const [docked] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const [top] = useState(() => Math.max(0, document.querySelector('nav')?.getBoundingClientRect().bottom || 0));
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (!docked) document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab' || docked) return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose, docked]);
  const activity = technician ? recordedActivities(technician, referenceAt) : [];
  return <div className="pointer-events-none fixed inset-0 z-[100] flex justify-end" style={docked ? { top } : undefined}>
    <div className="pointer-events-auto absolute inset-0 bg-neutral-900/25 xl:hidden" onClick={onClose} aria-hidden="true" />
    <aside ref={dialog} role="dialog" aria-modal={!docked} aria-labelledby="technician-detail-title" className="pointer-events-auto relative flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl xl:w-96 xl:shadow-none">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-6 py-5">
        <div><span aria-hidden="true" className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#0969a9] text-sm text-white">{(technician?.name || 'Device reports').split(/\s+/).slice(0,2).map(n=>n[0]).join('')}</span><p className="text-xs text-neutral-500">Technician details</p><h2 id="technician-detail-title" className="mt-1 text-xl font-semibold text-[#383838]">{technician?.name || 'Unlinked device reports'}</h2>
          {technician && <p className="mt-1 text-xs text-neutral-500">{technician.active ? 'Active' : 'Inactive'} technician record · {technician.outstanding} outstanding assignments</p>}</div>
        <button onClick={onClose} aria-label="Close technician details" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0969a9]"><X className="h-5 w-5" /></button>
      </header>
      <div className="flex gap-4 border-b border-neutral-200 px-5" role="tablist" aria-label="Technician detail sections">{['Overview','Devices','Job Cards','Activity'].map(label=><button key={label} role="tab" aria-selected={tab===label} onClick={()=>setTab(label)} className={`border-b-2 py-3 text-xs ${tab===label ? 'border-[#0969a9] font-medium text-[#0969a9]' : 'border-transparent text-neutral-500'}`}>{label}</button>)}</div>
      <div className="overflow-y-auto px-5 py-5" role="tabpanel" aria-label={tab}>
        {technician && tab === 'Overview' && <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs"><div><p className="text-neutral-500">App version</p><p className="mt-1 font-semibold">{devices.length ? Array.from(new Set(devices.map(d=>deviceVersionKnown(d,referenceAt) ? `${d.nativeVersion} (${d.nativeBuild})` : 'Unknown'))).join(' / ') : 'Unknown'}</p></div><div><p className="text-neutral-500">Last activity</p><p className="mt-1 font-semibold">{activityDate(activity[0]?.at)}</p></div><div><p className="text-neutral-500">Last server contact</p><p className="mt-1 font-semibold">{activityDate(reportingContact(technician,referenceAt).at)}</p></div><div><p className="text-neutral-500">Outstanding Job Cards</p><p className="mt-1 text-xl font-semibold">{technician.outstanding}</p></div></div>}
        {technician && tab === 'Job Cards' && <dl className="space-y-4 text-sm"><div><dt className="text-xs text-neutral-500">Job Cards</dt><dd>{technician.assigned} assigned ? {technician.started} started ? {technician.submitted} submitted</dd></div><div><dt className="text-xs text-neutral-500">Last completed</dt><dd>{technician.lastSubmission?.reportNumber || 'Unknown'}<span className="block text-xs text-neutral-500">Accepted {activityDate(technician.lastSubmission?.at)}</span></dd></div><div><dt className="text-xs text-neutral-500">Delivery Notes</dt><dd>{technician.deliveryAssigned} assigned ? {technician.deliveryCompleted} completed</dd></div></dl>}
        {technician && (tab === 'Overview' || tab === 'Activity') && <>
          {!technician.accountIds.length && <p className="mb-4 text-xs text-amber-800">No unambiguous account link. Account activity is Unknown.</p>}
          {tab === 'Activity' && <><h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Recorded activity</h3>
          <dl className="mt-3 grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
            <dt className="text-neutral-500">Last login</dt><dd>{activityDate(technician.lastLoginAt)}</dd>
            <dt className="text-neutral-500">Last app login</dt><dd>{activityDate(technician.lastAppLoginAt)}</dd>
            <dt className="text-neutral-500">Last work received</dt><dd>{activityDate(technician.lastWorkEvent?.receivedAt)}{technician.lastWorkEvent && <span className="block text-xs text-neutral-500">{technician.lastWorkEvent.action} · {technician.lastWorkEvent.subjectType}<br />Device time: {activityDate(technician.lastWorkEvent.deviceTime)}</span>}</dd>
            <dt className="text-neutral-500">Last server contact</dt><dd>{activityDate(reportingContact(technician, referenceAt).at)}</dd>
            <dt className="text-neutral-500">Job Cards</dt><dd>{technician.assigned} assigned · {technician.started} started · {technician.submitted} submitted</dd>
            <dt className="text-neutral-500">Last completed</dt><dd>{technician.lastSubmission?.reportNumber || 'Unknown'}<span className="block text-xs text-neutral-500">Accepted {activityDate(technician.lastSubmission?.at)}</span></dd>
            <dt className="text-neutral-500">Delivery Notes</dt><dd>{technician.deliveryAssigned} assigned · {technician.deliveryCompleted} completed<span className="block text-xs text-neutral-500">Last completion: {activityDate(technician.lastDeliveryAt)}</span>{!!technician.legacyDeliveryCount && <span className="block text-xs text-neutral-500">{technician.legacyDeliveryCount} legacy deliveries · received {activityDate(technician.lastLegacyDeliveryReceivedAt)}</span>}</dd>
            <dt className="text-neutral-500">Last audit record</dt><dd>{activityDate(technician.lastAuditAt)}</dd>
          </dl></>}
          <div className="mt-5 border-t border-neutral-200 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Activity sources</p>
            <ul className="mt-2 space-y-2 text-xs">{activity.map(a=><li key={a.source}><span className="text-neutral-600">{a.source}</span> · {activityDate(a.at)}{a.detail && <span className="block text-neutral-400">{a.detail}</span>}</li>)}{!activity.length && <li className="text-neutral-500">No qualifying activity recorded.</li>}</ul>
          </div>
        </>}
        {(tab === 'Overview' || tab === 'Devices') && <div className={technician ? 'mt-5 border-t border-neutral-200 pt-4' : ''}><h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Device observations · {devices.length}</h3><Devices devices={devices} referenceAt={referenceAt} /></div>}
      </div>
    </aside>
  </div>;
}

export function TechnicianActivity() {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<TechnicianActivityResult | null>(null);
  const [targetBuild, setTargetBuild] = useState<number | null>(null);
  const [releaseError, setReleaseError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [version, setVersion] = useState<'all' | VersionState>('all');
  const [sort, setSort] = useState<ActivitySort>('name-asc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [unmapped, setUnmapped] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const closeDrawer = useRef(() => { setSelected(null); setUnmapped(false); }).current;
  useEffect(() => {
    if (!isSuperAdmin) { setLoading(false); return; }
    let current = true;
    setLoading(true); setError(null);
    Promise.all([getTechnicianActivity(), getTechnicianAppRelease().catch(() => null)]).then(([result, release]) => {
      if (!current) return;
      setData(result);
      const build = release?.downloadEnabled && release.hasApk ? release.versionCode : null;
      setTargetBuild(Number.isSafeInteger(build) && (build ?? 0) > 0 ? build! : null);
      setReleaseError(!Number.isSafeInteger(build) || (build ?? 0) < 1);
    }).catch(e => { if (current) { setData(null); setTargetBuild(null); setError(e instanceof Error ? e.message : 'Could not load activity'); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [refresh, isSuperAdmin]);
  useEffect(() => { setPage(1); }, [query, active, version, sort, pageSize]);
  if (!isSuperAdmin) return <p className="p-6">Super administrator access is required.</p>;
  const referenceAt = data?.generatedAt || '';
  const summary = data ? technicianSummary(data.technicians, targetBuild, referenceAt) : null;
  const rows = data ? filterTechnicians(data.technicians, { query, active, version, sort, targetBuild, referenceAt }) : [];
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)), currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const technician = data?.technicians.find(t => t.id === selected) || null;
  const control = 'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-600 outline-none focus:border-[#0969a9] focus:ring-1 focus:ring-[#0969a9]';
  return <section className={`mx-auto max-w-[1440px] space-y-5 bg-white text-[#383838] ${(technician || unmapped) ? 'xl:pr-[384px]' : ''}`} aria-label="Technician Activity dashboard">
    <header className="flex items-start justify-between gap-4">
      <div><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">Technician Activity</h1><Tooltip content={versionHelp} position="bottom"><button aria-label="About reported app versions" className="mt-1 rounded p-1 text-neutral-400 hover:text-neutral-600"><Info className="h-4 w-4" /></button></Tooltip></div>
        <p className="mt-1 text-xs text-neutral-500">{data ? `Refreshed ${activityDate(data.generatedAt)}` : 'Waiting for recorded activity'} · South African time</p></div>
      <button disabled={loading} onClick={() => setRefresh(r=>r+1)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Activity could not be loaded: {error}</p>}
    <div className="grid gap-4 sm:grid-cols-3" aria-label="Technician summary">
      <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4" aria-label="Technicians summary"><div className="flex items-center justify-between"><h2 className="text-sm font-medium text-neutral-600">Technicians</h2><Users className="h-5 w-5 text-neutral-500" /></div><p className="mt-3 text-3xl font-semibold tabular-nums" data-metric="active">{loading || !summary ? '—' : summary.active}</p><p className="mt-2 text-xs text-neutral-500">Active technician records</p><p className="mt-1 text-xs text-neutral-400">{summary && !loading ? `${summary.inactive} inactive · ${data!.technicians.length} total records` : 'Recorded technician list'}</p></article>
      <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4" aria-label="Recently Active summary"><div className="flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-medium text-neutral-600">Recently Active<Tooltip content={activityHelp} position="bottom"><button aria-label="How recent activity is calculated" className="text-neutral-400"><Info className="h-3.5 w-3.5" /></button></Tooltip></h2><Zap className="h-5 w-5 text-emerald-600" /></div><p className="mt-3 text-3xl font-semibold tabular-nums text-emerald-700" data-metric="recent">{loading || !summary ? '—' : summary.recentlyActive}</p><p className="mt-2 text-xs text-neutral-500">Recorded activity in the last 7 days</p><p className="mt-1 text-xs text-neutral-400">Active technician records · not online status</p></article>
      <article className="rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4" aria-label="Need Update summary"><div className="flex items-center justify-between"><h2 className="text-sm font-medium text-neutral-600">Need Update</h2><AlertTriangle className="h-5 w-5 text-red-600" /></div><p className={`mt-3 text-3xl font-semibold tabular-nums text-red-700`} data-metric="outdated">{loading || !summary || !targetBuild ? '—' : summary.needUpdate}</p><p className="mt-2 text-xs text-neutral-500">Older reported native APK build{targetBuild ? ` · latest ${targetBuild}` : ''}</p><p className="mt-1 text-xs text-neutral-400" data-metric="unknown">{loading || !summary ? 'Version observations' : `${summary.unknown} active technicians with Unknown versions`}</p></article>
    </div>
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><span className="sr-only">Search technicians</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search technicians…" className={`${control} w-full pl-9`} /></label>
        <label><span className="sr-only">Active status</span><select aria-label="Active status" value={active} onChange={e=>setActive(e.target.value as typeof active)} className={control}><option value="all">All technicians</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label><span className="sr-only">App version filter</span><select aria-label="App version filter" value={version} onChange={e=>setVersion(e.target.value as typeof version)} className={control}><option value="all">All app versions</option><option value="current">Current</option><option value="outdated">Outdated</option><option value="unknown">Unknown</option></select></label>
        <label className="sm:ml-auto"><span className="sr-only">Sort technicians</span><select aria-label="Sort technicians" value={sort} onChange={e=>setSort(e.target.value as ActivitySort)} className={control}><option value="name-asc">Technician A–Z</option><option value="name-desc">Technician Z–A</option><option value="activity-desc">Latest activity</option><option value="activity-asc">Oldest activity</option><option value="outstanding-desc">Most outstanding</option><option value="outstanding-asc">Fewest outstanding</option></select></label>
      </div>
      {releaseError && !loading && <p role="status" className="border-b px-4 py-2 text-xs text-amber-800">Published APK metadata is unavailable. Current/outdated comparisons are Unknown.</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[13px] leading-tight" aria-label="Technician activity">
        <thead className="border-b border-neutral-200 bg-white text-xs font-semibold text-neutral-700"><tr><th scope="col" className="px-5 py-3">Technician</th><th scope="col" className="px-4 py-3">App version</th><th scope="col" className="px-4 py-3">Last activity</th><th scope="col" className="px-4 py-3">Last server contact</th><th scope="col" className="px-4 py-3 text-right">Outstanding Job Cards</th><th scope="col" className="px-5 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {loading && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-500" role="status">Loading technician activity…</td></tr>}
          {!loading && !error && !visible.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-500">No technicians match these filters.</td></tr>}
          {!loading && !error && visible.map(t => {
            const app = technicianVersion(t, targetBuild, referenceAt), activity = recordedActivities(t, referenceAt)[0], contact = reportingContact(t, referenceAt);
            const versions = app.known.filter((d, index, all) => all.findIndex(other => other.nativeBuild === d.nativeBuild && other.nativeVersion === d.nativeVersion) === index);
            return <tr key={t.id} data-technician-id={t.id} onClick={()=>setSelected(t.id)} className={`cursor-pointer ${selected === t.id ? 'bg-blue-50' : 'hover:bg-neutral-50'}`}>
              <td className="px-5 py-2"><div className="flex items-center gap-2.5"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0969a9]/10 text-[11px] font-medium text-[#0969a9]">{t.name.split(/\s+/).filter(Boolean).slice(0,2).map(n=>n[0]).join('')}</span><button onClick={e=>{e.stopPropagation();setSelected(t.id);}} className="text-left font-medium text-neutral-800 hover:text-[#0969a9] focus-visible:underline">{t.name}</button>{!t.active && <span className="ml-2 text-[11px] text-neutral-400">Inactive</span>}</div></td>
              <td className="px-4 py-2">{versions.length ? versions.slice(0,2).map((d,index)=><span key={`${d.nativeBuild}-${d.nativeVersion}`}><span className={targetBuild ? d.nativeBuild! < targetBuild ? 'font-medium text-red-700' : 'text-neutral-800' : 'text-neutral-500'}>{d.nativeVersion} ({d.nativeBuild})</span>{index < Math.min(versions.length,2)-1 && <span className="text-neutral-400"> · </span>}</span>) : <span className="text-neutral-500">Unknown</span>}{!!t.devices.length && <span className="mt-0.5 block text-[11px] text-neutral-400">{t.devices.length} {t.devices.length === 1 ? 'device' : 'devices'}{app.older.length ? ` · ${app.older.length} older report${app.older.length > 1 ? 's' : ''}` : ''}{app.unknown ? ' · includes Unknown' : app.state === 'current' ? ' · current reported build' : ''}{versions.length > 2 ? ` · +${versions.length-2} versions` : ''}</span>}</td>
              <td className="px-4 py-2"><span>{activityDate(activity?.at)}</span>{activity && <span className="mt-0.5 block text-[11px] text-neutral-400" title={activity.detail}>{activity.source}</span>}</td>
              <td className="px-4 py-2 text-neutral-600">{activityDate(contact.at)}</td>
              <td className="px-4 py-2 text-right font-medium tabular-nums">{t.outstanding}</td>
              <td className={`whitespace-nowrap px-5 py-2 text-xs ${contact.status === 'Recently contacted' ? 'text-emerald-700' : contact.status === 'Stale' ? 'text-neutral-600' : 'text-neutral-400'}`} title="Based on the latest reporting contact only; inspect every device in details.">{contact.status}</td>
            </tr>;
          })}
        </tbody>
      </table></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        <span aria-live="polite">{loading || !data ? 'Waiting for records' : `${rows.length ? (currentPage - 1) * pageSize + 1 : 0}–${Math.min(currentPage * pageSize, rows.length)} of ${rows.length} technicians`}</span>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows<select aria-label="Rows per page" className="rounded border border-neutral-200 bg-white px-1.5 py-1" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{[10,15,30].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
          <button disabled={currentPage===1 || loading} aria-label="Previous page" onClick={()=>setPage(p=>p-1)} className="rounded border border-neutral-200 p-1.5 hover:bg-neutral-50 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button><span>{currentPage} / {pages}</span><button disabled={currentPage===pages || loading} aria-label="Next page" onClick={()=>setPage(p=>p+1)} className="rounded border border-neutral-200 p-1.5 hover:bg-neutral-50 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button></div>
      </footer>
    </div>
    {!loading && !!data?.unmappedDevices.length && <button onClick={()=>setUnmapped(true)} className="text-xs text-neutral-500 underline hover:text-neutral-800">Unlinked account device reports ({data.unmappedDevices.length})</button>}
    {(technician || unmapped) && <DetailDrawer technician={technician} devices={technician?.devices || data?.unmappedDevices || []} referenceAt={referenceAt} onClose={closeDrawer} />}
  </section>;
}
