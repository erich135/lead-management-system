export type AirAuditScopeType = 'single_machine' | 'site_header';

export interface AirAuditScope {
  type: AirAuditScopeType;
  currentEquipmentId: string | null;
}

export const DEFAULT_AIR_AUDIT_SCOPE: AirAuditScope = {
  type: 'site_header',
  currentEquipmentId: null,
};

export const SITE_HEADER_MEASURED_HEADING = 'Measured site air demand';
export const SINGLE_MACHINE_UNASSIGNED_HEADING = 'Measured compressor performance';

export function normaliseAirAuditScope(
  input: Partial<AirAuditScope> | null | undefined,
  equipmentIds: readonly string[],
): AirAuditScope {
  const type = input?.type === 'single_machine' ? 'single_machine' : 'site_header';
  if (type === 'site_header') {
    return { type: 'site_header', currentEquipmentId: null };
  }
  if (equipmentIds.length === 1) {
    return { type: 'single_machine', currentEquipmentId: equipmentIds[0] };
  }
  const requestedId = input?.currentEquipmentId?.trim() || null;
  if (requestedId && equipmentIds.includes(requestedId)) {
    return { type: 'single_machine', currentEquipmentId: requestedId };
  }
  return { type: 'single_machine', currentEquipmentId: null };
}

export function measuredMachineLabel(row: {
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
}): string {
  const name = `${row.make ?? ''} ${row.model ?? ''}`.trim();
  const serial = row.serialNumber?.trim();
  if (name && serial) return `${name} — Serial ${serial}`;
  return name;
}
