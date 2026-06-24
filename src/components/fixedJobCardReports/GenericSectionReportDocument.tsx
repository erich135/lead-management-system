import { JobCardReportHeader } from './JobCardReportHeader';
import type { HeaderConfig } from '../jobCardTypes';
import type { FixedJobCardFieldResolver } from '../../utils/fixedJobCardFieldResolver';

interface FixedFormField {
  id: string;
  label: string;
  type: string;
  jobFieldKey?: string;
  machineFieldKey?: string;
  options?: string[];
  unit?: string;
}

interface ChecklistItem {
  id: string;
  number?: number;
  label: string;
  inputType?: string;
  unit?: string;
}

interface MeasurementRow {
  id: string;
  label?: string;
  fields: FixedFormField[];
}

interface FixedFormSection {
  id: string;
  title: string;
  type: string;
  fields?: FixedFormField[];
  items?: ChecklistItem[];
  rows?: MeasurementRow[];
}

interface GenericSectionReportDocumentProps {
  templateName: string;
  sections?: FixedFormSection[];
  resolver: FixedJobCardFieldResolver;
  header: HeaderConfig;
  reportNumber?: string;
}

const cell = 'border border-black px-1.5 py-1 align-top text-[8px]';
const labelCell = `${cell} font-semibold bg-gray-50 w-[30%]`;
const th = `${cell} font-semibold bg-gray-200 text-center`;

/**
 * Generic report document renderer for any section-based job card template.
 * Renders header, fields, checklists, yesno lists, measurement tables and signatures.
 */
export function GenericSectionReportDocument({
  templateName,
  sections = [],
  resolver,
  header,
  reportNumber,
}: GenericSectionReportDocumentProps) {
  const headerSection = sections.find((s) => s.type === 'header');
  const contentSections = sections.filter((s) => s.type !== 'header' && s.type !== 'signatures');
  const sigSection = sections.find((s) => s.type === 'signatures');

  return (
    <div className="job-card-report bg-white text-black p-4" style={{ width: '794px', maxWidth: '100%' }}>
      <JobCardReportHeader title={templateName} reportNumber={reportNumber} header={header} />

      {/* Header / machine info */}
      {headerSection?.fields && headerSection.fields.length > 0 && (
        <table className="w-full border-collapse border border-black mb-2 text-[8px]">
          <tbody>
            {chunkArray(headerSection.fields, 3).map((row, ri) => (
              <tr key={ri}>
                {row.map((field) => (
                  <td key={field.id} className={cell} style={{ width: `${100 / 3}%` }}>
                    <span className="font-semibold block text-gray-600">{field.label}</span>
                    <div className="min-h-[14px] mt-0.5">{resolver.resolve(field)}</div>
                  </td>
                ))}
                {/* Pad last row if needed */}
                {row.length < 3 &&
                  Array.from({ length: 3 - row.length }).map((_, i) => (
                    <td key={`pad-${i}`} className={cell} />
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Content sections */}
      {contentSections.map((section) => {
        if (section.type === 'fields') {
          return (
            <div key={section.id} className="mb-2">
              <SectionTitle title={section.title} />
              <table className="w-full border-collapse border border-black text-[8px]">
                <tbody>
                  {chunkArray(section.fields || [], 2).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((field) => (
                        <>
                          <td key={`${field.id}-lbl`} className={labelCell} style={{ width: '20%' }}>
                            {field.label}
                          </td>
                          <td key={`${field.id}-val`} className={cell} style={{ width: '30%' }}>
                            <div className="min-h-[14px]">{resolver.resolve(field)}</div>
                          </td>
                        </>
                      ))}
                      {row.length < 2 && (
                        <>
                          <td className={labelCell} style={{ width: '20%' }} />
                          <td className={cell} style={{ width: '30%' }} />
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (section.type === 'yesno_list') {
          return (
            <div key={section.id} className="mb-2">
              <SectionTitle title={section.title} />
              <table className="w-full border-collapse border border-black text-[8px]">
                <thead>
                  <tr>
                    <th className={th} style={{ width: '60%' }}>Item</th>
                    <th className={th} style={{ width: '20%' }}>Yes</th>
                    <th className={th} style={{ width: '20%' }}>No</th>
                  </tr>
                </thead>
                <tbody>
                  {(section.fields || []).map((field) => {
                    const val = resolver.resolve(field);
                    const isYes = val === 'Yes';
                    const isNo = val === 'No';
                    return (
                      <tr key={field.id}>
                        <td className={cell}>{field.label}</td>
                        <td className={`${cell} text-center`}>{isYes ? '✓' : ''}</td>
                        <td className={`${cell} text-center`}>{isNo ? '✓' : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        if (section.type === 'checklist') {
          return (
            <div key={section.id} className="mb-2">
              <SectionTitle title={section.title} />
              <table className="w-full border-collapse border border-black text-[8px]">
                <thead>
                  <tr>
                    <th className={th} style={{ width: '6%' }}>#</th>
                    <th className={th} style={{ width: '54%' }}>Description</th>
                    <th className={th} style={{ width: '15%' }}>Pass</th>
                    <th className={th} style={{ width: '15%' }}>Fail</th>
                    <th className={th} style={{ width: '10%' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(section.items || []).map((item) => {
                    const statusRaw = resolver.resolveChecklistStatus(item.id, item.inputType);
                    const isPass = statusRaw === '✓';
                    const isFail = statusRaw === 'Fail';
                    const isValue = !isPass && !isFail && statusRaw !== 'N/A' && statusRaw !== '';
                    return (
                      <tr key={item.id}>
                        <td className={`${cell} text-center`}>{item.number ?? ''}</td>
                        <td className={cell}>{item.label}</td>
                        <td className={`${cell} text-center`}>{isPass ? '✓' : ''}</td>
                        <td className={`${cell} text-center`}>{isFail ? '✓' : ''}</td>
                        <td className={`${cell} text-center`}>{isValue ? statusRaw : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        if (section.type === 'measurement_table') {
          const allColumns = Array.from(
            new Set((section.rows || []).flatMap((r) => r.fields.map((f) => f.label)))
          );
          return (
            <div key={section.id} className="mb-2">
              <SectionTitle title={section.title} />
              <table className="w-full border-collapse border border-black text-[8px]">
                <thead>
                  <tr>
                    <th className={th} style={{ width: '25%' }}>Row</th>
                    {allColumns.map((col) => (
                      <th key={col} className={th}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(section.rows || []).map((row) => {
                    const fieldMap = new Map(row.fields.map((f) => [f.label, f]));
                    return (
                      <tr key={row.id}>
                        <td className={`${cell} font-semibold`}>{row.label || ''}</td>
                        {allColumns.map((col) => {
                          const field = fieldMap.get(col);
                          return (
                            <td key={col} className={`${cell} text-center`}>
                              {field ? resolver.resolve(field) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        return null;
      })}

      {/* Sign-off */}
      {sigSection?.fields && sigSection.fields.length > 0 && (() => {
        const nonPhotoFields = sigSection.fields.filter((f) => f.type !== 'photo');
        const photoFields = sigSection.fields.filter((f) => f.type === 'photo');
        return (
          <div className="mb-2">
            <SectionTitle title={sigSection.title} />
            {nonPhotoFields.length > 0 && (
              <table className="w-full border-collapse border border-black text-[8px]">
                <tbody>
                  {chunkArray(nonPhotoFields, 3).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((field) => (
                        <td key={field.id} className={cell}>
                          <span className="font-semibold block text-gray-600">{field.label}</span>
                          <div className="min-h-[20px] mt-0.5">
                            {field.type === 'signature'
                              ? (() => {
                                  const img = resolver.resolveSignatureImage?.(field.id);
                                  return img ? (
                                    <img src={img} alt="Signature" className="max-h-10 max-w-[90px] object-contain" />
                                  ) : null;
                                })()
                              : resolver.resolve(field)}
                          </div>
                        </td>
                      ))}
                      {row.length < 3 &&
                        Array.from({ length: 3 - row.length }).map((_, i) => (
                          <td key={`pad-${i}`} className={cell} />
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {photoFields.map((field) => {
              const img = resolver.resolveSignatureImage?.(field.id);
              return (
                <table key={field.id} className="w-full border-collapse border border-black text-[8px] mt-1">
                  <tbody>
                    <tr>
                      <td className={cell} style={{ width: '20%' }}>
                        <span className="font-semibold text-gray-600">{field.label}</span>
                      </td>
                      <td className={cell}>
                        {img ? (
                          <img src={img} alt={field.label} className="max-h-32 max-w-[160px] object-contain" />
                        ) : (
                          <span className="text-gray-400 italic">No photo captured</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="bg-gray-700 text-white text-[8px] font-semibold px-2 py-0.5 uppercase tracking-wide mb-0">
      {title}
    </div>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
