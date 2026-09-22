export const VARIABLE_SPEED_DRIVE_LABEL = 'Variable-speed drive (VSD)';

export function controlTypeIndicatesVsd(
  controlType: string | null | undefined,
): boolean {
  const text = (controlType ?? '').trim().toLowerCase();
  if (!text) return false;
  return (
    /\bvsd\b/.test(text) ||
    text.includes('variable speed') ||
    text.includes('variable-speed')
  );
}

export function inferVariableSpeedDriveFromControlType(
  controlType: string | null | undefined,
): boolean {
  return controlTypeIndicatesVsd(controlType);
}

export function resolveVariableSpeedDrive(input: {
  variableSpeedDrive?: boolean | null;
  sourceBacked?: { controlType?: string | null } | null;
  selectedSpec?: { controlType?: string | null } | null;
}): boolean {
  if (typeof input.variableSpeedDrive === 'boolean') return input.variableSpeedDrive;
  return controlTypeIndicatesVsd(
    input.sourceBacked?.controlType ?? input.selectedSpec?.controlType,
  );
}
