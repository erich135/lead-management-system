import { describe, expect, it } from 'vitest';
import {
  inferVariableSpeedDriveFromControlType,
  resolveVariableSpeedDrive,
  VARIABLE_SPEED_DRIVE_LABEL,
} from './variableSpeedDrive';
import {
  applyProposedLibrarySpec,
  attachHydratedLibrarySpec,
  emptyProposedDraft,
  toProposedEquipmentPayload,
} from './equipmentState';

describe('variable-speed drive proposal flag', () => {
  it('labels the editor checkbox clearly', () => {
    expect(VARIABLE_SPEED_DRIVE_LABEL).toBe('Variable-speed drive (VSD)');
  });

  it('prepopulates from library control type and keeps an explicit proposal edit', () => {
    const applied = applyProposedLibrarySpec(emptyProposedDraft(), {
      recordId: 'lib-bouwa-vsd',
      manufacturer: 'BOUWA',
      model: 'SVC-RS55A-II',
      modelVariant: null,
      ratedPressureBarG: 8,
      ratedAirflowM3PerMin: 9.1,
      packageInputPowerKw: 55,
      motorShaftPowerKw: 55,
      controlType: 'VSD',
      sourceTitle: null,
      sourceFileName: null,
    });
    expect(applied.variableSpeedDrive).toBe(true);
    expect(inferVariableSpeedDriveFromControlType('fixed speed')).toBe(false);

    const edited = { ...applied, variableSpeedDrive: false };
    const hydrated = attachHydratedLibrarySpec(edited, {
      recordId: 'lib-bouwa-vsd',
      manufacturer: 'BOUWA',
      model: 'SVC-RS55A-II',
      modelVariant: null,
      ratedPressureBarG: 8,
      ratedAirflowM3PerMin: 9.1,
      packageInputPowerKw: 55,
      motorShaftPowerKw: 55,
      controlType: 'VSD',
      sourceTitle: null,
      sourceFileName: null,
    });
    expect(hydrated.variableSpeedDrive).toBe(false);
    expect(toProposedEquipmentPayload(hydrated)[0].variableSpeedDrive).toBe(false);
  });

  it('lets a proposal checkbox override a VSD control type string', () => {
    expect(
      resolveVariableSpeedDrive({
        variableSpeedDrive: false,
        sourceBacked: { controlType: 'VSD' },
        selectedSpec: { controlType: 'variable speed' },
      }),
    ).toBe(false);
    expect(
      resolveVariableSpeedDrive({
        variableSpeedDrive: true,
        sourceBacked: { controlType: null },
      }),
    ).toBe(true);
  });
});
