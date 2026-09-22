import type {
  MachineEfficiencyAudit,
  MachineEfficiencyOrigin,
  MachineEfficiencySource,
} from './types';

export const ASSUMED_EFFICIENCY_PERCENT = 100;
export const EFFICIENCY_FIELD_LABEL = 'Efficiency (%)';
export const EFFICIENCY_BLANK_HELPER = 'Leave blank to assume 100%.';
export const UPLOAD_EFFICIENCY_AUDIT_LABEL = 'Upload efficiency audit';

export interface MachineEfficiencyFields {
  efficiencyPercent: number | null;
  efficiencyOrigin: MachineEfficiencyOrigin | null;
  efficiencyAudit: MachineEfficiencyAudit | null;
}

export const EMPTY_MACHINE_EFFICIENCY: MachineEfficiencyFields = {
  efficiencyPercent: null,
  efficiencyOrigin: null,
  efficiencyAudit: null,
};

export function coerceEfficiencyPercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim().replace(/%/g, '');
  if (text === '') return null;
  const number = typeof value === 'number' ? value : Number(text);
  if (!Number.isFinite(number) || number <= 0 || number > 100) return null;
  const percent = number <= 1 ? number * 100 : number;
  if (percent <= 0 || percent > 100) return null;
  return Math.round(percent * 1000) / 1000;
}

export function efficiencySource(
  percent: number | null | undefined,
  origin: MachineEfficiencyOrigin | null | undefined,
): MachineEfficiencySource {
  if (percent == null) return 'assumed';
  return origin === 'audit' ? 'audit' : 'manual';
}

export function efficiencySourceLabel(
  source: MachineEfficiencySource,
): 'Audit' | 'Manual' | 'Assumed 100%' {
  if (source === 'audit') return 'Audit';
  if (source === 'manual') return 'Manual';
  return 'Assumed 100%';
}

export function applyEfficiencyManualInput(
  current: MachineEfficiencyFields,
  raw: string,
): MachineEfficiencyFields {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return {
      ...current,
      efficiencyPercent: null,
      efficiencyOrigin: null,
    };
  }
  const percent = coerceEfficiencyPercent(trimmed);
  if (percent == null) return current;
  return {
    ...current,
    efficiencyPercent: percent,
    efficiencyOrigin: 'manual',
  };
}

export function applyEfficiencyAuditToFields(
  current: MachineEfficiencyFields,
  extractedPercent: number | null,
  file: {
    sourceFileId: string;
    sourceFileName: string;
    sourceSha256: string;
  },
): MachineEfficiencyFields {
  const audit: MachineEfficiencyAudit = {
    sourceFileId: file.sourceFileId,
    sourceFileName: file.sourceFileName,
    sourceSha256: file.sourceSha256,
    extractedPercent,
  };
  const keepManual =
    current.efficiencyOrigin === 'manual' && current.efficiencyPercent != null;
  if (keepManual || extractedPercent == null) {
    return { ...current, efficiencyAudit: audit };
  }
  return {
    efficiencyPercent: extractedPercent,
    efficiencyOrigin: 'audit',
    efficiencyAudit: audit,
  };
}

export function efficiencyFieldsFromRow(row: {
  efficiencyPercent?: number | null;
  efficiencyOrigin?: MachineEfficiencyOrigin | null;
  efficiencyAudit?: MachineEfficiencyAudit | null;
}): MachineEfficiencyFields {
  return {
    efficiencyPercent: row.efficiencyPercent ?? null,
    efficiencyOrigin: row.efficiencyOrigin ?? null,
    efficiencyAudit: row.efficiencyAudit ?? null,
  };
}
