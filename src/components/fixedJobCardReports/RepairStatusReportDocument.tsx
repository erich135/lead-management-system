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
}

const cell = 'border border-black px-1 py-0.5 align-top text-[8px]';
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
 * Renders the filled Repair Status Report as structured HTML tables matching the paper layout.
 */
export function RepairStatusReportDocument({
  sections = [],
  resolver,
  header,
  reportNumber,
}: RepairStatusReportDocumentProps) {
  const headerSection = sections.find((s) => s.type === 'header');
  const serviceSection = sections.find((s) => s.id === 'rsr_service_type');
  const hiraSection = sections.find((s) => s.id === 'rsr_hira');
  const tempSection = sections.find((s) => s.id === 'rsr_temperatures');
  const tripSection = sections.find((s) => s.id === 'rsr_trip_settings');
  const pressSection = sections.find((s) => s.id === 'rsr_pressures');
  const generalSection = sections.find((s) => s.id === 'rsr_general');
  const workSection = sections.find((s) => s.id === 'rsr_work');
  const signSection = sections.find((s) => s.type === 'signatures' && s.id === 'rsr_signatures');

  return (
    <div className="job-card-report bg-white text-black p-4" style={{ width: '794px', maxWidth: '100%' }}>
      <JobCardReportHeader title="Repair Status Report" reportNumber={reportNumber} header={header} />

      {/* Job / machine header */}
      <table className="w-full border-collapse border border-black mb-2 text-[8px]">
        <tbody>
          <tr>
            {headerSection?.fields?.slice(0, 4).map((field) => (
              <td key={field.id} className={cell}>
                <span className="font-semibold">{field.label}</span>
                <div className="min-h-[14px] mt-0.5">{resolver.resolve(field)}</div>
              </td>
            ))}
          </tr>
          <tr>
            {headerSection?.fields?.slice(4).map((field) => (
              <td key={field.id} className={cell}>
                <span className="font-semibold">{field.label}</span>
                <div className="min-h-[14px] mt-0.5">{resolver.resolve(field)}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Service type */}
      {serviceSection?.fields && (
        <table className="w-full border-collapse border border-black mb-2 text-[8px]">
          <thead>
            <tr>
              <th className={th} colSpan={6}>Reason for visit / call</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {serviceSection.fields.slice(0, 3).map((field) => (
                <td key={field.id} className={cell} colSpan={2}>
                  <span className="font-semibold">{field.label}: </span>
                  {resolver.resolve(field)}
                </td>
              ))}
            </tr>
            <tr>
              <td className={cell} colSpan={6}>
                <span className="font-semibold">
                  {serviceSection.fields[3]?.label}:{' '}
                </span>
                {resolver.resolve(serviceSection.fields[3])}
              </td>
            </tr>
            <tr>
              {serviceSection.fields.slice(4).map((field) => (
                <td key={field.id} className={cell} colSpan={3}>
                  <span className="font-semibold">{field.label}: </span>
                  {resolver.resolve(field)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* HIRA */}
        {hiraSection?.fields && (
          <div>
            <p className="text-[8px] font-bold mb-1">Hazard Identification &amp; Risk Assessment</p>
            <table className="w-full border-collapse border border-black text-[8px]">
              <thead>
                <tr>
                  <th className={`${th} w-6`}>#</th>
                  <th className={`${th} text-left`}>Question</th>
                  <th className={`${th} w-10`}>Yes</th>
                  <th className={`${th} w-10`}>No</th>
                </tr>
              </thead>
              <tbody>
                {hiraSection.fields.map((field, idx) => {
                  const ans = resolver.resolve(field);
                  return (
                    <tr key={field.id}>
                      <td className={`${cell} text-center`}>{idx + 1}</td>
                      <td className={cell}>{field.label}</td>
                      <td className={`${cell} text-center`}>{ans === 'Yes' ? '✓' : ''}</td>
                      <td className={`${cell} text-center`}>{ans === 'No' ? '✓' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Technical readings column */}
        <div className="space-y-2">
          {tempSection?.rows?.map((row) => (
            <div key={row.id}>
              <p className="text-[8px] font-bold mb-0.5">{row.label} (°C)</p>
              <table className="w-full border-collapse border border-black text-[8px]">
                <tbody>
                  {row.fields.map((field) => (
                    <tr key={field.id}>
                      <td className={`${cell} w-1/2 font-medium`}>{field.label}</td>
                      <td className={`${cell} text-center w-16`}>{resolver.resolve(field)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Trip settings & pressures */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {tripSection?.fields && (
          <table className="w-full border-collapse border border-black text-[8px]">
            <thead>
              <tr>
                <th className={th} colSpan={2}>Trip Settings (°C / kPA)</th>
              </tr>
            </thead>
            <tbody>
              {tripSection.fields.map((field) => (
                <tr key={field.id}>
                  <td className={cell}>{field.label}</td>
                  <td className={`${cell} text-center w-16`}>{resolver.resolve(field)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pressSection?.fields && (
          <table className="w-full border-collapse border border-black text-[8px]">
            <thead>
              <tr>
                <th className={th} colSpan={2}>Pressures (PSI / kPA)</th>
              </tr>
            </thead>
            <tbody>
              {pressSection.fields.map((field) => (
                <tr key={field.id}>
                  <td className={cell}>{field.label}</td>
                  <td className={`${cell} text-center w-16`}>{resolver.resolve(field)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {generalSection?.fields && (
        <table className="w-full border-collapse border border-black mb-2 text-[8px]">
          <thead>
            <tr>
              <th className={th} colSpan={3}>General Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {generalSection.fields.map((field) => (
                <td key={field.id} className={cell}>
                  <span className="font-semibold">{field.label}: </span>
                  {resolver.resolve(field)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {/* Work done & travel */}
      {workSection?.fields && (
        <table className="w-full border-collapse border border-black mb-2 text-[8px]">
          <tbody>
            <tr>
              <td className={`${cell} font-semibold bg-gray-50`} colSpan={6}>
                Comments — Work Done
              </td>
            </tr>
            <tr>
              <td className={cell} colSpan={6} style={{ minHeight: '40px' }}>
                {resolver.resolve(workSection.fields[0])}
              </td>
            </tr>
            <tr>
              {workSection.fields.slice(1, 7).map((field) => (
                <td key={field.id} className={cell}>
                  <span className="font-semibold">{field.label}</span>
                  <div>{resolver.resolve(field)}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td className={cell} colSpan={4}>
                <span className="font-semibold">Reason for waiting: </span>
                {workSection.fields[7] && resolver.resolve(workSection.fields[7])}
              </td>
              <td className={cell} colSpan={2}>
                <span className="font-semibold">Was job completed? </span>
                {workSection.fields[8] && resolver.resolve(workSection.fields[8])}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Signatures */}
      {signSection?.fields && (
        <table className="w-full border-collapse border border-black text-[8px]">
          <thead>
            <tr>
              <th className={th} colSpan={2}>Technician</th>
              <th className={th} colSpan={2}>Customer</th>
              <th className={th} colSpan={2}>Closed W/S Supervisor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cell}>Name: {resolver.resolve(signSection.fields[0])}</td>
              <td className={cell}>
                <SignatureCell resolver={resolver} fieldId={signSection.fields[1]?.id} />
                {resolver.resolve(signSection.fields[2]) ? ` · ${resolver.resolve(signSection.fields[2])}` : ''}
              </td>
              <td className={cell}>Name: {resolver.resolve(signSection.fields[3])}</td>
              <td className={cell}>
                <SignatureCell resolver={resolver} fieldId={signSection.fields[4]?.id} />
                {resolver.resolve(signSection.fields[5]) ? ` · ${resolver.resolve(signSection.fields[5])}` : ''}
              </td>
              <td className={cell} colSpan={2}>
                <SignatureCell resolver={resolver} fieldId={signSection.fields[6]?.id} />
                {resolver.resolve(signSection.fields[7]) ? ` · ${resolver.resolve(signSection.fields[7])}` : ''}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <p className="text-[7px] text-gray-600 mt-2 text-center">
        White copy to Job File Office · Blue copy to Customer · Yellow copy to Technician
      </p>
    </div>
  );
}
