import { useEffect, useRef } from 'react';
import { DEFAULT_PROPOSED_QUANTITY } from '../types';
import { readSpecLibraryRecord } from '../api';
import type { ProposedEquipmentDraft } from '../equipmentState';
import { hasUsableSourceBacked } from '../specDisplay';
import type { PublicMachineSpec, SourceBackedSpec } from '../types';
import { SpecPicker } from './SpecPicker';

interface ProposedReplacementSectionProps {
  proposalId: string;
  draft: ProposedEquipmentDraft;
  onChange: (draft: ProposedEquipmentDraft) => void;
}

export function ProposedReplacementSection({
  proposalId,
  draft,
  onChange,
}: ProposedReplacementSectionProps) {
  const hydratedId = useRef<string | null>(null);

  useEffect(() => {
    if (!draft.specLibraryRecordId || draft.selectedSpec) return;
    if (hydratedId.current === draft.specLibraryRecordId) return;
    hydratedId.current = draft.specLibraryRecordId;
    let cancelled = false;
    void readSpecLibraryRecord(draft.specLibraryRecordId)
      .then((spec) => {
        if (!cancelled) {
          onChange({
            ...draft,
            selectedSpec: spec,
            manufacturer: spec.manufacturer,
            model: spec.model,
            changingSpec: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) hydratedId.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [draft, onChange]);

  return (
    <section className="space-y-3 overflow-visible">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Proposed replacement
      </h2>
      <SpecPicker
        proposalId={proposalId}
        label="Search BOUWA machine"
        placeholder="Search BOUWA machine..."
        scope="bouwa"
        searchHint=""
        selectedSpec={draft.selectedSpec}
        sourceBacked={draft.sourceBacked}
        changingSpec={draft.changingSpec}
        capturingSheet={draft.capturingSheet}
        onSelect={(spec: PublicMachineSpec) =>
          onChange({
            ...draft,
            specLibraryRecordId: spec.recordId,
            selectedSpec: spec,
            manufacturer: spec.manufacturer,
            model: spec.model,
            changingSpec: false,
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
            quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
          })
        }
        onConfirmedSource={({ spec, sourceBacked }) =>
          onChange({
            ...draft,
            specLibraryRecordId: spec.recordId,
            selectedSpec: spec,
            sourceBacked,
            manufacturer: spec.manufacturer,
            model: spec.model,
            capturingSheet: false,
            changingSpec: false,
            quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
          })
        }
      />
      {(draft.selectedSpec || draft.sourceBacked) && (
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Quantity
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={draft.quantity}
            onChange={(event) => {
              const value = Number(event.target.value);
              onChange({
                ...draft,
                quantity: Number.isInteger(value) && value >= 1 ? value : DEFAULT_PROPOSED_QUANTITY,
              });
            }}
            className="mt-1 w-24 rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
        </label>
      )}
    </section>
  );
}
