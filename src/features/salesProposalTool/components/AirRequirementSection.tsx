import { AirAuditUpload } from './AirAuditUpload';
import { AirAuditScopeFields } from './AirAuditScopeFields';
import { MissingHint } from './EditorSection';
import type { AirAuditScope } from '../airAuditScope';
import type { CurrentEquipmentDraft } from '../equipmentState';
import type { AirAndElectricityComparison } from '../types';
import { formatMeasuredNumber } from '../formatMeasured';

interface AirRequirementSectionProps {
  hasAirAudit: boolean | null;
  onHasAirAuditChange: (next: boolean) => void;
  uploading: boolean;
  removing: boolean;
  error: string | null;
  sourceFileName: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  scope: AirAuditScope;
  machines: CurrentEquipmentDraft[];
  onScopeChange: (next: AirAuditScope) => void;
  proposedReady: boolean;
  airRequirement: AirAndElectricityComparison['airRequirement'] | undefined;
}

export function AirRequirementSection({
  hasAirAudit,
  onHasAirAuditChange,
  uploading,
  removing,
  error,
  sourceFileName,
  onFile,
  onRemove,
  scope,
  machines,
  onScopeChange,
  proposedReady,
  airRequirement,
}: AirRequirementSectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#383838]">Do you have an air audit?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onHasAirAuditChange(true)}
          className={`rounded-[8px] px-3 py-1.5 text-xs font-medium ${
            hasAirAudit === true
              ? 'bg-[#f7c12b] text-[#383838]'
              : 'bg-slate-100 text-[#383838]'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onHasAirAuditChange(false)}
          className={`rounded-[8px] px-3 py-1.5 text-xs font-medium ${
            hasAirAudit === false
              ? 'bg-[#f7c12b] text-[#383838]'
              : 'bg-slate-100 text-[#383838]'
          }`}
        >
          No
        </button>
      </div>
      {hasAirAudit === null && (
        <MissingHint>Say whether this site has a measured air audit.</MissingHint>
      )}

      {hasAirAudit === true && (
        <>
          <AirAuditUpload
            uploading={uploading}
            removing={removing}
            error={error}
            sourceFileName={sourceFileName}
            onFile={onFile}
            onRemove={onRemove}
          />
          {sourceFileName && (
            <AirAuditScopeFields
              scope={scope}
              machines={machines}
              onChange={onScopeChange}
            />
          )}
          {!sourceFileName && (
            <MissingHint>Upload the CSV or XLSX air audit to use the measured air requirement.</MissingHint>
          )}
        </>
      )}

      {hasAirAudit === false && (
        <AssumedAirPanel proposedReady={proposedReady} airRequirement={airRequirement} />
      )}
    </div>
  );
}

function AssumedAirPanel({
  proposedReady,
  airRequirement,
}: {
  proposedReady: boolean;
  airRequirement: AirAndElectricityComparison['airRequirement'] | undefined;
}) {
  if (!proposedReady) {
    return (
      <p className="text-sm text-slate-600">
        Select the proposed machines first. Without an air audit, the comparison uses their
        combined site airflow as the assumed air requirement. This is not a measured value.
      </p>
    );
  }

  const airflow = formatMeasuredNumber(airRequirement?.airflowM3PerMin ?? null);
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {airRequirement?.label ?? 'Assumed air requirement'}
      </p>
      <p className="mt-1 text-sm font-medium text-[#383838]">
        {airflow ? `${airflow} m³/min` : 'Waiting for site-adjusted proposed airflow'}
      </p>
      <p className="mt-2 text-xs text-slate-600">
        {airRequirement?.assumedNote ??
          'This assumed requirement comes from the proposed machines at site conditions. It was not measured.'}
      </p>
    </div>
  );
}
