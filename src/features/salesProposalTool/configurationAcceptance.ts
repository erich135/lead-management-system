import type { AirAuditScope } from './airAuditScope';
import type { ProposedEquipment } from './types';

export const ACCEPT_CONFIGURATION_TITLE = 'Configuration accepted with warnings';
export const ACCEPT_CONFIGURATION_NOTE =
  'The selected configuration has been manually accepted. Automated Air Audit warnings remain applicable.';

const BLOCKING_WARNINGS = new Set([
  'Highest recorded airflow exceeds the proposed published capacity.',
  'P90 measured airflow is above the proposed published capacity.',
  'Highest recorded airflow exceeds the proposed site-adjusted capacity.',
  'P90 measured airflow is above the proposed site-adjusted capacity.',
  "The proposed machine's published pressure is below the pressure recorded during the Air Audit. Confirm the proposed configuration before relying on the comparison.",
]);

export interface LocalConfigurationAcceptance {
  note: string | null;
  key: string;
  fingerprint: string;
  acceptedAt: string;
}

export function configurationWarningsFail(warnings: readonly string[]): boolean {
  return warnings.some((warning) => BLOCKING_WARNINGS.has(warning));
}

export function showsAcceptConfigurationButton(
  validationFailed: boolean,
  accepted: boolean,
): boolean {
  return validationFailed && !accepted;
}

export function showsRevokeAcceptance(
  validationFailed: boolean,
  accepted: boolean,
): boolean {
  return validationFailed && accepted;
}

export function engineeringAcceptanceKey(input: {
  airAuditSha256: string | null;
  airAuditScope: AirAuditScope;
  hasAirAudit: boolean;
  altitudeMetres: number | null;
  intakeAirTemperatureC: number | null;
  proposed: ProposedEquipment[];
}): string {
  return JSON.stringify({
    airAuditSha256: input.airAuditSha256,
    airAuditScopeType: input.airAuditScope.type,
    airAuditScopeEquipmentId: input.airAuditScope.currentEquipmentId,
    hasAirAudit: input.hasAirAudit,
    altitudeMetres: input.altitudeMetres,
    intakeAirTemperatureC: input.intakeAirTemperatureC,
    proposed: input.proposed.map((machine) => ({
      specLibraryRecordId: machine.specLibraryRecordId,
      quantity: machine.quantity,
      manufacturer: machine.manufacturer,
      model: machine.model,
      ratedAirflowM3PerMin: machine.sourceBacked?.ratedAirflowM3PerMin ?? null,
      ratedPressureBarG: machine.sourceBacked?.ratedPressureBarG ?? null,
      packageInputPowerKw: machine.sourceBacked?.packageInputPowerKw ?? null,
      motorShaftPowerKw: machine.sourceBacked?.motorShaftPowerKw ?? null,
      flowReferenceBasis: machine.flowReferenceBasis ?? null,
      referenceAbsolutePressurePa: machine.referenceAbsolutePressurePa ?? null,
      intakeTemperatureOverrideC: machine.intakeTemperatureOverrideC ?? null,
    })),
  });
}

export function formatAcceptanceTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
