/**
 * What choosing a catalogued instrument is allowed to fill in.
 *
 * The rule is the one the machine pickers follow: a selection fills the answers
 * the source genuinely states, and not one answer more. The catalogue holds
 * what an instrument is and how it was set up, so it fills the make, the model,
 * the serial number, the range, the basis, the configured cutoff and the
 * calibration. It never fills where the instrument was installed or what it was
 * measuring on this particular audit, because those are facts about the site
 * visit and not about the instrument.
 *
 * A range only fills the range questions when its unit is the unit the question
 * is asked in. A pressure range in bar has nothing to say about a flow range in
 * m³/min, and converting between them here would be inventing a reading.
 */

import type { AuditFormField, IntakeAnswer } from '../auditIntakeTypes';
import type { WizardEquipment, WizardEquipmentType } from './wizardTypes';

export type EquipmentIntakeEntry = [string, IntakeAnswer<unknown>];

/** The intake section each kind of instrument answers for. */
export const EQUIPMENT_TYPE_BY_SECTION: Record<string, WizardEquipmentType> = {
  logger: 'flow_logger',
  flow_sensor: 'flow_sensor',
  pressure_sensor: 'pressure_sensor',
  temperature_sensor: 'temperature_sensor',
};

/** The field-code prefix each kind of instrument answers under. */
export const EQUIPMENT_CODE_PREFIX: Record<WizardEquipmentType, string> = {
  flow_logger: 'AUDIT.LOGGER',
  flow_sensor: 'AUDIT.FLOW_SENSOR',
  pressure_sensor: 'AUDIT.PRESSURE_SENSOR',
  temperature_sensor: 'AUDIT.TEMPERATURE_SENSOR',
};

/** The unit a range must be stated in before it may answer a range question. */
const RANGE_UNIT: Partial<Record<WizardEquipmentType, string>> = {
  flow_sensor: 'm³/min',
  pressure_sensor: 'bar',
  temperature_sensor: '°C',
};

/** The basis question each kind of instrument answers, where it has one. */
const BASIS_SUFFIX: Partial<Record<WizardEquipmentType, string>> = {
  flow_sensor: 'FLOW_REFERENCE_BASIS',
  pressure_sensor: 'PRESSURE_BASIS',
};

function answered(value: string | number): IntakeAnswer<unknown> {
  return { state: 'answered', value, note: null };
}

/**
 * The answers a catalogue entry states, as field codes. Codes are used rather
 * than intake paths because the same instrument fills different sections
 * depending on what it is, and the backend's form model already states where
 * each code is stored.
 */
export function equipmentAnswersByCode(
  equipment: WizardEquipment,
): Map<string, string | number> {
  const prefix = EQUIPMENT_CODE_PREFIX[equipment.equipmentType];
  const answers = new Map<string, string | number>();
  const put = (suffix: string, value: string | number | null) => {
    if (value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    answers.set(`${prefix}.${suffix}`, value);
  };

  put('MANUFACTURER', equipment.manufacturer);
  put('MODEL', equipment.model);
  put('SERIAL_NUMBER', equipment.serialNumber);
  put('HARDWARE_VERSION', equipment.hardwareVersion);
  put('SOFTWARE_VERSION', equipment.softwareVersion);
  put('CONFIGURATION_VERSION', equipment.configurationVersion);
  put('CALIBRATION_DATE', equipment.calibrationDate);
  put('CALIBRATION_CERTIFICATE', equipment.calibrationCertificateReference);
  put('CONFIGURATION_EVIDENCE', equipment.evidenceReference);

  const expectedUnit = RANGE_UNIT[equipment.equipmentType];
  const range = equipment.measuringRange;
  if (range !== null && expectedUnit !== undefined && range.unit === expectedUnit) {
    put('RANGE_MINIMUM', range.minimum);
    put('RANGE_MAXIMUM', range.maximum);
  }

  const basisSuffix = BASIS_SUFFIX[equipment.equipmentType];
  if (basisSuffix !== undefined) put(basisSuffix, equipment.referenceBasis);

  if (equipment.equipmentType === 'flow_sensor')
    put('CONFIGURED_LOW_FLOW_CUTOFF', equipment.configuredLowFlowCutoffM3PerMin);

  return answers;
}

/**
 * The same answers as intake entries, addressed by the paths the backend's form
 * model gives. A code the model does not carry is dropped rather than guessed
 * at: the audit asks the questions, and a catalogue entry only answers the ones
 * that were asked.
 */
export function equipmentIntakeEntries(
  equipment: WizardEquipment,
  fields: readonly AuditFormField[],
): EquipmentIntakeEntry[] {
  const pathByCode = new Map(fields.map(field => [field.code, field.path]));
  const entries: EquipmentIntakeEntry[] = [];
  for (const [code, value] of equipmentAnswersByCode(equipment)) {
    const path = pathByCode.get(code);
    if (path === undefined) continue;
    entries.push([path, answered(value)]);
  }
  return entries;
}

/**
 * The text already answered for a field code, where it was answered outright.
 * "Unknown" is not text: it is a deliberate refusal to state a value, and a
 * catalogue entry must not be shown as the one chosen on the strength of it.
 */
export function answeredTextForCode(
  fields: readonly AuditFormField[],
  code: string,
  answerAt: (path: string) => IntakeAnswer<unknown> | null,
): string | null {
  const path = fields.find(field => field.code === code)?.path;
  if (path === undefined) return null;
  const answer = answerAt(path);
  if (answer === null || answer === undefined || answer.state !== 'answered')
    return null;
  return typeof answer.value === 'string' ? answer.value : null;
}

/** A one-line description of a catalogue entry, for a list row. */
export function equipmentSummaryLine(equipment: WizardEquipment): string {
  const parts: string[] = [];
  if (equipment.serialNumber !== null)
    parts.push(`Serial ${equipment.serialNumber}`);
  if (equipment.measuringRange !== null)
    parts.push(
      `${equipment.measuringRange.minimum}–${equipment.measuringRange.maximum} ${equipment.measuringRange.unit}`,
    );
  if (equipment.calibrationDate !== null)
    parts.push(`calibrated ${equipment.calibrationDate}`);
  else parts.push('no calibration recorded');
  return parts.join(' · ');
}
