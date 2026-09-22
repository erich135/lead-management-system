import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_PROPOSED_QUANTITY } from '../types';
import { readSpecLibraryRecord } from '../api';
import {
  applyProposedLibrarySpec,
  attachHydratedLibrarySpec,
  emptyProposedDraft,
  libraryHydrationSignature,
  startManualProposed,
  type ProposedEquipmentDraft,
} from '../equipmentState';
import { resolveDraftPublishedFlowReference, hasKnownFlowReferenceBasis, AIRFLOW_REFERENCE_NEEDS_CONFIRMATION, OPEN_ADVANCED_SPECIFICATIONS_ACTION } from '../publishedFlowReference';
import {
  effectiveMotorShaft,
  effectivePackageInput,
  effectiveRatedAirflow,
  effectiveRatedPressure,
  hasUsableSourceBacked,
  specDisplayName,
} from '../specDisplay';
import { inferElectricalPowerKind, resolvePackageInputKw } from '../electricalPowerInput';
import type { PublicMachineSpec, SourceBackedSpec } from '../types';
import { SpecPicker } from './SpecPicker';
import { PublishedRatingFields } from './PublishedRatingFields';
import { MachineActionRow, QuantityField } from './MachineCardControls';
import { MachineEfficiencyField } from './MachineEfficiencyField';
import { VariableSpeedDriveCheckbox } from './VariableSpeedDriveCheckbox';
import { MissingHint } from './EditorSection';
import { efficiencyFieldsFromRow } from '../machineEfficiency';
import { inferVariableSpeedDriveFromControlType, resolveVariableSpeedDrive } from '../variableSpeedDrive';

interface ProposedReplacementSectionProps {
  proposalId: string;
  rows: ProposedEquipmentDraft[];
  onChange: (rows: ProposedEquipmentDraft[]) => void;
}

export function ProposedReplacementSection({
  proposalId,
  rows,
  onChange,
}: ProposedReplacementSectionProps) {
  const inFlightKeys = useRef(new Set<string>());
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const hydrateSignature = libraryHydrationSignature(rows);

  useEffect(() => {
    if (rows.length > 0) return;
    onChange([emptyProposedDraft()]);
  }, [rows.length, onChange]);

  useEffect(() => {
    const missing = rowsRef.current.filter(
      (row) =>
        row.specLibraryRecordId &&
        !row.selectedSpec &&
        !row.changingSpec &&
        !inFlightKeys.current.has(row.key),
    );
    if (missing.length === 0) return;
    const keys = missing.map((row) => row.key);
    keys.forEach((key) => inFlightKeys.current.add(key));
    let cancelled = false;
    void Promise.all(
      missing.map(async (row) => {
        try {
          const spec = await readSpecLibraryRecord(row.specLibraryRecordId as string);
          return { key: row.key, spec };
        } catch {
          return { key: row.key, spec: null as PublicMachineSpec | null };
        }
      }),
    ).then((loaded) => {
      keys.forEach((key) => inFlightKeys.current.delete(key));
      if (cancelled) return;
      onChange(
        rowsRef.current.map((row) => {
          const hit = loaded.find((item) => item.key === row.key);
          if (!hit) return row;
          return attachHydratedLibrarySpec(row, hit.spec);
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateSignature, onChange]);

  function updateRow(key: string, next: ProposedEquipmentDraft) {
    onChange(rows.map((row) => (row.key === key ? next : row)));
  }

  return (
    <div className="space-y-4 overflow-visible">
      {rows.map((row) => (
        <ProposedMachineCard
          key={row.key}
          proposalId={proposalId}
          draft={row}
          onChange={(next) => updateRow(row.key, next)}
          onRemove={() => onChange(rows.filter((item) => item.key !== row.key))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyProposedDraft()])}
        className="rounded-[8px] bg-slate-100 px-3 py-1.5 text-xs font-medium text-[#383838] hover:bg-slate-200"
      >
        Add another machine
      </button>
    </div>
  );
}

function ProposedMachineCard({
  proposalId,
  draft,
  onChange,
  onRemove,
}: {
  proposalId: string;
  draft: ProposedEquipmentDraft;
  onChange: (draft: ProposedEquipmentDraft) => void;
  onRemove: () => void;
}) {
  const selected = Boolean(draft.selectedSpec || hasUsableSourceBacked(draft.sourceBacked) || draft.enteringManually);
  const title =
    specDisplayName({
      manufacturer: draft.manufacturer ?? draft.selectedSpec?.manufacturer,
      model: draft.model ?? draft.selectedSpec?.model,
      modelVariant: draft.selectedSpec?.modelVariant,
    }) || 'Proposed machine';
  const missingAirflow = effectiveRatedAirflow(draft.selectedSpec, draft.sourceBacked).value === null;
  const missingPressure = effectiveRatedPressure(draft.selectedSpec, draft.sourceBacked).value === null;
  const missingPower =
    resolvePackageInputKw({
      storedKind: draft.electricalPowerKind ?? null,
      packageInputPowerKw: effectivePackageInput(draft.selectedSpec, draft.sourceBacked).value,
      motorShaftPowerKw: effectiveMotorShaft(draft.selectedSpec, draft.sourceBacked).value,
    }).packageInputKw === null;
  const flowReference = resolveDraftPublishedFlowReference(draft);
  const unknownFlowReference = selected && !hasKnownFlowReferenceBasis(flowReference.flowReferenceBasis);

  return (
    <div className="space-y-3 overflow-visible rounded-[8px] border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#383838]">
          {selected ? title : 'New proposed machine'}
          {selected ? ` · × ${draft.quantity}` : ''}
        </p>
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-[#383838]" title="Remove machine">
          <X className="h-4 w-4" />
        </button>
      </div>

      <VariableSpeedDriveCheckbox
        checked={resolveVariableSpeedDrive(draft)}
        onChange={(variableSpeedDrive) => onChange({ ...draft, variableSpeedDrive })}
      />

      {selected && (
        <div className="flex flex-wrap items-end gap-3">
          <QuantityField
            value={draft.quantity}
            onChange={(quantity) => onChange({ ...draft, quantity })}
          />
          <button
            type="button"
            className="text-xs font-medium text-[#0969a9] underline"
            onClick={() => onChange({ ...draft, specsOpen: !draft.specsOpen })}
          >
            {draft.specsOpen ? 'Hide specifications' : 'Show specifications'}
          </button>
        </div>
      )}

      {!draft.capturingSheet && (
        <MachineEfficiencyField
          proposalId={proposalId}
          value={efficiencyFieldsFromRow(draft)}
          onChange={(efficiency) => onChange({ ...draft, ...efficiency })}
        />
      )}

      {!draft.capturingSheet && (
        <MachineActionRow
          onLibrary={() => onChange({ ...draft, changingSpec: true, enteringManually: false, capturingSheet: false })}
          onManual={() => onChange(startManualProposed(draft))}
          onUpload={() => onChange({ ...draft, capturingSheet: true, changingSpec: false })}
        />
      )}

      {(!selected || draft.changingSpec || draft.capturingSheet) && (
            <SpecPicker
              proposalId={proposalId}
              label="Search BOUWA machine"
              placeholder="Search BOUWA machine..."
              scope="bouwa"
              searchHint=""
              selectedSpec={draft.changingSpec ? null : draft.selectedSpec}
              sourceBacked={draft.sourceBacked}
              changingSpec={draft.changingSpec || (!selected && !draft.enteringManually && !draft.capturingSheet)}
              capturingSheet={draft.capturingSheet}
              onSelect={(spec: PublicMachineSpec) =>
                onChange({
                  ...applyProposedLibrarySpec(draft, spec),
                  quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
                })
              }
              onChangeSpecification={() => onChange({ ...draft, changingSpec: true })}
              onCapture={() => onChange({ ...draft, capturingSheet: true })}
              onCancelCapture={() =>
                onChange({
                  ...draft,
                  capturingSheet: false,
                  changingSpec:
                    draft.selectedSpec !== null || hasUsableSourceBacked(draft.sourceBacked)
                      ? draft.changingSpec
                      : true,
                })
              }
              onApplySource={(values: SourceBackedSpec) =>
                onChange({
                  ...draft,
                  sourceBacked: values,
                  manufacturer: values.manufacturer,
                  model: values.model,
                  capturingSheet: false,
                  changingSpec: false,
                  enteringManually: true,
                  specsOpen: true,
                  quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
                  electricalPowerKind: inferElectricalPowerKind({
                    packageInputPowerKw: values.packageInputPowerKw,
                    motorShaftPowerKw: values.motorShaftPowerKw,
                  }),
                  variableSpeedDrive: inferVariableSpeedDriveFromControlType(values.controlType),
                })
              }
              onConfirmedSource={({ spec, sourceBacked }) =>
                onChange({
                  ...applyProposedLibrarySpec(draft, spec),
                  sourceBacked,
                  quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
                  electricalPowerKind: inferElectricalPowerKind({
                    packageInputPowerKw:
                      sourceBacked.packageInputPowerKw ?? spec.packageInputPowerKw,
                    motorShaftPowerKw:
                      sourceBacked.motorShaftPowerKw ?? spec.motorShaftPowerKw,
                  }),
                  variableSpeedDrive: resolveVariableSpeedDrive({
                    sourceBacked,
                    selectedSpec: spec,
                  }),
                })
              }
              onPatchSource={(sourceBacked: SourceBackedSpec) =>
                onChange({
                  ...draft,
                  sourceBacked,
                })
              }
              electricalPowerKind={draft.electricalPowerKind ?? null}
              onElectricalPowerKindChange={(electricalPowerKind) =>
                onChange({ ...draft, electricalPowerKind })
              }
              flowReference={flowReference}
              onFlowReferenceChange={(next) => onChange({ ...draft, ...next })}
              advancedOpen={draft.advancedSpecificationsOpen === true}
              onAdvancedOpenChange={(advancedSpecificationsOpen) =>
                onChange({ ...draft, specsOpen: true, advancedSpecificationsOpen })
              }
            />
      )}

      {selected && draft.enteringManually && !draft.capturingSheet && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Make</span>
            <input
              type="text"
              value={draft.manufacturer ?? ''}
              onChange={(event) =>
                onChange({
                  ...draft,
                  manufacturer: event.target.value,
                  sourceBacked: {
                    ...(draft.sourceBacked ?? {
                      manufacturer: null,
                      model: null,
                      modelVariant: null,
                      ratedPressureBarG: null,
                      ratedAirflowM3PerMin: null,
                      packageInputPowerKw: null,
                      motorShaftPowerKw: null,
                      controlType: null,
                      sourceFileName: null,
                      sourceFileId: null,
                      sourceSha256: null,
                    }),
                    manufacturer: event.target.value,
                  },
                })
              }
              className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Model</span>
            <input
              type="text"
              value={draft.model ?? ''}
              onChange={(event) =>
                onChange({
                  ...draft,
                  model: event.target.value,
                  sourceBacked: {
                    ...(draft.sourceBacked ?? {
                      manufacturer: null,
                      model: null,
                      modelVariant: null,
                      ratedPressureBarG: null,
                      ratedAirflowM3PerMin: null,
                      packageInputPowerKw: null,
                      motorShaftPowerKw: null,
                      controlType: null,
                      sourceFileName: null,
                      sourceFileId: null,
                      sourceSha256: null,
                    }),
                    model: event.target.value,
                  },
                })
              }
              className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
          </label>
        </div>
      )}

      {selected && draft.specsOpen && !draft.capturingSheet && (
        <dl className="space-y-2">
          <PublishedRatingFields
            library={draft.selectedSpec}
            source={draft.sourceBacked}
            identity={{
              manufacturer: draft.manufacturer ?? draft.selectedSpec?.manufacturer,
              model: draft.model ?? draft.selectedSpec?.model,
              modelVariant: draft.selectedSpec?.modelVariant ?? null,
            }}
            electricalPowerKind={draft.electricalPowerKind ?? null}
            onSourceChange={(sourceBacked) => onChange({ ...draft, sourceBacked })}
            onElectricalPowerKindChange={(electricalPowerKind) =>
              onChange({ ...draft, electricalPowerKind })
            }
            flowReference={flowReference}
            onFlowReferenceChange={(next) => onChange({ ...draft, ...next })}
            advancedOpen={draft.advancedSpecificationsOpen === true}
            onAdvancedOpenChange={(advancedSpecificationsOpen) =>
              onChange({ ...draft, advancedSpecificationsOpen })
            }
          />
        </dl>
      )}

      {selected && (missingAirflow || missingPressure || missingPower) && (
        <MissingHint>
          Enter the missing ratings, or upload a spec sheet. Edits stay on this proposal only.
        </MissingHint>
      )}
      {unknownFlowReference && !draft.specsOpen && (
        <MissingHint>
          {AIRFLOW_REFERENCE_NEEDS_CONFIRMATION}
          {' '}
          <button
            type="button"
            className="font-medium text-[#0969a9] underline"
            onClick={() =>
              onChange({ ...draft, specsOpen: true, advancedSpecificationsOpen: true })
            }
          >
            {OPEN_ADVANCED_SPECIFICATIONS_ACTION}
          </button>
        </MissingHint>
      )}
    </div>
  );
}
