/**
 * Step 15, frontend half.
 *
 * The backend labels every figure it releases. These checks prove the screen
 * repeats those labels instead of deciding for itself: an unavailable figure
 * never reads as a number, a valid zero always reads as zero, the backend's
 * reason travels with the figure it explains, and every provenance and
 * uncertainty class the backend can send has a label, so nothing can arrive and
 * be shown as blank.
 */

import assert from 'node:assert/strict';

import {
  describeFigure,
  describeNumericUncertainty,
  MEASURED_DEMAND_UNAVAILABLE_LABEL,
  measuredUnit,
  PROVENANCE_LABELS,
  UNCERTAINTY_LABELS,
} from '../src/features/bouwa/measuredFigurePresentation.ts';
import type {
  ScientificCalculationProvenance,
  ScientificFigureMetadata,
  ScientificUncertainty,
} from '../src/features/bouwa/loggerLocalTypes.ts';

function metadata(
  overrides: Partial<ScientificFigureMetadata> = {},
): ScientificFigureMetadata {
  return {
    unit: 'm3/min',
    provenance: 'exact_mathematics',
    uncertainty: 'measured',
    calculationId: 'CALC-030',
    numericUncertainty: null,
    reason: 'Integrated logger flow is within the accepted bands.',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Unavailable never becomes a number
 * ------------------------------------------------------------------ */

const missing = describeFigure(
  null,
  metadata({
    unit: 'factor',
    uncertainty: 'unavailable',
    calculationId: 'CALC-051',
    reason: 'Annual operating hours are not confirmed; annualisation is unavailable.',
  }),
  2,
);

assert.equal(missing.available, false);
assert.equal(missing.text, MEASURED_DEMAND_UNAVAILABLE_LABEL);
assert.ok(
  !/\d/.test(missing.text),
  'an unavailable figure must not read as any number, least of all zero',
);
assert.equal(
  missing.reason,
  'Annual operating hours are not confirmed; annualisation is unavailable.',
  'the backend reason is what explains an absent value',
);
assert.equal(missing.detail, 'Unavailable · Exact calculation · CALC-051');

/* ------------------------------------------------------------------ *
 * A valid zero stays zero
 * ------------------------------------------------------------------ */

const zero = describeFigure(
  0,
  metadata({ unit: 's', calculationId: 'CALC-021', uncertainty: 'measured' }),
  0,
);

assert.equal(zero.available, true);
assert.equal(zero.text, '0 s');
assert.equal(
  zero.reason,
  null,
  'a figure with a value needs no reason for its absence',
);
assert.notEqual(
  zero.text,
  MEASURED_DEMAND_UNAVAILABLE_LABEL,
  'a measured zero is an answer, not a missing value',
);

const zeroWithDecimals = describeFigure(0, metadata({ unit: 'm3/min' }), 3);
assert.equal(zeroWithDecimals.text, '0,000 m³/min');

/* ------------------------------------------------------------------ *
 * A non-finite value is treated as absent rather than printed
 * ------------------------------------------------------------------ */

for (const nonFinite of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  const described = describeFigure(nonFinite, metadata(), 2);
  assert.equal(described.available, false);
  assert.equal(described.text, MEASURED_DEMAND_UNAVAILABLE_LABEL);
  assert.ok(
    !described.text.includes('NaN') && !described.text.includes('∞'),
    'no screen may print NaN or infinity',
  );
}

/* ------------------------------------------------------------------ *
 * Every class the backend can send has a label
 * ------------------------------------------------------------------ */

const provenanceClasses: ScientificCalculationProvenance[] = [
  'exact_mathematics',
  'established_engineering',
  'manufacturer_specification',
  'approved_assumption',
  'business_input',
  'user_input',
];
const uncertaintyClasses: ScientificUncertainty[] = [
  'measured',
  'derived_exact',
  'derived_manufacturer',
  'estimated',
  'estimated_from_short_record',
  'unavailable',
];

assert.deepEqual(Object.keys(PROVENANCE_LABELS).sort(), [...provenanceClasses].sort());
assert.deepEqual(Object.keys(UNCERTAINTY_LABELS).sort(), [...uncertaintyClasses].sort());
for (const label of [
  ...Object.values(PROVENANCE_LABELS),
  ...Object.values(UNCERTAINTY_LABELS),
])
  assert.notEqual(label, '', 'every class must be readable on screen');

assert.ok(
  !Object.keys(PROVENANCE_LABELS).includes('comparison_evidence'),
  'comparison evidence is never a released provenance',
);

/* ------------------------------------------------------------------ *
 * Provenance is repeated, not reinterpreted
 * ------------------------------------------------------------------ */

const manufacturer = describeFigure(
  184,
  metadata({
    unit: 'kW',
    provenance: 'manufacturer_specification',
    uncertainty: 'derived_manufacturer',
    calculationId: 'CALC-043',
  }),
  3,
);
assert.equal(
  manufacturer.detail,
  'Manufacturer-derived · Manufacturer-derived · CALC-043',
  'a manufacturer figure keeps manufacturer provenance on screen',
);

const shortRecord = describeFigure(
  52.7,
  metadata({
    unit: 'factor',
    uncertainty: 'estimated_from_short_record',
    calculationId: 'CALC-051',
  }),
  1,
);
assert.ok(
  shortRecord.detail.startsWith('Estimated from short record'),
  'a short-record annualisation says so wherever it appears',
);

const approved = describeFigure(
  4200,
  metadata({
    unit: 'h/y',
    provenance: 'approved_assumption',
    uncertainty: 'estimated',
    calculationId: 'CALC-052',
  }),
  0,
);
assert.ok(approved.detail.includes('Approved assumption'));
assert.ok(
  !approved.detail.includes('Measured'),
  'an approved assumption is never presented as a measurement',
);

/* ------------------------------------------------------------------ *
 * Units and numeric uncertainty
 * ------------------------------------------------------------------ */

assert.equal(measuredUnit('m3'), 'm³');
assert.equal(measuredUnit('m3/min'), 'm³/min');
assert.equal(measuredUnit('kW'), 'kW');

assert.equal(describeNumericUncertainty(metadata()), 'Not defined');
assert.equal(
  describeNumericUncertainty(
    metadata({
      numericUncertainty: {
        plusMinus: 0.5,
        unit: 'm3',
        basis: 'counter_quantisation',
      },
    }),
  ),
  '± 0,500 m³ · counter quantisation',
);

process.stdout.write('Bouwa provenance presentation checks passed.\n');
