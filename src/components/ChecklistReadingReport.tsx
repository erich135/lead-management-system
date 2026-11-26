import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { getMachineReadingPhotoUrl } from '../lib/api';
import type { ChecklistReportDocument } from './officeReadingReview';

interface ChecklistReadingReportProps {
  submissionId: string;
  report: ChecklistReportDocument;
  printOnOpen: boolean;
  onClose: () => void;
}

function formatWhen(value: string): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}

/** Screen and browser-print view of one approved checklist. There is no separate PDF download. */
export function ChecklistReadingReport({ submissionId, report, printOnOpen, onClose }: ChecklistReadingReportProps) {
  useEffect(() => {
    if (!printOnOpen) return;
    const timer = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(timer);
  }, [printOnOpen]);

  return (
    <div className="checklist-reading-report fixed inset-0 z-50 overflow-auto bg-slate-100">
      <div className="checklist-report-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Checklist report {report.reference}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded bg-[#383838] px-3 py-1.5 text-sm font-medium text-white"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
      <article className="checklist-report-sheet mx-auto my-6 max-w-3xl bg-white p-8 text-slate-900 shadow">
        <img src="/Logo.png" alt="Air Rotary Services" className="mb-4 h-12 w-auto object-contain" />
        <h1 className="text-xl font-bold">Generator Checklist Report</h1>
        <p className="mt-1 text-sm text-slate-600">Air Rotary Services</p>
        <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <ReportFact label="Reference" value={report.reference} />
          <ReportFact label="Customer" value={report.customerName} />
          <ReportFact label="Machine" value={report.machineLabel} />
          <ReportFact label="Serial number" value={report.serialNumber} />
          {report.assetNumber ? <ReportFact label="Asset" value={report.assetNumber} /> : null}
          <ReportFact label="Submitted hours" value={`${report.submittedHours.toLocaleString()} hrs`} />
          <ReportFact label="Approved hours" value={`${report.approvedHours.toLocaleString()} hrs`} />
          <ReportFact label="Submitted" value={formatWhen(report.submittedAt)} />
          <ReportFact label="Operator" value={report.operatorName} />
          <ReportFact label="Approved by" value={report.approvedBy} />
          <ReportFact label="Approved" value={formatWhen(report.approvedAt)} />
        </dl>
        {report.verificationNote ? (
          <p className="mt-4 text-sm"><span className="font-semibold">Approval note:</span> {report.verificationNote}</p>
        ) : null}
        <h2 className="mt-6 text-base font-bold">Checklist</h2>
        <ol className="mt-3 space-y-3">
          {report.items.map((item, index) => (
            <li key={item.id} className="checklist-report-item border-b border-slate-100 pb-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span>{index + 1}. {item.prompt}</span>
                <span className={`shrink-0 font-semibold ${item.answer === 'not-ok' ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {item.answer === 'not-ok' ? 'Not OK' : 'OK'}
                </span>
              </div>
              {item.answer === 'not-ok' ? (
                <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-950">
                  {item.explanation || 'No explanation was stored.'}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm">
          <span className="font-semibold">Out of commission:</span> {report.outOfCommission ? 'Yes' : 'No'}
          {report.outOfCommission && report.outOfCommissionReason ? ` — ${report.outOfCommissionReason}` : ''}
        </p>
        <figure className="checklist-report-photo mt-6">
          <figcaption className="mb-2 text-sm font-semibold">Hour-meter photograph</figcaption>
          <img
            src={getMachineReadingPhotoUrl(submissionId)}
            alt="Hour meter submitted with this reading"
            className="max-h-80 max-w-full border border-slate-200 object-contain"
          />
        </figure>
      </article>
    </div>
  );
}

function ReportFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
