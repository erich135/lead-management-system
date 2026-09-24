import type {
  CurrentEquipment,
  MachineEfficiencyAudit,
  MachineEfficiencyOrigin,
  ProposedEquipment,
  PublicMachineSpec,
  SourceBackedSpec,
  ElectricalPowerKind,
} from './types';
import { DEFAULT_PROPOSED_QUANTITY } from './types.ts';
import { hasDuplicateMachineIds } from './customerMachineSearch.ts';
import {
  emptySourceBackedSpec,
  hasUsableSourceBacked,
  specDisplayName,
} from './specDisplay.ts';
import { inferElectricalPowerKind } from './electricalPowerInput.ts';
import {
  hasConfirmedPublishedFlowReference,
  publishedFlowReferenceFromSpec,
  resolveDraftPublishedFlowReference,
  type PublishedFlowReference,
} from './publishedFlowReference.ts';
import {
  inferVariableSpeedDriveFromControlType,
  resolveVariableSpeedDrive,
} from './variableSpeedDrive.ts';

export interface CurrentEquipmentDraft {
  key: string;
  arsMachineId: string | null;
  make: string;
  model: string;
  serialNumber: string;
  quantity?: number;
  specLibraryRecordId: string | null;
  selectedSpec: PublicMachineSpec | null;
  changingSpec: boolean;
  enteringManually?: boolean;
  sourceBacked: SourceBackedSpec | null;
  capturingSheet: boolean;
  specsOpen?: boolean;
  efficiencyPercent?: number | null;
  efficiencyOrigin?: MachineEfficiencyOrigin | null;
  efficiencyAudit?: MachineEfficiencyAudit | null;
  electricalPowerKind?: ElectricalPowerKind | null;
  variableSpeedDrive?: boolean | null;
  advancedSpecificationsOpen?: boolean;
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
  referencePressureSource?: string | null;
  referenceTemperatureC?: number | null;
  referenceTemperatureSource?: string | null;
  intakeTemperatureOverrideC?: number | null;
  intakeTemperatureKind?: 'measured' | 'estimated' | null;
  specificationReference?: string | null;
}

export interface ProposedEquipmentDraft {
  key: string;
  specLibraryRecordId: string | null;
  selectedSpec: PublicMachineSpec | null;
  quantity: number;
  manufacturer: string | null;
  model: string | null;
  sourceBacked: SourceBackedSpec | null;
  changingSpec: boolean;
  enteringManually: boolean;
  capturingSheet: boolean;
  specsOpen?: boolean;
  efficiencyPercent?: number | null;
  efficiencyOrigin?: MachineEfficiencyOrigin | null;
  efficiencyAudit?: MachineEfficiencyAudit | null;
  electricalPowerKind?: ElectricalPowerKind | null;
  variableSpeedDrive?: boolean | null;
  advancedSpecificationsOpen?: boolean;
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
  referencePressureSource?: string | null;
  referenceTemperatureC?: number | null;
  referenceTemperatureSource?: string | null;
  intakeTemperatureOverrideC?: number | null;
  intakeTemperatureKind?: 'measured' | 'estimated' | null;
  specificationReference?: string | null;
}

function referenceConditionPayload(input: {
  referencePressureSource?: string | null;
  referenceTemperatureC?: number | null;
  referenceTemperatureSource?: string | null;
  intakeTemperatureOverrideC?: number | null;
  intakeTemperatureKind?: 'measured' | 'estimated' | null;
}) {
  return {
    referencePressureSource: input.referencePressureSource ?? null,
    referenceTemperatureC: input.referenceTemperatureC ?? null,
    referenceTemperatureSource: input.referenceTemperatureSource ?? null,
    intakeTemperatureOverrideC: input.intakeTemperatureOverrideC ?? null,
    intakeTemperatureKind: input.intakeTemperatureKind ?? null,
  };
}

function publishedFlowReferenceFields(
  input: PublishedFlowReference,
): PublishedFlowReference {
  const source = input.specificationReference?.trim() || null;
  return {
    flowReferenceBasis: input.flowReferenceBasis ?? null,
    referenceAbsolutePressurePa: input.referenceAbsolutePressurePa ?? null,
    specificationReference: source,
  };
}

function fromLibrarySpec(spec: PublicMachineSpec): PublishedFlowReference & {
  specsOpen: boolean;
} {
  const fields = publishedFlowReferenceFromSpec(spec);
  return {
    ...fields,
    specsOpen: !hasConfirmedPublishedFlowReference(fields),
  };
}

export function newCurrentEquipmentDraft(): CurrentEquipmentDraft {
  return {
    key: `machine-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    arsMachineId: null,
    make: '',
    model: '',
    serialNumber: '',
    quantity: DEFAULT_PROPOSED_QUANTITY,
    specLibraryRecordId: null,
    selectedSpec: null,
    changingSpec: true,
    enteringManually: false,
    sourceBacked: null,
    capturingSheet: false,
    specsOpen: false,
    efficiencyPercent: null,
    efficiencyOrigin: null,
    efficiencyAudit: null,
    electricalPowerKind: null,
    variableSpeedDrive: null,
    advancedSpecificationsOpen: false,
    flowReferenceBasis: null,
    referenceAbsolutePressurePa: null,
    specificationReference: null,
  };
}

export function emptyProposedDraft(): ProposedEquipmentDraft {
  return {
    key: `proposed-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    specLibraryRecordId: null,
    selectedSpec: null,
    quantity: DEFAULT_PROPOSED_QUANTITY,
    manufacturer: null,
    model: null,
    sourceBacked: null,
    changingSpec: true,
    enteringManually: false,
    capturingSheet: false,
    specsOpen: false,
    efficiencyPercent: null,
    efficiencyOrigin: null,
    efficiencyAudit: null,
    electricalPowerKind: null,
    variableSpeedDrive: null,
    advancedSpecificationsOpen: false,
    flowReferenceBasis: null,
    referenceAbsolutePressurePa: null,
    specificationReference: null,
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
    quantity: row.quantity && row.quantity >= 1 ? row.quantity : DEFAULT_PROPOSED_QUANTITY,
    specLibraryRecordId: row.specLibraryRecordId,
    selectedSpec: null,
    changingSpec: !row.specLibraryRecordId && !row.sourceBacked,
    enteringManually: false,
    sourceBacked: row.sourceBacked,
    capturingSheet: false,
    specsOpen: false,
    efficiencyPercent: row.efficiencyPercent ?? null,
    efficiencyOrigin: row.efficiencyOrigin ?? null,
    efficiencyAudit: row.efficiencyAudit ?? null,
    electricalPowerKind: row.electricalPowerKind ?? null,
    variableSpeedDrive: row.variableSpeedDrive ?? null,
    advancedSpecificationsOpen: false,
    flowReferenceBasis: row.flowReferenceBasis ?? null,
    referenceAbsolutePressurePa: row.referenceAbsolutePressurePa ?? null,
    referencePressureSource: row.referencePressureSource ?? null,
    referenceTemperatureC: row.referenceTemperatureC ?? null,
    referenceTemperatureSource: row.referenceTemperatureSource ?? null,
    intakeTemperatureOverrideC: row.intakeTemperatureOverrideC ?? null,
    intakeTemperatureKind: row.intakeTemperatureKind ?? null,
    specificationReference: row.specificationReference ?? null,
  }));
}

export function proposedDraftsFromProposal(
  rows: ProposedEquipment[] | undefined,
): ProposedEquipmentDraft[] {
  const list = rows ?? [];
  if (list.length === 0) return [emptyProposedDraft()];
  return list.map((row, index) => ({
    key: `saved-proposed-${row.specLibraryRecordId ?? row.model ?? 'row'}-${index}`,
    specLibraryRecordId: row.specLibraryRecordId,
    selectedSpec: null,
    quantity: row.quantity >= 1 ? row.quantity : DEFAULT_PROPOSED_QUANTITY,
    manufacturer: row.manufacturer,
    model: row.model,
    sourceBacked: row.sourceBacked,
    changingSpec: !row.specLibraryRecordId && !row.sourceBacked,
    enteringManually: false,
    capturingSheet: false,
    specsOpen: false,
    efficiencyPercent: row.efficiencyPercent ?? null,
    efficiencyOrigin: row.efficiencyOrigin ?? null,
    efficiencyAudit: row.efficiencyAudit ?? null,
    electricalPowerKind: row.electricalPowerKind ?? null,
    variableSpeedDrive: row.variableSpeedDrive ?? null,
    advancedSpecificationsOpen: false,
    flowReferenceBasis: row.flowReferenceBasis ?? null,
    referenceAbsolutePressurePa: row.referenceAbsolutePressurePa ?? null,
    referencePressureSource: row.referencePressureSource ?? null,
    referenceTemperatureC: row.referenceTemperatureC ?? null,
    referenceTemperatureSource: row.referenceTemperatureSource ?? null,
    intakeTemperatureOverrideC: row.intakeTemperatureOverrideC ?? null,
    intakeTemperatureKind: row.intakeTemperatureKind ?? null,
    specificationReference: row.specificationReference ?? null,
  }));
}

export function proposedDraftFromProposal(
  rows: ProposedEquipment[] | undefined,
): ProposedEquipmentDraft {
  return proposedDraftsFromProposal(rows)[0] ?? emptyProposedDraft();
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

export function attachHydratedLibrarySpec<
  T extends {
    selectedSpec: PublicMachineSpec | null;
    changingSpec: boolean;
  },
>(row: T, spec: PublicMachineSpec | null): T {
  if (!spec) {
    return { ...row, changingSpec: true };
  }
  return {
    ...row,
    selectedSpec: spec,
    changingSpec: false,
  };
}

export function libraryHydrationSignature(
  rows: readonly {
    key: string;
    specLibraryRecordId: string | null;
    selectedSpec: PublicMachineSpec | null;
    changingSpec: boolean;
  }[],
): string {
  return rows
    .filter(
      (row) => row.specLibraryRecordId && !row.selectedSpec && !row.changingSpec,
    )
    .map((row) => `${row.key}:${row.specLibraryRecordId}`)
    .join('|');
}

export function canAddPhysicalMachine(
  selectedIds: readonly string[],
  nextId: string,
): boolean {
  return !selectedIds.includes(nextId) && !hasDuplicateMachineIds([...selectedIds, nextId]);
}

export function applyProposedLibrarySpec(
  draft: ProposedEquipmentDraft,
  spec: PublicMachineSpec,
): ProposedEquipmentDraft {
  const flow = fromLibrarySpec(spec);
  return {
    ...draft,
    specLibraryRecordId: spec.recordId,
    selectedSpec: spec,
    manufacturer: spec.manufacturer,
    model: spec.model,
    changingSpec: false,
    enteringManually: false,
    capturingSheet: false,
    sourceBacked: null,
    specsOpen: flow.specsOpen,
    electricalPowerKind: inferElectricalPowerKind({
      packageInputPowerKw: spec.packageInputPowerKw,
      motorShaftPowerKw: spec.motorShaftPowerKw,
    }),
    variableSpeedDrive: inferVariableSpeedDriveFromControlType(spec.controlType),
    ...publishedFlowReferenceFields(flow),
  };
}

export function startManualCurrent(row: CurrentEquipmentDraft): CurrentEquipmentDraft {
  return {
    ...row,
    enteringManually: true,
    changingSpec: false,
    capturingSheet: false,
    specsOpen: true,
    sourceBacked: row.sourceBacked ?? emptySourceBackedSpec(),
  };
}

export function startManualProposed(draft: ProposedEquipmentDraft): ProposedEquipmentDraft {
  return {
    ...draft,
    enteringManually: true,
    changingSpec: false,
    capturingSheet: false,
    specsOpen: true,
    sourceBacked: draft.sourceBacked ?? emptySourceBackedSpec(),
  };
}

export function currentMachineHasIdentity(row: CurrentEquipmentDraft): boolean {
  return Boolean(
    row.arsMachineId ||
      row.specLibraryRecordId ||
      hasUsableSourceBacked(row.sourceBacked) ||
      (row.enteringManually && (row.make.trim() !== '' || row.model.trim() !== '')),
  );
}

export function currentMachineIsComplete(row: CurrentEquipmentDraft): boolean {
  return Boolean(
    row.specLibraryRecordId ||
      hasUsableSourceBacked(row.sourceBacked) ||
      (row.enteringManually && (row.make.trim() !== '' || row.model.trim() !== '')),
  );
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
        quantity: row.quantity >= 1 ? row.quantity : DEFAULT_PROPOSED_QUANTITY,
        specLibraryRecordId: row.specLibraryRecordId,
        sourceBacked: hasUsableSourceBacked(row.sourceBacked)
          ? row.sourceBacked
          : row.enteringManually
            ? {
                ...emptySourceBackedSpec(),
                ...row.sourceBacked,
                manufacturer: row.sourceBacked?.manufacturer || row.make || null,
                model: row.sourceBacked?.model || row.model || null,
              }
            : row.sourceBacked,
        efficiencyPercent: row.efficiencyPercent ?? null,
        efficiencyOrigin: row.efficiencyOrigin ?? null,
        efficiencyAudit: row.efficiencyAudit ?? null,
        electricalPowerKind: row.electricalPowerKind ?? null,
        variableSpeedDrive: resolveVariableSpeedDrive(row),
        ...publishedFlowReferenceFields(resolveDraftPublishedFlowReference(row)),
        ...referenceConditionPayload(row),
      },
    ];
  });
}

export function toProposedEquipmentPayload(
  drafts: ProposedEquipmentDraft | ProposedEquipmentDraft[],
): ProposedEquipment[] {
  const rows = Array.isArray(drafts) ? drafts : [drafts];
  return rows.flatMap((draft) => {
    const specLibraryRecordId =
      draft.specLibraryRecordId?.trim() ||
      draft.selectedSpec?.recordId?.trim() ||
      null;
    const sourceBacked = hasUsableSourceBacked(draft.sourceBacked)
      ? draft.sourceBacked
      : draft.enteringManually && (draft.manufacturer || draft.model)
        ? draft.sourceBacked
        : null;
    const manufacturer = draft.manufacturer ?? draft.selectedSpec?.manufacturer ?? null;
    const model = draft.model ?? draft.selectedSpec?.model ?? null;
    if (!specLibraryRecordId && !sourceBacked && !manufacturer && !model) return [];
    return [
      {
        specLibraryRecordId,
        quantity: draft.quantity >= 1 ? draft.quantity : DEFAULT_PROPOSED_QUANTITY,
        manufacturer,
        model,
        sourceBacked: hasUsableSourceBacked(draft.sourceBacked)
          ? draft.sourceBacked
          : draft.enteringManually
            ? {
                ...emptySourceBackedSpec(),
                ...draft.sourceBacked,
                manufacturer,
                model,
              }
            : null,
        efficiencyPercent: draft.efficiencyPercent ?? null,
        efficiencyOrigin: draft.efficiencyOrigin ?? null,
        efficiencyAudit: draft.efficiencyAudit ?? null,
        electricalPowerKind: draft.electricalPowerKind ?? null,
        variableSpeedDrive: resolveVariableSpeedDrive(draft),
        ...publishedFlowReferenceFields(resolveDraftPublishedFlowReference(draft)),
        ...referenceConditionPayload(draft),
      },
    ];
  });
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
    quantity: DEFAULT_PROPOSED_QUANTITY,
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
  const flow = fromLibrarySpec(spec);
  return {
    ...row,
    make: fromPhysical ? row.make : spec.manufacturer,
    model: fromPhysical ? row.model : spec.model,
    specLibraryRecordId: spec.recordId,
    selectedSpec: spec,
    changingSpec: false,
    enteringManually: false,
    capturingSheet: false,
    sourceBacked: null,
    specsOpen: flow.specsOpen,
    electricalPowerKind: inferElectricalPowerKind({
      packageInputPowerKw: spec.packageInputPowerKw,
      motorShaftPowerKw: spec.motorShaftPowerKw,
    }),
    variableSpeedDrive: inferVariableSpeedDriveFromControlType(spec.controlType),
    ...publishedFlowReferenceFields(flow),
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
    electricalPowerKind: inferElectricalPowerKind({
      packageInputPowerKw: sourceBacked.packageInputPowerKw ?? spec.packageInputPowerKw,
      motorShaftPowerKw: sourceBacked.motorShaftPowerKw ?? spec.motorShaftPowerKw,
    }),
    variableSpeedDrive: resolveVariableSpeedDrive({
      sourceBacked,
      selectedSpec: spec,
    }),
  };
}

export function resetCurrentMachine(row: CurrentEquipmentDraft): CurrentEquipmentDraft {
  return {
    ...newCurrentEquipmentDraft(),
    key: row.key,
  };
}
