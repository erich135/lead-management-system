import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import type { AdminWorkEvent, AdminWorkReport } from '../lib/api';

const CATEGORIES = [
  { key: 'new_job', label: 'New jobs', caption: 'Jobs this person created. Reopening an existing job does not count.' },
  { key: 'quotation', label: 'Quotation activity', caption: 'Jobs this person moved to Quoted, Await PO or Sent to Client.' },
  { key: 'registration', label: 'Registration activity', caption: 'Jobs this person moved to Register, Parts Ordered, Parts in Stock or Parts Ready.' },
  { key: 'sent_to_invoice', label: 'Sent to invoice', caption: 'Jobs this person moved to Sent to Inv. Invoiced is not included.' },
] as const;

const COUNTING_NOTE = 'Each job counts once per person in each category for the selected period. The same job can appear under more than one person or category, so these totals must not be added together as unique jobs.';

function sast(value: string): string {
  return new Date(value).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false });
}

/**
 * Desktop view of recorded work. Counts are distinct jobs; the table lists every event.
 */
export function AdminWorkActivityPanel({ work, referenceLabel }: { work: AdminWorkReport; referenceLabel: string }) {
  const [windowKey, setWindowKey] = useState<AdminWorkReport['windows'][number]['key']>('day');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key'] | 'all'>('all');
  const [personId, setPersonId] = useState('all');
  const selected = work.windows.find((item) => item.key === windowKey) || work.windows[0];
  const selectedCoverage = work.coverageByWindow?.find((item) => item.key === windowKey);
  const rows = work.counts[windowKey] || [];
  const details = useMemo(() => {
    return work.events.filter((event) => {
      if (personId !== 'all' && event.personId !== personId) return false;
      if (category !== 'all' && event.category !== category) return false;
      return eventInWindow(event, work, windowKey);
    });
  }, [work, windowKey, category, personId]);

  const exportDetails = () => {
    const book = XLSX.utils.book_new();
    const summaryRows: Array<Array<string | number>> = [
      ['Shows who created jobs or changed their status during the selected period.'],
      [selected.phrase || selected.label],
      ['New jobs: Jobs this person created. Reopening an existing job does not count.'],
      ['Quotation activity: Jobs this person moved to Quoted, Await PO or Sent to Client.'],
      ['Registration activity: Jobs this person moved to Register, Parts Ordered, Parts in Stock or Parts Ready.'],
      ['Sent to invoice: Jobs this person moved to Sent to Inv. Invoiced is not included.'],
      [`How this is counted: ${COUNTING_NOTE}`],
      ...(selectedCoverage?.warning ? [[`${selectedCoverage.warning} These jobs cannot reliably be attributed to a person.`]] : []),
      [],
      ['Person', 'New jobs', 'Quotation activity', 'Quoted', 'Await PO', 'Sent to Client', 'Registration activity', 'Sent to invoice'],
      ...rows.map((row) => [row.personName, row.newJobs, row.quotation, row.quoted, row.awaitPo, row.sentToClient, row.registration, row.sentToInvoice]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 42 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(book, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(details.map(detailRow)), 'Details');
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet([
        ...(work.coverageByWindow || []).map((item) => ({
          Window: work.windows.find((window) => window.key === item.key)?.phrase || item.key,
          'Jobs without creation activity': item.missingCreations,
          Warning: item.warning || '',
        })),
        { Window: 'Status history', 'Jobs without creation activity': '', Warning: work.coverageNote },
      ]),
      'Coverage',
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(work.exceptions.map((item) => ({ Job: item.jobNumber || '', Reason: item.reason }))),
      'Exceptions',
    );
    const safeName = (referenceLabel || 'report').replace(/[\\/:*?"<>|]/g, '-');
    XLSX.writeFile(book, `Recorded_Work_${safeName}.xlsx`);
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-ars-heading">Recorded work</h3>
        <p className="text-sm text-gray-800 mt-1">Shows who created jobs or changed their status during the selected period.</p>
        <p className="text-sm font-medium text-gray-900 mt-1">{selected.phrase || selected.label}</p>
        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          {CATEGORIES.map((item) => (
            <li key={item.key}><span className="font-semibold">{item.label}.</span> {item.caption}</li>
          ))}
        </ul>
        <details className="mt-3 text-sm text-gray-700">
          <summary className="cursor-pointer font-medium text-gray-900">How this is counted</summary>
          <p className="mt-2">{COUNTING_NOTE} Quoted, Await PO and Sent to Client are included in quotation activity and are also shown separately, so those three figures must not be added to the quotation total.</p>
        </details>
        {selectedCoverage?.warning && (
          <p className="text-sm text-amber-950 bg-amber-100 border border-amber-300 rounded px-3 py-2 mt-3" data-testid="creation-coverage-warning">
            {selectedCoverage.warning} These jobs cannot reliably be attributed to a person.
          </p>
        )}
        <p className="text-sm text-gray-700 mt-3">{work.coverageNote}</p>
        {work.statusNotes.map((note) => (
          <p key={note} className="text-sm text-amber-800 mt-1">{note}</p>
        ))}
      </div>
      <div className="px-6 py-3 flex flex-wrap gap-2">
        {work.windows.map((item) => (
          <button key={item.key} type="button" onClick={() => setWindowKey(item.key)} className={`px-3 py-2 rounded-lg text-xs border text-left max-w-full ${windowKey === item.key ? 'bg-ars-primary text-white border-ars-primary' : 'border-gray-300'}`}>
            <span className="block font-semibold">{item.key === 'day' ? 'Day' : item.key === 'week' ? 'Week to date' : item.key === 'month' ? 'Month to date' : 'Year to date'}</span>
            <span className="block whitespace-normal">{item.phrase || item.label}</span>
          </button>
        ))}
        <button type="button" onClick={exportDetails} className="ml-auto px-3 py-1 rounded border border-gray-300 text-xs">Excel details</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2">Person</th>
              <th className="px-4 py-2">New jobs</th>
              <th className="px-4 py-2">Quotation</th>
              <th className="px-4 py-2">Quoted</th>
              <th className="px-4 py-2">Await PO</th>
              <th className="px-4 py-2">Sent to Client</th>
              <th className="px-4 py-2">Registration</th>
              <th className="px-4 py-2">Sent to invoice</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.personId} className="border-t border-gray-100">
                <td className="px-4 py-2 font-semibold">
                  <button type="button" className="underline" onClick={() => setPersonId(row.personId)}>{row.personName}</button>
                </td>
                <td className="px-4 py-2">{row.newJobs}</td>
                <td className="px-4 py-2">{row.quotation}</td>
                <td className="px-4 py-2">{row.quoted}</td>
                <td className="px-4 py-2">{row.awaitPo}</td>
                <td className="px-4 py-2">{row.sentToClient}</td>
                <td className="px-4 py-2">{row.registration}</td>
                <td className="px-4 py-2">{row.sentToInvoice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 flex gap-2">
        <button type="button" onClick={() => { setPersonId('all'); setCategory('all'); }} className="text-xs underline">All details</button>
        {CATEGORIES.map((item) => (
          <button key={item.key} type="button" onClick={() => setCategory(item.key)} className="text-xs underline">{item.label}</button>
        ))}
      </div>
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Person</th>
              <th className="px-4 py-2">Time (Johannesburg)</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Previous</th>
              <th className="px-4 py-2">New</th>
              <th className="px-4 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {details.map((event) => (
              <tr key={`${event.activityId}-${event.toStatus || event.actionType}`} className="border-t border-gray-100">
                <td className="px-4 py-2">{event.jobNumber}</td>
                <td className="px-4 py-2">{event.personName}</td>
                <td className="px-4 py-2">{sast(event.at)}</td>
                <td className="px-4 py-2">{event.actionType === 'create' ? 'New job created' : 'Status change'}</td>
                <td className="px-4 py-2">{event.fromStatus || ''}</td>
                <td className="px-4 py-2">{event.toStatus || ''}</td>
                <td className="px-4 py-2">{event.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {work.exceptions.length > 0 && (
        <div className="px-6 py-3 text-xs text-amber-900 bg-amber-50">
          {work.exceptions.length} exception{work.exceptions.length === 1 ? '' : 's'} are not included in the counts.
          {' '}{work.exceptions.slice(0, 5).map((item) => item.jobNumber || item.reason).join('; ')}
        </div>
      )}
    </section>
  );
}

function eventInWindow(event: AdminWorkEvent, work: AdminWorkReport, key: AdminWorkReport['windows'][number]['key']): boolean {
  const window = work.windows.find((item) => item.key === key);
  if (!window) return false;
  const at = new Date(event.at).getTime();
  return at >= new Date(window.from).getTime() && at <= new Date(window.to).getTime();
}

function detailRow(event: AdminWorkEvent) {
  return {
    Job: event.jobNumber,
    Person: event.personName,
    'Time (Johannesburg)': sast(event.at),
    Action: event.actionType === 'create' ? 'New job created' : 'Status change',
    'Previous status': event.fromStatus || '',
    'New status': event.toStatus || '',
    Category: event.category,
    Evidence: event.evidence,
  };
}
