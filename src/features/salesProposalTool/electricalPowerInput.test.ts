import { describe, expect, it } from 'vitest';
import {
  ARS_AUXILIARY_POWER_ALLOWANCE_LABEL,
  inferElectricalPowerKind,
  resolvePackageInputKw,
} from './electricalPowerInput.ts';
import {
  applyProposedLibrarySpec,
  emptyProposedDraft,
  proposedDraftsFromProposal,
  toProposedEquipmentPayload,
} from './equipmentState.ts';
import type { PublicMachineSpec } from './types.ts';

const bouwa: PublicMachineSpec = {
  recordId: 'lib-bouwa-55',
  manufacturer: 'BOUWA',
  model: 'SC-RS55A',
  modelVariant: null,
  ratedPressureBarG: 8,
  ratedAirflowM3PerMin: 9.06,
  packageInputPowerKw: null,
  motorShaftPowerKw: 55,
  controlType: null,
  sourceTitle: 'BOUWA datasheet',
  sourceFileName: null,
};

const atlas: PublicMachineSpec = {
  recordId: 'lib-atlas',
  manufacturer: 'Atlas Copco',
  model: 'ZT 160 VSD+-10.4',
  modelVariant: null,
  ratedPressureBarG: 10.34,
  ratedAirflowM3PerMin: 23.52,
  packageInputPowerKw: 176.3,
  motorShaftPowerKw: 160.03,
  controlType: 'VSD',
  sourceTitle: 'CAGI',
  sourceFileName: null,
};

describe('electrical power input', () => {
  it('turns 55 kW motor power into 63.25 kW estimated package input', () => {
    const resolved = resolvePackageInputKw({
      storedKind: 'motor_power',
      motorShaftPowerKw: 55,
    });
    expect(resolved.packageInputKw).toBe(63.25);
    expect(resolved.auxiliaryAllowanceApplied).toBe(true);
    expect(ARS_AUXILIARY_POWER_ALLOWANCE_LABEL).toBe(
      'ARS auxiliary-power allowance: 15%',
    );
  });

  it('does not add 15% to a value entered as total package input', () => {
    const resolved = resolvePackageInputKw({
      storedKind: 'package_input',
      packageInputPowerKw: 63.25,
      motorShaftPowerKw: 55,
    });
    expect(resolved.packageInputKw).toBe(63.25);
    expect(resolved.auxiliaryAllowanceApplied).toBe(false);
  });

  it('does not compound the allowance after save and reopen', () => {
    const applied = applyProposedLibrarySpec(emptyProposedDraft(), bouwa);
    expect(applied.electricalPowerKind).toBe('motor_power');
    const payload = toProposedEquipmentPayload(applied);
    expect(payload[0].electricalPowerKind).toBe('motor_power');
    expect(payload[0].sourceBacked).toBe(null);
    const reopened = proposedDraftsFromProposal(payload)[0];
    expect(reopened.electricalPowerKind).toBe('motor_power');
    const again = resolvePackageInputKw({
      storedKind: reopened.electricalPowerKind,
      packageInputPowerKw: reopened.selectedSpec?.packageInputPowerKw ?? null,
      motorShaftPowerKw: bouwa.motorShaftPowerKw,
    });
    expect(again.packageInputKw).toBe(63.25);

    const atlasApplied = applyProposedLibrarySpec(emptyProposedDraft(), atlas);
    expect(atlasApplied.electricalPowerKind).toBe('package_input');
    const atlasPayload = toProposedEquipmentPayload(atlasApplied);
    expect(atlasPayload[0].electricalPowerKind).toBe('package_input');
    expect(
      inferElectricalPowerKind({
        storedKind: atlasPayload[0].electricalPowerKind,
        packageInputPowerKw: atlas.packageInputPowerKw,
        motorShaftPowerKw: atlas.motorShaftPowerKw,
      }),
    ).toBe('package_input');
    expect(
      resolvePackageInputKw({
        storedKind: 'package_input',
        packageInputPowerKw: 176.3,
        motorShaftPowerKw: 160.03,
      }).packageInputKw,
    ).toBe(176.3);
  });
});
