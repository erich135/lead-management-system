import type {
  AuditCommercialScenario,
  AuditEquipmentGroup,
  AuditOperatingProfileSegment,
  AuditRecurringCommercialCostComponent,
  RecordValueProvenance,
  SourceStatedValueRecord,
} from '../auditIntakeTypes';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        key =>
          `${JSON.stringify(key)}:${canonical(
            (value as Record<string, unknown>)[key],
          )}`,
      )
      .join(',')}}`;
  return JSON.stringify(value);
}

export function provenanceNeedsOverride(provenance: RecordValueProvenance): boolean {
  if (provenance.sourceValue === null) return false;
  if (Object.is(provenance.sourceValue, provenance.currentValue)) return false;
  return canonical(provenance.sourceValue) !== canonical(provenance.currentValue);
}

export function isSourceBackedProvenance(
  provenance: RecordValueProvenance,
): boolean {
  return (
    provenance.sourceValue !== null ||
    provenance.sourceReference !== null ||
    provenance.sourceFilename !== null ||
    provenance.sourceSha256 !== null ||
    provenance.sourceText !== null
  );
}

export function structuredRecordIsRemovable(record: {
  provenance: RecordValueProvenance;
}): boolean {
  return !isSourceBackedProvenance(record.provenance);
}

function withoutProvenance<T extends { provenance: RecordValueProvenance }>(
  record: T,
) {
  const { provenance, ...projection } = record;
  void provenance;
  return projection;
}

export function equipmentGroupBusinessProjection(group: AuditEquipmentGroup) {
  return withoutProvenance(group);
}

export function operatingSegmentBusinessProjection(
  segment: AuditOperatingProfileSegment,
) {
  return withoutProvenance(segment);
}

export function commercialComponentBusinessProjection(
  component: AuditRecurringCommercialCostComponent,
) {
  return withoutProvenance(component);
}

export function commercialScenarioBusinessProjection(
  scenario: AuditCommercialScenario,
) {
  return withoutProvenance(scenario);
}

export function sourceStatedValueBusinessProjection(
  value: SourceStatedValueRecord,
) {
  return withoutProvenance(value);
}

export function equipmentGroupCurrentValue(group: AuditEquipmentGroup) {
  return group.model;
}

export function operatingSegmentCurrentValue(
  segment: AuditOperatingProfileSegment,
) {
  return segment.flowBasis === 'flow_fraction'
    ? segment.flowFraction
    : segment.measuredFlowM3PerMin;
}

export function commercialComponentCurrentValue(
  component: AuditRecurringCommercialCostComponent,
) {
  return component.amountRand;
}

export function commercialScenarioCurrentValue(
  scenario: AuditCommercialScenario,
) {
  return scenario.label;
}

export function sourceStatedValueCurrentValue(value: SourceStatedValueRecord) {
  return value.value;
}

export function structuredRecordChanged<T>(
  held: T,
  candidate: T,
  project: (record: T) => unknown,
): boolean {
  return canonical(project(held)) !== canonical(project(candidate));
}

/** Preserves the source record and appends the evidence and reason for a restatement. */
export function recordOverride<T>(
  provenance: RecordValueProvenance<T>,
  currentValue: T,
  reason: string,
  evidenceId: string,
  structuredChangeRequiresOverride = false,
): RecordValueProvenance<T> {
  if (
    (structuredChangeRequiresOverride ||
      provenanceNeedsOverride({ ...provenance, currentValue })) &&
    (!reason.trim() || !evidenceId.trim())
  )
    throw new Error('A source-backed change needs both a reason and evidence.');
  return {
    ...provenance,
    currentValue,
    evidenceIds: evidenceId.trim()
      ? [...new Set([...provenance.evidenceIds, evidenceId.trim()])]
      : provenance.evidenceIds,
    overrideReason: reason.trim() || provenance.overrideReason,
  };
}
