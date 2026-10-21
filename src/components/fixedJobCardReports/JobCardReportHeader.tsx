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
    <div className="jcr-block">
      <div className="jcr-letterhead">
        <div className="jcr-brand">
          {header.logoUrl ? (
            <img src={header.logoUrl} alt="Air Rotary Services" className="jcr-logo" />
          ) : null}
          <div className="jcr-address">
            <div className="jcr-company">{header.companyName}</div>
            {header.address && <div>{header.address}</div>}
            {header.city && <div>{header.city}</div>}
          </div>
        </div>
        {reportNumber && (
          <div className="jcr-report-no">
            <div className="jcr-report-no-label">{reportNumberLabel}</div>
            <div className="jcr-report-no-value">{reportNumber}</div>
          </div>
        )}
      </div>
      <h1 className="jcr-doc-title">{title}</h1>
    </div>
  );
}
