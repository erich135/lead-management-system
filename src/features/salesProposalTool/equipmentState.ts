import type {
  CurrentEquipment,
  ProposedEquipment,
  PublicMachineSpec,
  SourceBackedSpec,
} from './types';
import { DEFAULT_PROPOSED_QUANTITY } from './types.ts';
import { hasDuplicateMachineIds } from './customerMachineSearch.ts';
import { hasUsableSourceBacked, specDisplayName } from './specDisplay.ts';

export interface CurrentEquipmentDraft {
  key: string;
  arsMachineId: string | null;
  make: string;
  model: string;
  serialNumber: string;
  specLibraryRecordId: string | null;
  selectedSpec: PublicMachineSpec | null;
  changingSpec: boolean;
  sourceBacked: SourceBackedSpec | null;
  capturingSheet: boolean;
}

export interface ProposedEquipmentDraft {
  specLibraryRecordId: string | null;
  selectedSpec: PublicMachineSpec | null;
  quantity: number;
  manufacturer: string | null;
  model: string | null;
  sourceBacked: SourceBackedSpec | null;
  changingSpec: boolean;
  capturingSheet: boolean;
}

export function newCurrentEquipmentDraft(): CurrentEquipmentDraft {
  return {
    key: `machine-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    arsMachineId: null,
    make: '',
    model: '',
    serialNumber: '',
    specLibraryRecordId: null,
    selectedSpec: null,
    changingSpec: true,
    sourceBacked: null,
    capturingSheet: false,
  };
}

export function emptyProposedDraft(): ProposedEquipmentDraft {
  return {
    specLibraryRecordId: null,
    selectedSpec: null,
    quantity: DEFAULT_PROPOSED_QUANTITY,
    manufacturer: null,
    model: null,
    sourceBacked: null,
    changingSpec: true,
    capturingSheet: false,
  };
}

export function draftsFromCurrentEquipment(
  rows: CurrentEquipment[] | undefined,
): CurrentEquipmentDraft[] {
  return (rows ?? []).map((row, index) => ({
    key:
      row.id?.trim() ||
      `saved-${row.arsMachineId ?? row.specLibraryRecordId ?? 'row'}-${index}`,
    arsMachineId: row.arsMachineId,
    make: row.make,
    model: row.model,
    serialNumber: row.serialNumber,
    specLibraryRecordId: row.specLibraryRecordId,
    selectedSpec: null,
    changingSpec: !row.specLibraryRecordId && !row.sourceBacked,
    sourceBacked: row.sourceBacked,
    capturingSheet: false,
  }));
}

export function proposedDraftFromProposal(
  rows: ProposedEquipment[] | undefined,
): ProposedEquipmentDraft {
  const row = rows?.[0];
  if (!row) return emptyProposedDraft();
  return {
    specLibraryRecordId: row.specLibraryRecordId,
    selectedSpec: null,
    quantity: row.quantity >= 1 ? row.quantity : DEFAULT_PROPOSED_QUANTITY,
    manufacturer: row.manufacturer,
    model: row.model,
    sourceBacked: row.sourceBacked,
    changingSpec: !row.specLibraryRecordId && !row.sourceBacked,
    capturingSheet: false,
  };
}

export function specIdToPreselect(machine: {
  specLibraryRecordId?: string | null;
}): string | null {
  const id = machine.specLibraryRecordId?.trim();
  return id ? id : null;
}

export function installedSpecSearchHint(make: string, model: string): string {
  return `${make} ${model}`.trim();
}

export function retainMachinesForCustomer(
  rows: CurrentEquipmentDraft[],
  customerMachineIds: readonly string[],
): CurrentEquipmentDraft[] {
  const allowed = new Set(customerMachineIds);
  return rows.filter(
    (row) => row.arsMachineId === null || allowed.has(row.arsMachineId),
  );
}

export function canAddPhysicalMachine(
  selectedIds: readonly string[],
  nextId: string,
): boolean {
  return !selectedIds.includes(nextId) && !hasDuplicateMachineIds([...selectedIds, nextId]);
}

export function currentMachineHasIdentity(row: CurrentEquipmentDraft): boolean {
  return Boolean(
    row.arsMachineId || row.specLibraryRecordId || hasUsableSourceBacked(row.sourceBacked),
  );
}

export function currentMachineIsComplete(row: CurrentEquipmentDraft): boolean {
  return Boolean(row.specLibraryRecordId || hasUsableSourceBacked(row.sourceBacked));
}

export function currentMachineNeedsSpec(row: CurrentEquipmentDraft): boolean {
  return Boolean(row.arsMachineId) && !currentMachineIsComplete(row);
}

export function currentMachineCardTitle(row: CurrentEquipmentDraft): string {
  if (row.selectedSpec) return specDisplayName(row.selectedSpec);
  if (hasUsableSourceBacked(row.sourceBacked) && row.sourceBacked) {
    return specDisplayName({
      manufacturer: row.sourceBacked.manufacturer,
      model: row.sourceBacked.model,
      modelVariant: row.sourceBacked.modelVariant,
    });
  }
  return `${row.make} ${row.model}`.trim();
}

export function toCurrentEquipmentPayload(
  rows: CurrentEquipmentDraft[],
): CurrentEquipment[] {
  return rows.flatMap((row) => {
    if (!currentMachineHasIdentity(row)) return [];
    return [
      {
        id: row.key,
        arsMachineId: row.arsMachineId,
        make: row.make,
        model: row.model,
        serialNumber: row.serialNumber,
        specLibraryRecordId: row.specLibraryRecordId,
        sourceBacked: row.sourceBacked,
      },
    ];
  });
}

export function toProposedEquipmentPayload(
  draft: ProposedEquipmentDraft,
): ProposedEquipment[] {
  const specLibraryRecordId =
    draft.specLibraryRecordId?.trim() ||
    draft.selectedSpec?.recordId?.trim() ||
    null;
  const sourceBacked = hasUsableSourceBacked(draft.sourceBacked)
    ? draft.sourceBacked
    : null;
  if (!specLibraryRecordId && !sourceBacked) return [];
  return [
    {
      specLibraryRecordId,
      quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
      manufacturer: draft.manufacturer ?? draft.selectedSpec?.manufacturer ?? null,
      model: draft.model ?? draft.selectedSpec?.model ?? null,
      sourceBacked,
    },
  ];
}

export function applyPhysicalMachine(
  row: CurrentEquipmentDraft,
  machine: {
    _id: string;
    make: string;
    model: string;
    serialNumber: string;
    specLibraryRecordId?: string | null;
  },
): CurrentEquipmentDraft {
  const remembered = specIdToPreselect(machine);
  return {
    ...row,
    arsMachineId: String(machine._id),
    make: machine.make,
    model: machine.model,
    serialNumber: machine.serialNumber,
    specLibraryRecordId: remembered,
    selectedSpec: remembered ? row.selectedSpec : null,
    changingSpec: remembered === null,
    sourceBacked: remembered ? row.sourceBacked : null,
  };
}

export function applyLibrarySpec(
  row: CurrentEquipmentDraft,
  spec: PublicMachineSpec,
): CurrentEquipmentDraft {
  const fromPhysical = Boolean(row.arsMachineId);
  return {
    ...row,
    make: fromPhysical ? row.make : spec.manufacturer,
    model: fromPhysical ? row.model : spec.model,
    specLibraryRecordId: spec.recordId,
    selectedSpec: spec,
    changingSpec: false,
    capturingSheet: false,
  };
}

export function applyConfirmedLibrarySpec(
  row: CurrentEquipmentDraft,
  spec: PublicMachineSpec,
  sourceBacked: SourceBackedSpec,
): CurrentEquipmentDraft {
  return {
    ...applyLibrarySpec(row, spec),
    sourceBacked,
  };
}

export function resetCurrentMachine(row: CurrentEquipmentDraft): CurrentEquipmentDraft {
  return {
    ...newCurrentEquipmentDraft(),
    key: row.key,
  };
}
