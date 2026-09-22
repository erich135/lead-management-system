/**
 * ARS auxiliary-power allowance: motor rated power excludes fans and other
 * electrical loads. Motor power × 1.15 estimates total package input.
 * A value already labelled as total package input is never uplifted again.
 */

export const ARS_AUXILIARY_POWER_ALLOWANCE_PERCENT = 15;
export const ARS_AUXILIARY_POWER_ALLOWANCE_FRACTION = 0.15;
export const ARS_AUXILIARY_POWER_ALLOWANCE_LABEL =
  'ARS auxiliary-power allowance: 15%';
export const ESTIMATED_PACKAGE_INPUT_LABEL = 'Estimated package input';
export const ELECTRICAL_POWER_LABEL = 'Power';

export type ElectricalPowerKind = 'motor_power' | 'package_input';

export const ELECTRICAL_POWER_KIND_LABEL: Record<ElectricalPowerKind, string> = {
  motor_power: 'Motor power',
  package_input: 'Total package input',
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function isElectricalPowerKind(
  value: unknown,
): value is ElectricalPowerKind {
  return value === 'motor_power' || value === 'package_input';
}

export function inferElectricalPowerKind(input: {
  storedKind?: ElectricalPowerKind | null;
  packageInputPowerKw?: number | null;
  motorShaftPowerKw?: number | null;
}): ElectricalPowerKind | null {
  if (isElectricalPowerKind(input.storedKind)) return input.storedKind;
  if (finiteOrNull(input.packageInputPowerKw) !== null) return 'package_input';
  if (finiteOrNull(input.motorShaftPowerKw) !== null) return 'motor_power';
  return null;
}

export function enteredElectricalPowerKw(input: {
  kind: ElectricalPowerKind | null;
  packageInputPowerKw?: number | null;
  motorShaftPowerKw?: number | null;
}): number | null {
  if (input.kind === 'motor_power') {
    return finiteOrNull(input.motorShaftPowerKw);
  }
  if (input.kind === 'package_input') {
    return finiteOrNull(input.packageInputPowerKw);
  }
  return finiteOrNull(input.packageInputPowerKw);
}

export interface ResolvedPackageInput {
  kind: ElectricalPowerKind | null;
  enteredPowerKw: number | null;
  packageInputKw: number | null;
  auxiliaryAllowanceApplied: boolean;
  estimated: boolean;
}

export function resolvePackageInputKw(input: {
  storedKind?: ElectricalPowerKind | null;
  packageInputPowerKw?: number | null;
  motorShaftPowerKw?: number | null;
}): ResolvedPackageInput {
  const kind = inferElectricalPowerKind(input);
  const entered = enteredElectricalPowerKw({
    kind,
    packageInputPowerKw: input.packageInputPowerKw,
    motorShaftPowerKw: input.motorShaftPowerKw,
  });
  if (kind === 'motor_power' && entered !== null) {
    return {
      kind,
      enteredPowerKw: entered,
      packageInputKw: (entered * (100 + ARS_AUXILIARY_POWER_ALLOWANCE_PERCENT)) / 100,
      auxiliaryAllowanceApplied: true,
      estimated: true,
    };
  }
  if (entered !== null) {
    return {
      kind,
      enteredPowerKw: entered,
      packageInputKw: entered,
      auxiliaryAllowanceApplied: false,
      estimated: false,
    };
  }
  return {
    kind,
    enteredPowerKw: null,
    packageInputKw: null,
    auxiliaryAllowanceApplied: false,
    estimated: false,
  };
}

export function formatEstimatedPackageInputKw(
  value: number | null,
): string | null {
  if (value === null) return null;
  const digits = Number.isInteger(value) ? 0 : 2;
  return `${value.toLocaleString('en-ZA', {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })} kW`;
}
