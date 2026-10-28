import { JobCardReportHeader } from './JobCardReportHeader';
import { PhotoCompletenessNotice, PhotoSectionBlock } from './JobCardPhotoBlocks';
import type { HeaderConfig } from '../jobCardTypes';
import type { FixedJobCardFieldResolver } from '../../utils/fixedJobCardFieldResolver';
import {
  nonPhotoFields,
  partitionPhotoSections,
  sectionHasPhotoFields,
  type JobCardPhotoRenderData,
} from '../../utils/jobCardPhotos';

interface FixedFormField {
  id: string;
  label: string;
  type: string;
  jobFieldKey?: string;
  machineFieldKey?: string;
  options?: string[];
}

interface FixedFormSection {
  id: string;
  title: string;
  type: string;
  fields?: FixedFormField[];
  rows?: { id: string; label?: string; fields: FixedFormField[] }[];
}

interface RepairStatusReportDocumentProps {
  sections?: FixedFormSection[];
  resolver: FixedJobCardFieldResolver;
  header: HeaderConfig;
  reportNumber?: string;
  /** Photographs for Photo questions; omitted when the submission has none. */
  photos?: JobCardPhotoRenderData;
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

/**
 * Renders a captured signature image inside a fixed slot.
 */
function SignatureSlot({
  resolver,
  fieldId,
}: {
  resolver: FixedJobCardFieldResolver;
  fieldId?: string;
}) {
  const image = fieldId ? resolver.resolveSignatureImage?.(fieldId) : null;
  return (
    <div className="jcr-sign-slot">
      {image ? <img src={image} alt="Signature" /> : null}
    </div>
  );
}

/**
 * Renders the filled Repair Status Report as structured HTML tables.
 */
export function RepairStatusReportDocument({
  sections: templateSections = [],
  resolver,
  header,
  reportNumber,
  photos,
}: RepairStatusReportDocumentProps) {
  // Photo questions are printed as photographs below, never as answer cells.
  const sections = templateSections.map((s) =>
    sectionHasPhotoFields(s) ? { ...s, fields: nonPhotoFields(s.fields) } : s
  );
  const photoSections = partitionPhotoSections(templateSections);
  const headerSection = sections.find((s) => s.type === 'header');
  const serviceSection = sections.find((s) => s.id === 'rsr_service_type');
  const hiraSection = sections.find((s) => s.id === 'rsr_hira');
  const tempSection = sections.find((s) => s.id === 'rsr_temperatures');
  const tripSection = sections.find((s) => s.id === 'rsr_trip_settings');
  const pressSection = sections.find((s) => s.id === 'rsr_pressures');
  const generalSection = sections.find((s) => s.id === 'rsr_general');
  const workSection = sections.find((s) => s.id === 'rsr_work');
  const signSection = sections.find((s) => s.type === 'signatures' && s.id === 'rsr_signatures');
  const headerFields = headerSection?.fields || [];
  const headerRows = [headerFields.slice(0, 4), headerFields.slice(4)].filter((row) => row.length > 0);
  const serviceFields = serviceSection?.fields || [];
  const travelFields = workSection?.fields?.slice(1, 7) || [];

  return (
    <div className="job-card-report">
      <JobCardReportHeader title="Repair Status Report" reportNumber={reportNumber} header={header} />
      <PhotoCompletenessNotice photos={photos} />

      {headerRows.length > 0 && (
        <table className="jcr-block">
          <tbody>
            {headerRows.map((row) => (
              <tr key={row.map((field) => field.id).join('-')}>
                {row.map((field) => (
                  <td key={field.id}>
                    <StackedField label={field.label} value={resolver.resolve(field)} />
                  </td>
                ))}
                {headerRows[0] && row.length < headerRows[0].length && (
                  <td colSpan={headerRows[0].length - row.length} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {photoSections.afterHeader.map((section) => (
        <PhotoSectionBlock key={section.id} section={section} photos={photos} />
      ))}

      {serviceFields.length > 0 && (
        <table className="jcr-block">
          <thead>
            <tr>
              <th colSpan={6}>Reason for visit / call</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {serviceFields.slice(0, 3).map((field) => (
                <td key={field.id} colSpan={2}>
                  <StackedField label={field.label} value={resolver.resolve(field)} />
                </td>
              ))}
            </tr>
            {serviceFields[3] && (
              <tr>
                <td colSpan={6}>
                  <StackedField label={serviceFields[3].label} value={resolver.resolve(serviceFields[3])} />
                </td>
              </tr>
            )}
            {serviceFields.length > 4 && (
              <tr>
                {serviceFields.slice(4).map((field) => (
                  <td key={field.id} colSpan={3}>
                    <StackedField label={field.label} value={resolver.resolve(field)} />
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      )}

      {hiraSection?.fields && (
          <table className="jcr-block">
            <thead>
              <tr>
                <th colSpan={4}>Hazard Identification &amp; Risk Assessment</th>
              </tr>
              <tr>
                <th style={{ width: '10%' }}>#</th>
                <th>Question</th>
                <th style={{ width: '14%' }}>Yes</th>
                <th style={{ width: '14%' }}>No</th>
              </tr>
            </thead>
            <tbody>
              {hiraSection.fields.map((field, idx) => {
                const ans = resolver.resolve(field);
                return (
                  <tr key={field.id}>
                    <td className="jcr-center">{idx + 1}</td>
                    <td>{field.label}</td>
                    <td className="jcr-center">{ans === 'Yes' ? '✓' : ''}</td>
                    <td className="jcr-center">{ans === 'No' ? '✓' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      )}

      {tempSection?.rows?.map((row) => (
            <table key={row.id} className="jcr-block jcr-keep">
              <thead>
                <tr>
                  <th colSpan={2}>{row.label} (°C)</th>
                </tr>
              </thead>
              <tbody>
                {row.fields.map((field) => (
                  <tr key={field.id}>
                    <td>{field.label}</td>
                    <td className="jcr-center" style={{ width: '28%' }}>{resolver.resolve(field)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      ))}

      {tripSection?.fields && (
          <table className="jcr-block jcr-keep">
            <thead>
              <tr>
                <th colSpan={2}>Trip Settings (°C / kPA)</th>
              </tr>
            </thead>
            <tbody>
              {tripSection.fields.map((field) => (
                <tr key={field.id}>
                  <td>{field.label}</td>
                  <td className="jcr-center" style={{ width: '28%' }}>{resolver.resolve(field)}</td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
      {pressSection?.fields && (
          <table className="jcr-block jcr-keep">
            <thead>
              <tr>
                <th colSpan={2}>Pressures (PSI / kPA)</th>
              </tr>
            </thead>
            <tbody>
              {pressSection.fields.map((field) => (
                <tr key={field.id}>
                  <td>{field.label}</td>
                  <td className="jcr-center" style={{ width: '28%' }}>{resolver.resolve(field)}</td>
                </tr>
              ))}
            </tbody>
          </table>
      )}

      {generalSection?.fields && (
        <table className="jcr-block jcr-keep">
          <thead>
            <tr>
              <th colSpan={generalSection.fields.length || 1}>General Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {generalSection.fields.map((field) => (
                <td key={field.id}>
                  <StackedField label={field.label} value={resolver.resolve(field)} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {workSection?.fields && (
        <table className="jcr-block jcr-keep">
          <tbody>
            <tr>
              <td colSpan={3} className="jcr-comments">
                <StackedField
                  label="Comments — Work Done"
                  value={resolver.resolve(workSection.fields[0])}
                />
              </td>
            </tr>
            {chunk(travelFields, 3).map((row) => (
              <tr key={row.map((field) => field.id).join('-')}>
                {row.map((field) => (
                  <td key={field.id}>
                    <StackedField label={field.label} value={resolver.resolve(field)} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td colSpan={2}>
                <StackedField
                  label="Reason for waiting"
                  value={workSection.fields[7] ? resolver.resolve(workSection.fields[7]) : ''}
                />
              </td>
              <td>
                <StackedField
                  label="Was job completed?"
                  value={workSection.fields[8] ? resolver.resolve(workSection.fields[8]) : ''}
                />
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {photoSections.beforeSignOff.map((section) => (
        <PhotoSectionBlock key={section.id} section={section} photos={photos} />
      ))}

      {signSection?.fields && (
        <table className="jcr-block jcr-keep">
          <tbody>
            <tr>
              <td>
                <div className="jcr-sign-title">Technician</div>
                <StackedField label="Name" value={resolver.resolve(signSection.fields[0])} />
                <div className="jcr-field-label">Signature</div>
                <SignatureSlot resolver={resolver} fieldId={signSection.fields[1]?.id} />
                <StackedField label="Date" value={resolver.resolve(signSection.fields[2])} />
              </td>
              <td>
                <div className="jcr-sign-title">Customer</div>
                <StackedField label="Name" value={resolver.resolve(signSection.fields[3])} />
                <div className="jcr-field-label">Signature</div>
                <SignatureSlot resolver={resolver} fieldId={signSection.fields[4]?.id} />
                <StackedField label="Date" value={resolver.resolve(signSection.fields[5])} />
              </td>
              <td>
                <div className="jcr-sign-title">Closed W/S Supervisor</div>
                <div className="jcr-field-label">Signature</div>
                <SignatureSlot resolver={resolver} fieldId={signSection.fields[6]?.id} />
                <StackedField label="Date" value={resolver.resolve(signSection.fields[7])} />
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
