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

export function conceptForField(code: string): WizardConcept | null {
  // The most specific match wins, so the proposed machine's control method is
  // explained by the VSD note rather than the general one.
  let best: WizardConcept | null = null;
  for (const concept of WIZARD_CONCEPTS)
    if (code.includes(concept.match))
      if (best === null || concept.match.length > best.match.length) best = concept;
  return best;
}
