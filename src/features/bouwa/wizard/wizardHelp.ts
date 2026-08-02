/**
 * Plain explanations of the few ideas a user cannot be expected to arrive with.
 *
 * The backend already says why each question matters. What it does not say —
 * because it is addressing an engineer — is what the words mean. A salesperson
 * reading "flow reference basis" needs to be told, once and briefly, that two
 * capacity figures are only comparable when they are stated the same way.
 *
 * These are explanations, not defaults. Nothing here fills a field in, and
 * nothing here changes what is blocked.
 */

export interface WizardConcept {
  /** Matched against the field code as a substring. */
  match: string;
  title: string;
  body: string;
}

export const WIZARD_CONCEPTS: WizardConcept[] = [
  {
    match: 'FLOW_REFERENCE_BASIS',
    title: 'Flow reference basis',
    body:
      'The same compressor can be quoted at different capacities depending on the ' +
      'conditions the figure refers to. Free Air Delivery is measured back at the ' +
      "machine's own inlet conditions; standard flow is corrected to an agreed " +
      'reference pressure and temperature; actual flow is whatever the air is doing ' +
      'where the meter sits. Subtracting one from another compares nothing, so the ' +
      'basis is asked before any comparison is allowed.',
  },
  {
    match: 'PRESSURE_BASIS',
    title: 'Pressure basis',
    body:
      'Gauge pressure counts up from the air around us; absolute pressure counts up ' +
      'from a vacuum, and is about one bar higher for the same air. A differential ' +
      'is the difference between two points and is not a pressure at either of them. ' +
      'Seven bar gauge and seven bar absolute are different air.',
  },
  {
    match: 'POWER_BASIS',
    title: 'Power basis',
    body:
      'Package input power is what the whole machine draws from the supply, including ' +
      'the fan and the controls. Motor input is only the motor. Shaft output is what ' +
      'the motor delivers to the airend, and reaching input power from it needs the ' +
      "motor's efficiency. A nameplate rating is what the motor may draw, not what it " +
      'is drawing. Dividing a measured package figure by an efficiency counts the same ' +
      'losses twice.',
  },
  {
    match: 'CONTROL_METHOD',
    title: 'Control method',
    body:
      'How the machine meets a demand below its full output. Load/unload runs at full ' +
      'output and then idles; modulation throttles the inlet and stays running; a ' +
      'variable-speed drive slows the motor. Each spends a very different amount of ' +
      'energy at part load, which is why the saving cannot be estimated from capacity ' +
      'alone.',
  },
  {
    match: 'PROPOSED_MACHINE.CONTROL_METHOD',
    title: 'Why a VSD curve is required',
    body:
      'A variable-speed machine has no single efficiency. Its power depends on the flow ' +
      "it is asked for, so a trusted saving needs the manufacturer's published " +
      'flow-versus-package-power table for that model. Without it the measured demand ' +
      'is still reported, but the saving stays blocked rather than being assumed.',
  },
  {
    match: 'LOW_FLOW_CUTOFF',
    title: 'Low-flow cutoff',
    body:
      'Below a configured flow the meter reports zero rather than a small number. Where ' +
      'that threshold sits decides how much genuine light-load air was never recorded, ' +
      'so it is a volume in m³/min, never a percentage.',
  },
  {
    match: 'OPERATING_CONDITIONS',
    title: 'Representative period',
    body:
      'Whether the logged days are the site working normally. A shutdown week, a heat ' +
      'wave or a single shift instead of three all measure something real, and none of ' +
      'them may be scaled to a year as if it were ordinary. Saying the period is not ' +
      'representative does not discard the measurement; it stops it being annualised.',
  },
  {
    match: 'ANNUAL_OPERATING_HOURS',
    title: 'Annual operating hours',
    body:
      'The bridge between what was measured over a few days and what a year costs. It ' +
      'is a business fact about the site, not something the logger can state, so an ' +
      'annual figure stays blocked until somebody who knows the site confirms it.',
  },
];

/* ------------------------------------------------------------------ *
 * The three things a question owes the person answering it
 *
 * What it means, why Bouwa wants it, and what an acceptable answer looks like.
 * The backend already says why. The meaning is above, for the ideas that need
 * one. The third is below, and is worked out from the field's own shape rather
 * than written two hundred times — a box that takes a temperature in °C can say
 * so without anybody hand-writing the sentence.
 * ------------------------------------------------------------------ */

/** Examples for the few fields whose format a unit alone does not convey. */
const FORMAT_EXAMPLES: { match: string; example: string }[] = [
  {
    match: 'IDENTITY.GPS_REFERENCE',
    example: 'Decimal degrees, latitude first. For example -26.204103, 28.047305',
  },
  {
    match: 'SOURCE_LOGGER_SHA256',
    example: 'Recorded from the uploaded file. Never typed',
  },
  {
    match: 'SERIAL_NUMBER',
    example: 'As printed on the machine plate. For example APF123456',
  },
  {
    match: 'CALIBRATION_CERTIFICATE',
    example: 'The certificate reference. For example CERT-2026-0142',
  },
  {
    match: 'TARIFF_YEAR',
    example: 'The tariff year the schedule was published for. For example 2026',
  },
  {
    match: 'VSD_TURNDOWN',
    example: 'The lowest flow the drive holds, as a share of full flow',
  },
];

const VALUE_KIND_FORMATS: Record<string, string> = {
  date: 'A calendar date, chosen from the picker',
  long_text: 'A short description in your own words',
  selection: 'Choose one of the listed values',
  integer: 'A whole number',
  sha256: 'Recorded from the uploaded file. Never typed',
};

export interface WizardFieldShape {
  code: string;
  valueKind: string;
  unit: string | null;
  entry: { unit: string; minimum: number; maximum: number } | null;
}

/**
 * What an acceptable answer looks like, in one line.
 *
 * A number says its unit and, where the field has one, the range it must fall
 * in — so a person meets the limit before the validation does.
 */
export function acceptedFormat(field: WizardFieldShape): string | null {
  const written = FORMAT_EXAMPLES.filter(entry =>
    field.code.includes(entry.match),
  ).sort((left, right) => right.match.length - left.match.length)[0];
  if (written !== undefined) return written.example;

  if (field.valueKind === 'number' || field.valueKind === 'integer') {
    const unit = field.entry?.unit ?? field.unit;
    const range =
      field.entry === null
        ? ''
        : ` between ${field.entry.minimum} and ${field.entry.maximum}`;
    const kind = field.valueKind === 'integer' ? 'A whole number' : 'A number';
    return unit === null ? `${kind}${range}` : `${kind}${range}, in ${unit}`;
  }

  return VALUE_KIND_FORMATS[field.valueKind] ?? null;
}

/**
 * The one line kept visible beside a question.
 *
 * The backend's reason is written for an engineer reading the whole paragraph.
 * A person filling a form in reads the first clause of it, so that is what
 * stays on the screen and the rest waits behind the question mark.
 */
export function leadSentence(whyItMatters: string): string {
  const text = whyItMatters.trim();
  if (text === '') return '';
  const stop = /[.;](\s|$)/.exec(text);
  if (stop === null) return text;
  return `${text.slice(0, stop.index)}.`;
}

export function conceptForField(code: string): WizardConcept | null {
  // The most specific match wins, so the proposed machine's control method is
  // explained by the VSD note rather than the general one.
  let best: WizardConcept | null = null;
  for (const concept of WIZARD_CONCEPTS)
    if (code.includes(concept.match))
      if (best === null || concept.match.length > best.match.length) best = concept;
  return best;
}
