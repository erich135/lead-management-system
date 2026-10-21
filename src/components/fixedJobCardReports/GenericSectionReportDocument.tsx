import { Fragment } from 'react';
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
  companionField?: FixedFormField;
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

/**
 * Label above a wrapping answer. An empty answer keeps its own line.
 */
function StackedField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="jcr-field-label">{label}</div>
      <div className="jcr-field-value">{value}</div>
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="jcr-section-title">{title}</div>;
}

/**
 * Generic report document for section-based job cards that do not have a
 * dedicated paper layout. Custom templates use this same renderer.
 */
export function GenericSectionReportDocument({
  templateName,
  sections = [],
  resolver,
  header,
  reportNumber,
}: GenericSectionReportDocumentProps) {
  const headerSection = sections.find((section) => section.type === 'header');
  const contentSections = sections.filter((section) => section.type !== 'header' && section.type !== 'signatures');
  const sigSection = sections.find((section) => section.type === 'signatures');

  return (
    <div className="job-card-report">
      <JobCardReportHeader title={templateName} reportNumber={reportNumber} header={header} />

      {headerSection?.fields && headerSection.fields.length > 0 && (
        <table className="jcr-block">
          <tbody>
            {chunkArray(headerSection.fields, 3).map((row) => (
              <tr key={row.map((field) => field.id).join('-')}>
                {row.map((field) => (
                  <td key={field.id}>
                    <StackedField label={field.label} value={resolver.resolve(field)} />
                  </td>
                ))}
                {row.length < 3 &&
                  Array.from({ length: 3 - row.length }).map((_, index) => (
                    <td key={`pad-${index}`} />
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {contentSections.map((section) => {
        if (section.type === 'fields') {
          return (
            <div key={section.id} className="jcr-block">
              <SectionTitle title={section.title} />
              <table>
                <tbody>
                  {chunkArray(section.fields || [], 2).map((row) => (
                    <tr key={row.map((field) => field.id).join('-')}>
                      {row.length === 1 ? (
                        <>
                          <td className="jcr-field-label" style={{ width: '22%' }}>{row[0].label}</td>
                          <td colSpan={3}>
                            <div className="jcr-field-value">{resolver.resolve(row[0])}</div>
                          </td>
                        </>
                      ) : (
                        row.map((field) => (
                          <Fragment key={field.id}>
                            <td className="jcr-field-label" style={{ width: '22%' }}>{field.label}</td>
                            <td style={{ width: '28%' }}>
                              <div className="jcr-field-value">{resolver.resolve(field)}</div>
                            </td>
                          </Fragment>
                        ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (section.type === 'yesno_list') {
          const hasPartNumber = section.fields?.some((field) => field.companionField);
          return (
            <div key={section.id} className="jcr-block">
              <SectionTitle title={section.title} />
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    {hasPartNumber && <th style={{ width: '24%' }}>Part Number</th>}
                    <th style={{ width: '12%' }}>Yes</th>
                    <th style={{ width: '12%' }}>No</th>
                  </tr>
                </thead>
                <tbody>
                  {(section.fields || []).map((field) => {
                    const val = resolver.resolve(field);
                    return (
                      <tr key={field.id}>
                        <td>{field.label}</td>
                        {hasPartNumber && (
                          <td>{field.companionField ? resolver.resolve(field.companionField) : ''}</td>
                        )}
                        <td className="jcr-center">{val === 'Yes' ? '✓' : ''}</td>
                        <td className="jcr-center">{val === 'No' ? '✓' : ''}</td>
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
            <div key={section.id} className="jcr-block">
              <SectionTitle title={section.title} />
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>#</th>
                    <th>Description</th>
                    <th style={{ width: '12%' }}>Pass</th>
                    <th style={{ width: '12%' }}>Fail</th>
                    <th style={{ width: '14%' }}>Value</th>
                    <th style={{ width: '22%' }}>Comments</th>
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
                        <td className="jcr-center">{item.number ?? ''}</td>
                        <td>{item.label}</td>
                        <td className="jcr-center">{isPass ? '✓' : ''}</td>
                        <td className="jcr-center">{isFail ? '✓' : ''}</td>
                        <td className="jcr-center">{isValue ? statusRaw : ''}</td>
                        <td>{resolver.resolveChecklistComment(item.id)}</td>
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
            new Set((section.rows || []).flatMap((row) => row.fields.map((field) => field.label)))
          );
          return (
            <div key={section.id} className="jcr-block">
              <SectionTitle title={section.title} />
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    {allColumns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(section.rows || []).map((row) => {
                    const fieldMap = new Map(row.fields.map((field) => [field.label, field]));
                    return (
                      <tr key={row.id}>
                        <td className="jcr-field-label">{row.label || ''}</td>
                        {allColumns.map((col) => {
                          const field = fieldMap.get(col);
                          return <td key={col}>{field ? resolver.resolve(field) : ''}</td>;
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

      {sigSection?.fields && sigSection.fields.length > 0 && (
        <div className="jcr-block">
          <SectionTitle title={sigSection.title} />
          <table>
            <tbody>
              {chunkArray(sigSection.fields, 3).map((row) => (
                <tr key={row.map((field) => field.id).join('-')}>
                  {row.map((field) => (
                    <td key={field.id}>
                      {field.type === 'signature' ? (
                        <>
                          <div className="jcr-field-label">{field.label}</div>
                          <div className="jcr-sign-slot">
                            {resolver.resolveSignatureImage?.(field.id) ? (
                              <img src={resolver.resolveSignatureImage(field.id) || ''} alt="Signature" />
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <StackedField label={field.label} value={resolver.resolve(field)} />
                      )}
                    </td>
                  ))}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, index) => (
                      <td key={`pad-${index}`} />
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
