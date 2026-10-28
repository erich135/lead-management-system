import { useRef, useState } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import type { FieldValueEntry } from '../utils/fixedJobCardValues';
import { createFixedJobCardFieldResolver } from '../utils/fixedJobCardFieldResolver';
import { getJobCardReportHeader } from '../utils/arsJobCardHeaderDefaults';
import { exportElementToPdf } from '../utils/exportJobCardPdf';
import { filterVisibleSections } from '../utils/fixedJobCardSections';
import type { JobCardPhotoReport } from '../lib/api';
import { photoLoadCounts, type JobCardPhotoRenderData } from '../utils/jobCardPhotos';
import { useJobCardPhotoImages } from '../hooks/useJobCardPhotoImages';
import { JobCardPhotoLightbox } from './JobCardPhotoLightbox';
import { MechanicalChecklistReportDocument } from './fixedJobCardReports/MechanicalChecklistReportDocument';
import { RepairStatusReportDocument } from './fixedJobCardReports/RepairStatusReportDocument';
import { GenericSectionReportDocument } from './fixedJobCardReports/GenericSectionReportDocument';

interface FixedJobCardPrintViewProps {
  template: {
    name: string;
    templateKey?: string;
    layoutKey?: string;
    sections?: unknown[];
  };
  fieldValues: FieldValueEntry[];
  job?: Record<string, unknown>;
  machine?: Record<string, unknown>;
  reportNumber?: string;
  isPreviewSample?: boolean;
  /** When false, shows that the technician submitted without GPS. */
  hasSubmissionLocation?: boolean;
  /** Submission to load photographs from (office view of a real submission). */
  submissionId?: string;
  /** Photograph progress for the submission; absent when it has no photographs. */
  photoReport?: JobCardPhotoReport;
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
  hasSubmissionLocation,
  submissionId,
  photoReport,
  onClose,
}: FixedJobCardPrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null);
  const images = useJobCardPhotoImages(submissionId, photoReport);
  const photos: JobCardPhotoRenderData | undefined = photoReport?.hasManifest
    ? { report: photoReport, images, onOpen: setLightbox }
    : undefined;
  const photoLoad = photoLoadCounts(photoReport, images);
  const photosLoading = photoLoad.loading > 0;
  const visibleSections = filterVisibleSections((template.sections || []) as never[]);
  const resolver = createFixedJobCardFieldResolver(fieldValues, job, machine, reportNumber);
  const header = getJobCardReportHeader();
  const layoutKey = template.layoutKey || (template.templateKey === 'mechanical_checklist' || template.templateKey === 'repair_status_report' || template.templateKey === 'generator_b_service' || template.templateKey === 'dryer_sla' ? template.templateKey : 'generic');

  /**
   * Downloads the on-screen filled report as PDF (WYSIWYG capture).
   */
  const handleDownloadPdf = async () => {
    if (photosLoading) return;
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
    // Authenticated photographs are fetched with a token, so wait until they have all loaded
    // (or visibly failed) rather than printing empty frames.
    if (photosLoading) return;
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
          {hasSubmissionLocation === false && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded px-2 py-1 mt-1 inline-block">
              Location not enabled by technician — GPS was declined, blocked, or unavailable on their device
            </p>
          )}
          {photosLoading && (
            <p className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded px-2 py-1 mt-1 ml-1 inline-block">
              Loading photographs ({photoLoad.total - photoLoad.loading} of {photoLoad.total}) - printing is available once they have loaded
            </p>
          )}
          {hasSubmissionLocation === true && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 mt-1 inline-block">
              Technician enabled location — GPS was attached to this submission
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={photosLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting || photosLoading}
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
          {layoutKey === 'mechanical_checklist' ? (
            <MechanicalChecklistReportDocument
              sections={visibleSections as never[]}
              resolver={resolver}
              header={header}
              reportNumber={reportNumber}
              photos={photos}
            />
          ) : layoutKey === 'repair_status_report' ? (
            <RepairStatusReportDocument
              sections={visibleSections as never[]}
              resolver={resolver}
              header={header}
              reportNumber={reportNumber}
              photos={photos}
            />
          ) : (
            <GenericSectionReportDocument
              templateName={template.name}
              sections={visibleSections as never[]}
              resolver={resolver}
              header={header}
              reportNumber={reportNumber}
              photos={photos}
            />
          )}
        </div>
      </div>
      {lightbox && (
        <JobCardPhotoLightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
