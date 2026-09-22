import { describe, expect, it } from 'vitest';
import {
  applyLibrarySpec,
  applyProposedLibrarySpec,
  draftsFromCurrentEquipment,
  emptyProposedDraft,
  newCurrentEquipmentDraft,
  proposedDraftsFromProposal,
  toCurrentEquipmentPayload,
  toProposedEquipmentPayload,
} from './equipmentState.ts';
import {
  AIRFLOW_REFERENCE_BASIS_LABEL,
  REFERENCE_INLET_PRESSURE_HELP,
  REFERENCE_INLET_PRESSURE_LABEL,
  REFERENCE_INLET_PRESSURE_UNIT,
  SPECIFICATION_REFERENCE_LABEL,
  SUPPORTED_FLOW_REFERENCE_BASIS,
  barAbsoluteToPa,
  formatBarAbsoluteFromPa,
  hasConfirmedPublishedFlowReference,
  looksLikeDischargePressureBarAbs,
  parseBarAbsoluteText,
  paToBarAbsolute,
} from './publishedFlowReference.ts';
import type { PublicMachineSpec } from './types.ts';

const ISA_SEA_LEVEL_PA = 101325;

const libraryWithRefs: PublicMachineSpec = {
  recordId: 'lib-bouwa-fad',
  manufacturer: 'BOUWA',
  model: 'SC-RS55A',
  modelVariant: null,
  ratedPressureBarG: 8,
  ratedAirflowM3PerMin: 9.06,
  packageInputPowerKw: null,
  motorShaftPowerKw: 55,
  controlType: null,
  sourceTitle: 'BOUWA SC-RS55A datasheet',
  sourceFileName: 'SC-RS55A.pdf',
  flowReferenceBasis: SUPPORTED_FLOW_REFERENCE_BASIS,
  referenceAbsolutePressurePa: ISA_SEA_LEVEL_PA,
};

const libraryMissingRefs: PublicMachineSpec = {
  ...libraryWithRefs,
  recordId: 'lib-iso-no-pref',
  flowReferenceBasis: SUPPORTED_FLOW_REFERENCE_BASIS,
  referenceAbsolutePressurePa: null,
  sourceTitle: 'ISO 1217 listing without P_ref',
};

describe('published airflow reference fields', () => {
  it('converts bar absolute to pascals without assuming 1.01325 bar', () => {
    expect(barAbsoluteToPa(1)).toBe(100000);
    expect(barAbsoluteToPa(1.01325)).toBe(ISA_SEA_LEVEL_PA);
    expect(paToBarAbsolute(ISA_SEA_LEVEL_PA)).toBe(1.01325);
    expect(formatBarAbsoluteFromPa(ISA_SEA_LEVEL_PA)).toBe('1.01325');
    expect(parseBarAbsoluteText('1.01325')).toBe(ISA_SEA_LEVEL_PA);
    expect(parseBarAbsoluteText('')).toBe(null);
    expect(looksLikeDischargePressureBarAbs(8.5)).toBe(true);
    expect(looksLikeDischargePressureBarAbs(1.013)).toBe(false);
  });

  it('prepopulates library FAD basis, inlet pressure and source onto the proposed machine', () => {
    const applied = applyProposedLibrarySpec(emptyProposedDraft(), libraryWithRefs);
    expect(applied.flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(applied.referenceAbsolutePressurePa).toBe(ISA_SEA_LEVEL_PA);
    expect(applied.specificationReference).toBe('BOUWA SC-RS55A datasheet');
    expect(applied.specsOpen).toBe(false);
    expect(hasConfirmedPublishedFlowReference(applied)).toBe(true);
  });

  it('opens specifications when library FAD is present but inlet pressure is missing', () => {
    const applied = applyProposedLibrarySpec(emptyProposedDraft(), libraryMissingRefs);
    expect(applied.flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(applied.referenceAbsolutePressurePa).toBe(null);
    expect(applied.specsOpen).toBe(true);
    expect(hasConfirmedPublishedFlowReference(applied)).toBe(false);
  });

  it('persists proposal-entered FAD values and restores them on reopen', () => {
    const entered = {
      ...applyProposedLibrarySpec(emptyProposedDraft(), libraryMissingRefs),
      flowReferenceBasis: SUPPORTED_FLOW_REFERENCE_BASIS,
      referenceAbsolutePressurePa: parseBarAbsoluteText('1.01325'),
      specificationReference: 'OEM datasheet, FAD at 1.01325 bar abs',
    };
    const payload = toProposedEquipmentPayload(entered);
    expect(payload[0].flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(payload[0].referenceAbsolutePressurePa).toBe(ISA_SEA_LEVEL_PA);
    expect(payload[0].specificationReference).toBe(
      'OEM datasheet, FAD at 1.01325 bar abs',
    );
    const reopened = proposedDraftsFromProposal(payload)[0];
    expect(reopened.flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(reopened.referenceAbsolutePressurePa).toBe(ISA_SEA_LEVEL_PA);
    expect(reopened.specificationReference).toBe(
      'OEM datasheet, FAD at 1.01325 bar abs',
    );
    expect(hasConfirmedPublishedFlowReference(reopened)).toBe(true);
  });

  it('does not convert a documented non-FAD basis to FAD', () => {
    const applied = applyProposedLibrarySpec(emptyProposedDraft(), {
      ...libraryWithRefs,
      flowReferenceBasis: 'actual_volumetric',
    });
    expect(applied.flowReferenceBasis).toBe('actual_volumetric');
    expect(applied.flowReferenceBasis).not.toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    const payload = toProposedEquipmentPayload(applied);
    expect(payload[0].flowReferenceBasis).toBe('actual_volumetric');
  });

  it('copies library values onto a current machine and keeps them after save', () => {
    const applied = applyLibrarySpec(newCurrentEquipmentDraft(), libraryWithRefs);
    expect(applied.flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(applied.referenceAbsolutePressurePa).toBe(ISA_SEA_LEVEL_PA);
    const payload = toCurrentEquipmentPayload([applied]);
    expect(payload[0].flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(payload[0].referenceAbsolutePressurePa).toBe(ISA_SEA_LEVEL_PA);
    const reopened = draftsFromCurrentEquipment(payload)[0];
    expect(reopened.flowReferenceBasis).toBe(SUPPORTED_FLOW_REFERENCE_BASIS);
    expect(reopened.referenceAbsolutePressurePa).toBe(ISA_SEA_LEVEL_PA);
  });

  it('labels the editor fields so reps can enter FAD and bar-absolute inlet pressure', () => {
    expect(AIRFLOW_REFERENCE_BASIS_LABEL).toBe('Airflow reference basis');
    expect(REFERENCE_INLET_PRESSURE_LABEL).toBe('Published reference inlet pressure');
    expect(REFERENCE_INLET_PRESSURE_UNIT).toBe('bar absolute');
    expect(SPECIFICATION_REFERENCE_LABEL).toMatch(/source/i);
    expect(REFERENCE_INLET_PRESSURE_HELP).toMatch(/not the compressor/i);
    expect(REFERENCE_INLET_PRESSURE_HELP).toMatch(/working pressure/i);
    expect(REFERENCE_INLET_PRESSURE_HELP).not.toMatch(/bypass|assume/i);
  });
});
