import { useEffect, useState } from 'react';
import { RefreshCw, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTechnicianActivity } from '../lib/api';
import { activityDate, observationFreshness, type AppDeviceObservation, type TechnicianActivityResult } from '../lib/technicianActivity';

function Devices({ devices, referenceAt }: { devices: AppDeviceObservation[]; referenceAt: string }) {
  if (!devices.length) return <p className="text-sm text-gray-500">Installed APK and device: Unknown — no app report received.</p>;
  return <div className="space-y-3">{devices.map(d => <div key={d._id} className="border-t pt-3 text-sm">
    <p className="font-medium">Last reported native APK: {d.nativeVersion || 'Unknown'} / build {d.nativeBuild ?? 'Unknown'}</p>
    <p className="text-xs text-gray-500">{observationFreshness(d.lastReceivedAt, referenceAt)}</p>
    <p>{[d.manufacturer, d.deviceModel].filter(Boolean).join(' ') || 'Unknown device'} · Android {d.androidVersion || 'Unknown'}</p>
    <p>Last successful reporting contact: {activityDate(d.lastReceivedAt)}</p>
    <p className="text-xs text-gray-500 break-all">Installation: {d.installationId} · Account: {d.user}</p>
    <p className="text-xs text-gray-500 break-all">OTA JavaScript: {d.otaUpdateId || 'Bundled / not reported'} · Runtime: {d.otaRuntimeVersion || 'Unknown'} · Channel: {d.otaChannel || 'Unknown'}</p>
  </div>)}</div>;
}

export function TechnicianActivity() {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<TechnicianActivityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!isSuperAdmin) { setLoading(false); return; }
    let current = true;
    setLoading(true); setError(null);
    getTechnicianActivity().then(result => { if (current) setData(result); })
      .catch(e => { if (current) { setData(null); setError(e instanceof Error ? e.message : 'Could not load activity'); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [refresh, isSuperAdmin]);
  if (!isSuperAdmin) return <p className="p-6">Super administrator access is required.</p>;
  const rows = data?.technicians.filter(t => t.name.toLowerCase().includes(query.trim().toLowerCase())) || [];
  return <section className="space-y-5 p-4 sm:p-6 text-[#383838]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="h-6 w-6" />Technician Activity</h1>
        <p className="text-sm text-gray-500">Recorded observations · South African time · {data ? `Refreshed ${activityDate(data.generatedAt)}` : 'Not loaded'}</p></div>
      <button disabled={loading} onClick={() => setRefresh(r=>r+1)} className="flex items-center gap-2 border rounded-lg px-3 py-2 disabled:opacity-50"><RefreshCw className="w-4 h-4" />Refresh</button>
    </div>
    <p className="text-sm bg-blue-50 border rounded-lg p-3">Native APK builds are application-reported observations, not installation attestations. OTA identifies JavaScript separately. Missing reports mean Unknown; observations older than 24 hours are marked stale. Contact times do not establish current connectivity or complete synchronization.</p>
    <label className="block text-sm">Find technician<input value={query} onChange={e=>setQuery(e.target.value)} className="block mt-1 border rounded-lg px-3 py-2 w-full sm:max-w-sm" placeholder="Technician name" /></label>
    {error && <p role="alert" className="text-red-700 border border-red-200 rounded-lg p-3">Activity could not be loaded: {error}</p>}
    {loading && <p role="status">Loading technician activity…</p>}
    {!loading && data && !rows.length && <p>No technicians match this view.</p>}
    {!loading && data && <div className="space-y-3">{rows.map(t=><details key={t.id} className="border rounded-lg bg-white p-4">
      <summary className="cursor-pointer"><span className="font-semibold">{t.name}</span> <span className="text-sm text-gray-500">· {t.active ? 'Active' : 'Inactive'} · {t.outstanding} outstanding Job Card assignments · {t.devices.length ? t.devices.map(d=>`${d.nativeVersion || 'Unknown'} / build ${d.nativeBuild ?? 'Unknown'} (${observationFreshness(d.lastReceivedAt, data.generatedAt)})`).join(', ') : 'APK Unknown'}</span></summary>
      <div className="grid lg:grid-cols-2 gap-5 mt-4">
        <div className="space-y-2 text-sm">
          {!t.accountIds.length && <p className="text-amber-800">No unambiguous account link. Account activity is Unknown.</p>}
          <p>Last account login: {activityDate(t.lastLoginAt)}</p><p>Last Job Card app login: {activityDate(t.lastAppLoginAt)}</p>
          <p>Assignments: {t.assigned} assigned · {t.started} started · {t.submitted} submitted</p>
          <p>Last accepted Job Card: {t.lastSubmission?.reportNumber || (t.lastSubmission ? 'Report' : 'Unknown')} · {activityDate(t.lastSubmission?.at)}</p>
          <p>Last received work event: {t.lastWorkEvent ? `${t.lastWorkEvent.action} (${t.lastWorkEvent.subjectType})` : 'Unknown'} · {activityDate(t.lastWorkEvent?.receivedAt)}</p>
          {t.lastWorkEvent && <p className="text-gray-500">Event device time: {activityDate(t.lastWorkEvent.deviceTime)}</p>}
          <p>Delivery Notes: {t.deliveryAssigned} assigned · {t.deliveryCompleted} completed · Last completion: {activityDate(t.lastDeliveryAt)}</p>
          {!!t.legacyDeliveryCount && <p>Legacy deliveries: {t.legacyDeliveryCount} · Last received: {activityDate(t.lastLegacyDeliveryReceivedAt)}</p>}
          <p>Last attributed audit record: {activityDate(t.lastAuditAt)}</p>
        </div><Devices devices={t.devices} referenceAt={data.generatedAt} />
      </div>
    </details>)}</div>}
    {!loading && !!data?.unmappedDevices.length && <details className="border rounded-lg p-4"><summary>App reports without a linked technician ({data.unmappedDevices.length})</summary><Devices devices={data.unmappedDevices} referenceAt={data.generatedAt} /></details>}
  </section>;
}
