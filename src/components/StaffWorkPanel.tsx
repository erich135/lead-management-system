import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { getJobs, getStaffWork, getStaffWorkHistory, type Job, type StaffWorkData, type StaffWorkDetail } from '../lib/api';

const CATEGORIES = [
  { key: 'new_job', label: 'New jobs created' },
  { key: 'quotation', label: 'Quoting steps' },
  { key: 'registration', label: 'Registration / parts steps' },
  { key: 'sent_to_invoice', label: 'Sent for invoicing' },
] as const;

type Preset = 'day' | 'week' | 'month' | 'year' | 'custom';

function sast(value: string): string {
  return new Date(value).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false });
}

function actionLabel(event: StaffWorkDetail): string {
  if (event.actionType === 'create') return 'New job created';
  return event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `Changed status to ${event.toStatus}`;
}

/**
 * Shared Staff Work view. Counts come from the recorded-work service.
 */
export function StaffWorkPanel({ onOpenJob, initialDate }: { onOpenJob?: (job: Job) => void; initialDate?: string }) {
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [preset, setPreset] = useState<Preset>('day');
  const [date, setDate] = useState(initialDate || today);
  const [from, setFrom] = useState(initialDate || today);
  const [to, setTo] = useState(initialDate || today);
  const [personId, setPersonId] = useState('all');
  const [toStatus, setToStatus] = useState('all');
  const [jobNumber, setJobNumber] = useState('');
  const [appliedJob, setAppliedJob] = useState('');
  const [drillPerson, setDrillPerson] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StaffWorkData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getStaffWorkHistory>> | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const result = await getStaffWork({
        preset,
        date,
        from: preset === 'custom' ? from : undefined,
        to: preset === 'custom' ? to : undefined,
        personId,
        toStatus,
        jobNumber: appliedJob,
        detailPersonId: drillPerson,
        category,
        page: nextPage,
      });
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'The report could not be loaded. These figures are not zero activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
    // Filters are applied together; job search is applied explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, date, from, to, personId, toStatus, appliedJob, drillPerson, category, page]);

  const reset = () => {
    setPreset('day');
    setDate(today);
    setFrom(today);
    setTo(today);
    setPersonId('all');
    setToStatus('all');
    setJobNumber('');
    setAppliedJob('');
    setDrillPerson('');
    setCategory('all');
    setPage(1);
    setHistory(null);
  };

  const openHistory = async (number: string) => {
    setError('');
    try {
      setHistory(await getStaffWorkHistory(number));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The job history could not be loaded.');
    }
  };

  const openJob = async (number: string) => {
    if (!onOpenJob) return;
    const result = await getJobs({ search: number, allTime: 'true', limit: 5 });
    const match = result.jobs.find((job) => job.jobNumber === number);
    if (match) onOpenJob(match);
  };

  const exportExcel = async () => {
    if (!data) return;
    const allDetails = [];
    let nextPage = 1;
    let pages = 1;
    while (nextPage <= pages && nextPage <= 40) {
      const result = await getStaffWork({
        preset, date, from: preset === 'custom' ? from : undefined, to: preset === 'custom' ? to : undefined,
        personId, toStatus, jobNumber: appliedJob, detailPersonId: drillPerson, category, page: nextPage,
      });
      allDetails.push(...result.details);
      pages = result.detailPages;
      nextPage += 1;
    }
    const book = XLSX.utils.book_new();
    const summary: Array<Array<string | number>> = [
      ['What work was recorded?'],
      [data.phrase],
      [`Performed by: ${data.people.find((person) => person.personId === personId)?.personName || 'All staff'}`],
      [`Status changed to: ${toStatus === 'all' ? 'All statuses' : toStatus}`],
      [`Job number: ${appliedJob || 'All jobs'}`],
      ['Numbers count different jobs. A job can appear in more than one column, so the columns must not be added together.'],
      ...(data.statusSelected ? [['This view contains status-change activity only. New jobs are not applicable because creating a job is a separate action.']] : []),
      ...(data.warning ? [[`${data.warning} These jobs cannot reliably be attributed to a person.`]] : []),
      [],
      ['Staff member', 'New jobs created', 'Quoting steps', 'Registration / parts steps', 'Sent for invoicing'],
      ...data.rows.map((row) => [row.personName, row.newJobs === null ? 'Not applicable' : row.newJobs, row.quotation, row.registration, row.sentToInvoice]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 20 }];
    summarySheet['E1'] = { t: 's', v: 'Open supporting details', l: { Target: '#Details!A1' } };
    XLSX.utils.book_append_sheet(book, summarySheet, 'Summary');
    const details = [
      ['These rows match the selected range and filters. They are the evidence for the summary counts.'],
      ['Job number', 'Staff member', 'Action time (Johannesburg)', 'Recorded action', 'Previous status', 'New status'],
      ...allDetails.map((event) => [event.jobNumber, event.personName, sast(event.at), actionLabel(event), event.fromStatus || '', event.toStatus || '']),
    ];
    const detailSheet = XLSX.utils.aoa_to_sheet(details);
    detailSheet['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 28 }, { wch: 36 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(book, detailSheet, 'Details');
    XLSX.writeFile(book, `Staff_Work_${date}.xlsx`);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <p className="text-xs font-bold tracking-wide text-[#096da2]">ARS / STAFF REPORT</p>
      <h3 className="text-xl font-bold text-ars-heading mt-1">What work was recorded?</h3>
      <p className="text-sm text-gray-600 mt-1">Jobs created and moved forward by each staff member.</p>
      {data && <p className="text-sm font-medium text-gray-900 mt-3">{data.phrase}</p>}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-gray-800">Date range
          <select value={preset} onChange={(event) => { setPreset(event.target.value as Preset); setPage(1); setDrillPerson(''); }} className="mt-1 block w-full rounded border border-gray-300 px-2 py-2 text-sm font-normal">
            <option value="day">Daily</option>
            <option value="week">Week to date</option>
            <option value="month">Month to date</option>
            <option value="year">Year to date</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {preset === 'custom' ? (
          <>
            <label className="text-sm font-semibold">From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="mt-1 block rounded border border-gray-300 px-2 py-2 text-sm font-normal" /></label>
            <label className="text-sm font-semibold">To<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="mt-1 block rounded border border-gray-300 px-2 py-2 text-sm font-normal" /></label>
          </>
        ) : (
          <label className="text-sm font-semibold">Reference date<input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} className="mt-1 block rounded border border-gray-300 px-2 py-2 text-sm font-normal" /></label>
        )}
        <label className="text-sm font-semibold">Performed by
          <select value={personId} onChange={(event) => { setPersonId(event.target.value); setPage(1); }} className="mt-1 block w-full rounded border border-gray-300 px-2 py-2 text-sm font-normal">
            <option value="all">All staff</option>
            {(data?.people || []).map((person) => <option key={person.personId} value={person.personId}>{person.personName}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Status changed to
          <select value={toStatus} onChange={(event) => { setToStatus(event.target.value); setPage(1); }} className="mt-1 block w-full rounded border border-gray-300 px-2 py-2 text-sm font-normal">
            <option value="all">All statuses</option>
            {(data?.statuses || []).map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Job number
          <input value={jobNumber} onChange={(event) => setJobNumber(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setAppliedJob(jobNumber.trim()); setPage(1); } }} className="mt-1 block rounded border border-gray-300 px-2 py-2 text-sm font-normal" />
        </label>
        <button type="button" onClick={() => { setAppliedJob(jobNumber.trim()); setPage(1); }} className="rounded border border-gray-300 px-3 py-2 text-sm">Search</button>
        <button type="button" onClick={reset} className="rounded border border-gray-300 px-3 py-2 text-sm">Reset filters</button>
        <button type="button" onClick={exportExcel} disabled={!data} className="rounded border border-gray-300 px-3 py-2 text-sm">Excel</button>
      </div>
      {error && <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error} The figures below are not shown as zero activity.</p>}
      {loading && <p className="mt-3 text-sm text-gray-600">Loading recorded work…</p>}
      {data && !error && (
        <>
          {data.statusSelected && <p className="mt-4 text-sm text-gray-800">This view contains status changes to {toStatus} only. New jobs are not applicable, because creating a job is a separate action.</p>}
          {data.warning && <p className="mt-3 rounded border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-950" data-testid="creation-coverage-warning">{data.warning} These jobs cannot reliably be attributed to a person.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[590px] text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-3">Staff member</th>
                  {CATEGORIES.map((item) => <th key={item.key} className="px-3 py-3 text-center">{item.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-gray-600">No qualifying action was recorded for this selection. Zero means no recorded action, not that nobody did any work.</td></tr>}
                {data.rows.map((row) => (
                  <tr key={row.personId} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-semibold">{row.personName}</td>
                    {CATEGORIES.map((item) => {
                      const value = item.key === 'new_job' ? row.newJobs : item.key === 'quotation' ? row.quotation : item.key === 'registration' ? row.registration : row.sentToInvoice;
                      const selected = drillPerson === row.personId && category === item.key;
                      return (
                        <td key={item.key} className="px-3 py-3 text-center">
                          {value === null ? <span className="text-gray-500">Not applicable</span> : value === 0 ? <span className="text-gray-400">0</span> : (
                            <button type="button" aria-pressed={selected} onClick={() => { setDrillPerson(row.personId); setCategory(item.key); setPage(1); }} className={`min-w-12 rounded px-2 py-1 text-lg font-bold underline ${selected ? 'bg-[#096da2] text-white' : 'bg-sky-50 text-[#00669c]'}`}>{value}</button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-600">Numbers count different jobs. Select a number to see the work behind it.</p>
          <p className="text-sm text-gray-600">A job can appear in more than one column. Do not add the columns together. Zero means no qualifying action was recorded, not that the person did no other work.</p>
          <details className="mt-4 border-t border-gray-200 pt-3 text-sm">
            <summary className="cursor-pointer font-semibold">What does each column mean?</summary>
            <dl className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
              <dt className="font-semibold">New jobs created</dt><dd>A completely new job was created. Reopening a job does not count.</dd>
              <dt className="font-semibold">Quoting steps</dt><dd>A job was moved to Quoted, Await PO or Sent to Client. It counts once here even if the person moved it through several of these statuses.</dd>
              <dt className="font-semibold">Registration / parts steps</dt><dd>A job was moved to Register, Parts Ordered, Parts in Stock or Parts Ready.</dd>
              <dt className="font-semibold">Sent for invoicing</dt><dd>A job was moved to Sent to Inv. This does not mean an invoice was issued.</dd>
              <dt className="font-semibold">Who gets credit?</dt><dd>The person who performed the action, on the date it was recorded. The assigned admin and manually entered quote date do not determine credit.</dd>
            </dl>
            <p className="mt-2 text-gray-600">This shows recorded job actions. Calls, preparation and other work without a recorded action are not measured.</p>
          </details>
          <p className="mt-3 text-sm text-gray-700">{data.coverageNote}</p>
          {data.unparsedCount > 0 && <p className="mt-2 text-sm text-amber-900">{data.unparsedCount} status change{data.unparsedCount === 1 ? '' : 's'} in this period could not be read and {data.unparsedCount === 1 ? 'is' : 'are'} not counted. That is not the same as a missing creation record.</p>}
          <div className="mt-6 border-t-2 border-gray-200 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold">Supporting details</h4>
                <p className="text-sm text-gray-600">{data.distinctJobs} different job{data.distinctJobs === 1 ? '' : 's'} · {data.recordedActions} recorded action{data.recordedActions === 1 ? '' : 's'}</p>
              </div>
              {drillPerson && <button type="button" onClick={() => { setDrillPerson(''); setCategory('all'); setPage(1); }} className="rounded border border-gray-300 px-3 py-2 text-sm">Close details</button>}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="bg-gray-50 text-left"><th className="px-3 py-2">Job number</th><th className="px-3 py-2">Person</th><th className="px-3 py-2">Action date/time</th><th className="px-3 py-2">Recorded action</th><th className="px-3 py-2">Previous status</th><th className="px-3 py-2">New status</th></tr></thead>
                <tbody>
                  {data.details.map((event) => (
                    <tr key={`${event.activityId}-${event.category}-${event.toStatus}`} className="border-t border-gray-100">
                      <td className="px-3 py-2"><button type="button" className="font-semibold text-[#00669c] underline" onClick={() => void openHistory(event.jobNumber)}>{event.jobNumber}</button></td>
                      <td className="px-3 py-2">{event.personName}</td>
                      <td className="px-3 py-2">{sast(event.at)}</td>
                      <td className="px-3 py-2">{actionLabel(event)}</td>
                      <td className="px-3 py-2">{event.fromStatus || ''}</td>
                      <td className="px-3 py-2">{event.toStatus || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.detailPages > 1 && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button>
                <span>Page {data.page} of {data.detailPages}</span>
                <button type="button" disabled={page >= data.detailPages} onClick={() => setPage(page + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
          {history && (
            <div className="mt-6 border-t-2 border-gray-200 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h4 className="text-lg font-bold">{history.jobNumber} — recorded history</h4>
                <div className="flex gap-2">
                  {history.jobId && onOpenJob && <button type="button" onClick={() => void openJob(history.jobNumber)} className="rounded border border-gray-300 px-3 py-2 text-sm">Open job</button>}
                  <button type="button" onClick={() => setHistory(null)} className="rounded border border-gray-300 px-3 py-2 text-sm">Close history</button>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700">{history.note}</p>
              {history.unparsed > 0 && <p className="mt-2 text-sm text-amber-900">{history.unparsed} recorded change{history.unparsed === 1 ? '' : 's'} for this job could not be read. The history below is not complete.</p>}
              <ol className="mt-3 divide-y divide-gray-200">
                {history.events.map((event) => (
                  <li key={`${event.activityId}-${event.at}-${event.toStatus}`} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
                    <span className="text-sm text-gray-600">{sast(event.at)}</span>
                    <span><strong className="block">{event.personName}</strong>{actionLabel(event)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
