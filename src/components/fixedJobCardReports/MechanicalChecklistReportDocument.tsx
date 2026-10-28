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
  return <div className="jcr-sign-slot">{image ? <img src={image} alt="Signature" /> : null}</div>;
}

/**
 * Renders the filled Mechanical Checklist report as structured HTML tables.
 */
export function MechanicalChecklistReportDocument({
  sections: templateSections = [],
  resolver,
  header,
  reportNumber,
  photos,
}: MechanicalChecklistReportDocumentProps) {
  // Photo questions are printed as photographs below, never as answer cells.
  const sections = templateSections.map((s) =>
    sectionHasPhotoFields(s) ? { ...s, fields: nonPhotoFields(s.fields) } : s
  );
  const photoSections = partitionPhotoSections(templateSections);
  const headerSection = sections.find((s) => s.type === 'header');
  const checklistSection = sections.find((s) => s.type === 'checklist');
  const commentsSection = sections.find((s) => s.id === 'mc_comments');
  const signSection = sections.find((s) => s.type === 'signatures');
  const items = checklistSection?.items || [];
  const leftItems = items.filter((item) => item.number <= 27);
  const rightItems = items.filter((item) => item.number > 27);
  const headerFields = headerSection?.fields || [];
  // Two header rows. Up to 8 fields this is the original 4 + rest split; newer template
  // versions with extra hour readings (Load / Next Service Hours) widen the rows instead
  // of adding a third row, so the one-page print height is unchanged.
  const headerRowSize = Math.max(4, Math.ceil(headerFields.length / 2));
  const headerRows = [headerFields.slice(0, headerRowSize), headerFields.slice(headerRowSize)].filter((row) => row.length > 0);

  const renderChecklist = () => {
    const rowCount = Math.max(leftItems.length, rightItems.length);
    return (
      <table className="jcr-block">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>#</th>
            <th>Checklist</th>
            <th style={{ width: '10%' }}>Status</th>
            <th style={{ width: '16%' }}>Comments</th>
            <th style={{ width: '6%' }}>#</th>
            <th>Checklist</th>
            <th style={{ width: '10%' }}>Status</th>
            <th style={{ width: '16%' }}>Comments</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, index) => {
            const left = leftItems[index];
            const right = rightItems[index];
            return (
              <tr key={left?.id || right?.id || index}>
                <ChecklistCells item={left} resolver={resolver} />
                <ChecklistCells item={right} resolver={resolver} />
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="job-card-report">
      <JobCardReportHeader
        title="Mechanical Checklist on Compressors"
        reportNumber={reportNumber}
        header={header}
      />
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

      {renderChecklist()}

      {commentsSection?.fields?.[0] && (
        <table className="jcr-block">
          <tbody>
            <tr>
              <td className="jcr-comments">
                <StackedField
                  label="Overall comments"
                  value={resolver.resolve(commentsSection.fields[0])}
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
        <table className="jcr-block">
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
                <div className="jcr-sign-title">Client</div>
                <StackedField label="Name" value={resolver.resolve(signSection.fields[3])} />
                <div className="jcr-field-label">Signature</div>
                <SignatureSlot resolver={resolver} fieldId={signSection.fields[4]?.id} />
                <StackedField label="Date" value={resolver.resolve(signSection.fields[5])} />
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <table className="jcr-block">
        <tbody>
          <tr>
            <td colSpan={4} className="jcr-center" style={{ fontWeight: 700 }}>
              For office use only
            </td>
          </tr>
          <tr>
            <td>Workshop Manager</td>
            <td>Signature</td>
            <td>Date</td>
            <td>Reference / POD / Checked</td>
          </tr>
          <tr>
            <td className="jcr-write-in" colSpan={4} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ChecklistCells({
  item,
  resolver,
}: {
  item?: ChecklistItem;
  resolver: FixedJobCardFieldResolver;
}) {
  if (!item) {
    return (
      <>
        <td />
        <td />
        <td />
        <td />
      </>
    );
  }
  return (
    <>
      <td className="jcr-center">{item.number}</td>
      <td>{item.label}</td>
      <td className="jcr-center">{resolver.resolveChecklistStatus(item.id, item.inputType)}</td>
      <td>{resolver.resolveChecklistComment(item.id)}</td>
    </>
  );
}
