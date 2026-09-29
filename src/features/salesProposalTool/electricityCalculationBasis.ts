export type ElectricityCalculationBasis = 'air_audit' | 'published_capacity';

export const AIR_AUDIT_DEMAND_BASIS_STATEMENT =
  'Electricity calculation basis: Measured Air Audit demand';

export const PUBLISHED_CAPACITY_BASIS_STATEMENT =
  'Electricity calculation basis: Published machine capacity — ARS legacy method';

export const AIR_AUDIT_DEMAND_HELP =
  'Uses the 24-hour Air Audit demand profile. Each clock hour is the average of the valid readings in that hour, and that daily profile is applied to the production-day schedule. The overall logger mean remains a separate statistic.';

export const PUBLISHED_CAPACITY_HELP =
  "Uses the machines' published/site-adjusted airflow and the ARS legacy full-load calculation method.";

export function defaultElectricityCalculationBasis(
  hasAirAudit: boolean,
): ElectricityCalculationBasis {
  return hasAirAudit ? 'air_audit' : 'published_capacity';
}

export function electricityCalculationBasisStatement(
  basis: ElectricityCalculationBasis,
): string {
  return basis === 'published_capacity'
    ? PUBLISHED_CAPACITY_BASIS_STATEMENT
    : AIR_AUDIT_DEMAND_BASIS_STATEMENT;
}

export const MEASURED_AIR_AUDIT_BASIS_TITLE =
  'Calculation basis: Measured Air Audit data';

export const PUBLISHED_MACHINE_VALUES_BASIS_TITLE =
  'Calculation basis: Published machine values';

export const MEASURED_AIR_AUDIT_BASIS_EXPLANATION =
  'These calculations are based on measured site air demand from the uploaded Air Audit, together with the selected machine specifications, tariffs and operating assumptions.';

export const PUBLISHED_MACHINE_VALUES_BASIS_EXPLANATION =
  'These calculations are based on published/site-adjusted machine values and the selected operating assumptions. Measured Air Audit demand is not used as the electricity-volume basis.';

export function customerProposalCalculationBasisCopy(
  basis: ElectricityCalculationBasis | null | undefined,
): { title: string; explanation: string } {
  if (basis === 'published_capacity') {
    return {
      title: PUBLISHED_MACHINE_VALUES_BASIS_TITLE,
      explanation: PUBLISHED_MACHINE_VALUES_BASIS_EXPLANATION,
    };
  }
  return {
    title: MEASURED_AIR_AUDIT_BASIS_TITLE,
    explanation: MEASURED_AIR_AUDIT_BASIS_EXPLANATION,
  };
}
