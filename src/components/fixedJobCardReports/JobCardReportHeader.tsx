import type { HeaderConfig } from '../jobCardTypes';

interface JobCardReportHeaderProps {
  title: string;
  reportNumber?: string;
  header: HeaderConfig;
}

/**
 * Company letterhead block used at the top of printed job card reports.
 */
export function JobCardReportHeader({ title, reportNumber, header }: JobCardReportHeaderProps) {
  const reportNumberLabel = reportNumber?.startsWith('MCC')
    ? 'MCC NO'
    : reportNumber?.startsWith('RSR')
      ? 'RSR NO'
      : 'REPORT NO';

  return (
    <div className="jcr-header mb-3">
      <div className="flex justify-between items-start gap-4 border-b-2 border-black pb-2">
        <div className="flex gap-3 items-start flex-1 min-w-0">
          {header.logoUrl ? (
            <img src={header.logoUrl} alt="Company logo" className="h-14 w-auto object-contain shrink-0" />
          ) : (
            <div className="shrink-0 w-14 h-14 border-2 border-[#0969a9] rounded flex items-center justify-center text-[8px] font-bold text-[#0969a9] text-center leading-tight p-1">
              AIR
              <br />
              ROTARY
            </div>
          )}
          <div className="text-[9px] leading-snug text-gray-800">
            <div className="font-bold text-[11px] text-black mb-1">{header.companyName}</div>
            {header.registrationNumber && <div>Reg No: {header.registrationNumber}</div>}
            {header.vatNumber && <div>VAT No: {header.vatNumber}</div>}
            {header.address && <div>{header.address}</div>}
            {header.city && <div>{header.city}</div>}
            {header.phone && <div>{header.phone}</div>}
            {header.email && <div>{header.email}</div>}
          </div>
        </div>
        {reportNumber && (
          <div className="text-right shrink-0">
            <div className="text-[9px] text-gray-600 mb-0.5">{reportNumberLabel}</div>
            <div className="text-lg font-bold text-red-700 border-2 border-red-700 px-2 py-0.5 inline-block">
              {reportNumber}
            </div>
          </div>
        )}
      </div>
      <h1 className="text-center font-bold text-sm uppercase tracking-wide mt-2 border border-black py-1 bg-gray-50">
        {title}
      </h1>
    </div>
  );
}
