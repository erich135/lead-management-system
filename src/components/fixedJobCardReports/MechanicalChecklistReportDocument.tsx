import { JobCardReportHeader } from './JobCardReportHeader';
import type { HeaderConfig } from '../jobCardTypes';
import type { FixedJobCardFieldResolver } from '../../utils/fixedJobCardFieldResolver';

interface ChecklistItem {
  id: string;
  number: number;
  label: string;
  inputType?: string;
}

interface FixedFormField {
  id: string;
  label: string;
  type: string;
  jobFieldKey?: string;
  machineFieldKey?: string;
}

interface FixedFormSection {
  id: string;
  title: string;
  type: string;
  fields?: FixedFormField[];
  items?: ChecklistItem[];
}

interface MechanicalChecklistReportDocumentProps {
  sections?: FixedFormSection[];
  resolver: FixedJobCardFieldResolver;
  header: HeaderConfig;
  reportNumber?: string;
}

const cell = 'border border-black px-1 py-0.5 align-top text-[9px]';
const th = `${cell} bg-gray-100 font-semibold text-center`;

/**
 * Renders a captured signature image or fallback text in report cells.
 */
function SignatureCell({
  resolver,
  fieldId,
  fallback,
}: {
  resolver: FixedJobCardFieldResolver;
  fieldId?: string;
  fallback?: string;
}) {
  if (!fieldId) return <>{fallback || ''}</>;
  const image = resolver.resolveSignatureImage?.(fieldId);
  if (image) {
    return <img src={image} alt="Signature" className="inline-block max-h-10 max-w-[90px] object-contain" />;
  }
  return <>{fallback || ''}</>;
}

/**
 * Renders the filled Mechanical Checklist report as structured HTML tables (paper layout).
 */
export function MechanicalChecklistReportDocument({
  sections = [],
  resolver,
  header,
  reportNumber,
}: MechanicalChecklistReportDocumentProps) {
  const headerSection = sections.find((s) => s.type === 'header');
  const checklistSection = sections.find((s) => s.type === 'checklist');
  const commentsSection = sections.find((s) => s.id === 'mc_comments');
  const signSection = sections.find((s) => s.type === 'signatures');

  const items = checklistSection?.items || [];
  const leftItems = items.filter((i) => i.number <= 27);
  const rightItems = items.filter((i) => i.number > 27);

  /**
   * Renders one checklist column table (items 1–27 or 28–53).
   */
  const renderChecklistColumn = (columnItems: ChecklistItem[]) => (
    <table className="w-full border-collapse border border-black text-[9px]">
      <thead>
        <tr>
          <th className={`${th} w-8`}>#</th>
          <th className={`${th} text-left`}>Checklist</th>
          <th className={`${th} w-12`}>Status</th>
          <th className={`${th} w-24`}>Comments / Condition</th>
        </tr>
      </thead>
      <tbody>
        {columnItems.map((item) => (
          <tr key={item.id}>
            <td className={`${cell} text-center font-medium`}>{item.number}</td>
            <td className={cell}>{item.label}</td>
            <td className={`${cell} text-center font-bold`}>
              {resolver.resolveChecklistStatus(item.id, item.inputType)}
            </td>
            <td className={cell}>{resolver.resolveChecklistComment(item.id)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="job-card-report bg-white text-black p-4" style={{ width: '794px', maxWidth: '100%' }}>
      <JobCardReportHeader
        title="Mechanical Checklist on Compressors"
        reportNumber={reportNumber}
        header={header}
      />

      {/* Job info row */}
      <table className="w-full border-collapse border border-black mb-2 text-[9px]">
        <tbody>
          <tr>
            {headerSection?.fields?.slice(0, 4).map((field) => (
              <td key={field.id} className={cell}>
                <span className="font-semibold">{field.label}: </span>
                {resolver.resolve(field)}
              </td>
            ))}
          </tr>
          <tr>
            {headerSection?.fields?.slice(4).map((field) => (
              <td key={field.id} className={cell}>
                <span className="font-semibold">{field.label}: </span>
                {resolver.resolve(field)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="text-[9px] font-bold mb-1 border border-black px-1 py-0.5 bg-gray-50">Inspect:</p>

      {/* Two-column checklist */}
      <div className="grid grid-cols-2 gap-0 mb-3">
        <div className="border-r-0">{renderChecklistColumn(leftItems)}</div>
        <div>{renderChecklistColumn(rightItems)}</div>
      </div>

      {/* Overall comments */}
      {commentsSection?.fields?.[0] && (
        <table className="w-full border-collapse border border-black mb-3 text-[9px]">
          <tbody>
            <tr>
              <td className={`${cell} font-semibold w-32 bg-gray-50`}>Overall comments</td>
              <td className={cell} style={{ minHeight: '48px' }}>
                {resolver.resolve(commentsSection.fields[0])}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Signatures */}
      {signSection?.fields && (
        <table className="w-full border-collapse border border-black mb-3 text-[9px]">
          <thead>
            <tr>
              <th className={th} colSpan={2}>Technician</th>
              <th className={th} colSpan={2}>Client</th>
            </tr>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Signature / Date</th>
              <th className={th}>Name</th>
              <th className={th}>Signature / Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cell}>{resolver.resolve(signSection.fields[0])}</td>
              <td className={cell}>
                <SignatureCell resolver={resolver} fieldId={signSection.fields[1]?.id} />
                {signSection.fields[2] && ` · ${resolver.resolve(signSection.fields[2])}`}
              </td>
              <td className={cell}>{resolver.resolve(signSection.fields[3])}</td>
              <td className={cell}>
                <SignatureCell resolver={resolver} fieldId={signSection.fields[4]?.id} />
                {signSection.fields[5] && ` · ${resolver.resolve(signSection.fields[5])}`}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Office use */}
      <table className="w-full border-collapse border border-black text-[9px] bg-gray-100">
        <tbody>
          <tr>
            <td className={`${cell} font-semibold text-center`} colSpan={4}>
              For office use only
            </td>
          </tr>
          <tr>
            <td className={cell}>Workshop Manager</td>
            <td className={cell}>Signature</td>
            <td className={cell}>Date</td>
            <td className={cell}>Reference / POD / Checked</td>
          </tr>
          <tr>
            <td className={cell} colSpan={4} style={{ height: '24px' }} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
