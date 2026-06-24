import {
  buildFieldValueMap,
  getFieldDisplayValue,
  isFieldChecked,
  getJobFieldValue,
  getMachineFieldValue,
  type FieldValueEntry,
} from './fixedJobCardValues';

export interface TemplateFieldRef {
  id: string;
  type: string;
  jobFieldKey?: string;
  machineFieldKey?: string;
}

/**
 * Creates a function that resolves display values for template fields from submission data.
 */
export function createFixedJobCardFieldResolver(
  fieldValues: FieldValueEntry[],
  job?: Record<string, unknown>,
  machine?: Record<string, unknown>,
  reportNumber?: string
) {
  const valueMap = buildFieldValueMap(fieldValues);

  /**
   * Resolves RSR/MCC report number for template fields keyed as rsrNumber or reportNumber.
   */
  const resolveReportNumberField = (): string => {
    if (reportNumber) return reportNumber;
    return getJobFieldValue(job, 'rsrNumber');
  };

  /**
   * Resolves a single field to its display string for the printed report.
   */
  const resolve = (field: TemplateFieldRef): string => {
    if (field.type === 'jobField' && field.jobFieldKey) {
      if (field.jobFieldKey === 'rsrNumber' || field.jobFieldKey === 'reportNumber') {
        return (
          resolveReportNumberField() ||
          getFieldDisplayValue(valueMap, field.id)
        );
      }
      return getJobFieldValue(job, field.jobFieldKey) || getFieldDisplayValue(valueMap, field.id);
    }
    if (field.type === 'machineField' && field.machineFieldKey) {
      return (
        getMachineFieldValue(machine, field.machineFieldKey) ||
        getFieldDisplayValue(valueMap, field.id)
      );
    }
    if (field.type === 'yesno' || field.type === 'checkbox') {
      const v = valueMap.get(field.id);
      if (v === false || v === 'no') return 'No';
      return isFieldChecked(valueMap, field.id) ? 'Yes' : '';
    }
    if (field.type === 'signature') {
      return getFieldDisplayValue(valueMap, field.id) || '';
    }
    if (field.type === 'date') {
      const raw = valueMap.get(field.id);
      if (typeof raw === 'string' && raw.includes('T')) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }
    }
    return getFieldDisplayValue(valueMap, field.id);
  };

  /**
   * Returns checklist status cell content (pass / fail / N/A, number, or text).
   */
  const resolveChecklistStatus = (itemId: string, inputType?: string): string => {
    const statusId = `${itemId}_status`;
    const value = valueMap.get(statusId);

    if (inputType === 'pass_fail') {
      if (value === 'pass' || value === true) return '✓';
      if (value === 'fail') return 'Fail';
      if (value === 'na') return 'N/A';
      return isFieldChecked(valueMap, statusId) ? '✓' : '';
    }

    return getFieldDisplayValue(valueMap, statusId);
  };

  /**
   * Returns checklist comment for an item.
   */
  const resolveChecklistComment = (itemId: string): string => {
    return getFieldDisplayValue(valueMap, `${itemId}_comment`);
  };

  /**
   * Returns base64 image data for a captured signature field, if present.
   */
  const resolveSignatureImage = (fieldId: string): string | null => {
    // Check signatureData first (drawn signatures), then imageData (captured photos)
    const sig = valueMap.get(`${fieldId}_signature`) ?? valueMap.get(`${fieldId}_image`) ?? valueMap.get(fieldId);
    if (typeof sig === 'string' && sig.startsWith('data:image')) {
      return sig;
    }
    return null;
  };

  return { valueMap, resolve, resolveChecklistStatus, resolveChecklistComment, resolveSignatureImage, isFieldChecked };
}

export type FixedJobCardFieldResolver = ReturnType<typeof createFixedJobCardFieldResolver>;
