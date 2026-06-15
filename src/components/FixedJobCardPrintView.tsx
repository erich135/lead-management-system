import { useRef, useState } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import type { FieldValueEntry } from '../utils/fixedJobCardValues';
import { createFixedJobCardFieldResolver } from '../utils/fixedJobCardFieldResolver';
import { getJobCardReportHeader } from '../utils/arsJobCardHeaderDefaults';
import { exportElementToPdf } from '../utils/exportJobCardPdf';
import { filterVisibleSections } from '../utils/fixedJobCardSections';
import { MechanicalChecklistReportDocument } from './fixedJobCardReports/MechanicalChecklistReportDocument';
import { RepairStatusReportDocument } from './fixedJobCardReports/RepairStatusReportDocument';

interface FixedJobCardPrintViewProps {
  template: {
    name: string;
    templateKey?: string;
    sections?: unknown[];
  };
  fieldValues: FieldValueEntry[];
  job?: Record<string, unknown>;
  machine?: Record<string, unknown>;
  reportNumber?: string;
  isPreviewSample?: boolean;
  onClose: () => void;
}

/**
 * Admin print preview for filled job cards — structured tables matching the paper report layout.
 */
export function FixedJobCardPrintView({
  template,
  fieldValues,
  job,
  machine,
  reportNumber,
  isPreviewSample = false,
  onClose,
}: FixedJobCardPrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const visibleSections = filterVisibleSections((template.sections || []) as never[]);
  const resolver = createFixedJobCardFieldResolver(fieldValues, job, machine, reportNumber);
  const header = getJobCardReportHeader();
  const isMechanical = template.templateKey === 'mechanical_checklist';

  /**
   * Downloads the on-screen filled report as PDF (WYSIWYG capture).
   */
  const handleDownloadPdf = async () => {
    const reportEl = printRef.current?.querySelector('.job-card-report') as HTMLElement | null;
    const target = reportEl || printRef.current;
    if (!target) return;

    scrollContainerRef.current?.scrollTo({ top: 0, left: 0 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    setExporting(true);
    try {
      const safeName = template.name.replace(/\s+/g, '_');
      await exportElementToPdf(
        target,
        `${safeName}_${reportNumber || 'filled'}.pdf`
      );
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Could not generate PDF. Please try Print instead.');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Opens the browser print dialog for the filled report.
   */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col job-card-print-root">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between print:hidden">
        <div>
          <h2 className="font-semibold text-gray-900">{template.name} — Filled Report</h2>
          {isPreviewSample && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 inline-block">
              Sample data — preview only, not a real submission
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-600 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible bg-gray-200 print:bg-white"
      >
        <div ref={printRef} className="mx-auto print:mx-0">
          {isMechanical ? (
            <MechanicalChecklistReportDocument
              sections={visibleSections as never[]}
              resolver={resolver}
              header={header}
              reportNumber={reportNumber}
            />
          ) : (
            <RepairStatusReportDocument
              sections={visibleSections as never[]}
              resolver={resolver}
              header={header}
              reportNumber={reportNumber}
            />
          )}
        </div>
      </div>
    </div>
  );
}
