import assert from 'node:assert/strict';
import test from 'node:test';
import {
  containsInventedElectricalCopy,
  displayOrUnavailable,
  formatEstimatedKwh,
  formatEstimatedRand,
  formatMeasuredNumber,
  isRenderableMeasuredValue,
} from './formatMeasured.ts';

test('missing measured values never render as numerical zero', () => {
  assert.equal(isRenderableMeasuredValue(null), false);
  assert.equal(isRenderableMeasuredValue(undefined), false);
  assert.equal(isRenderableMeasuredValue(Number.NaN), false);
  assert.equal(formatMeasuredNumber(null), null);
  assert.equal(formatMeasuredNumber(undefined), null);
  assert.equal(displayOrUnavailable(formatMeasuredNumber(null)), 'Not available');
  assert.notEqual(displayOrUnavailable(formatMeasuredNumber(null)), '0');
  assert.notEqual(displayOrUnavailable(formatMeasuredNumber(null)), '0.00');
});

test('a genuine measured zero is still shown when the logger recorded it', () => {
  const formatted = formatMeasuredNumber(0);
  assert.ok(formatted);
  assert.match(formatted, /^0/);
});

test('unknown estimated electricity values never render as R0 or 0 kWh', () => {
  assert.equal(formatEstimatedRand(null), null);
  assert.equal(formatEstimatedKwh(undefined), null);
  assert.equal(displayOrUnavailable(formatEstimatedRand(null)), 'Not available');
  assert.notEqual(displayOrUnavailable(formatEstimatedRand(null)), 'R 0');
});

test('does not invent electrical power, energy or cost copy from flow-only data', () => {
  const copy = [
    'Mean measured airflow',
    'P90 measured airflow',
    'Highest recorded airflow',
    'Delivered air',
    'Flowing time',
    'Recorded pressure',
  ].join(' ');
  assert.equal(containsInventedElectricalCopy(copy), false);
  assert.equal(containsInventedElectricalCopy('average electrical kW'), true);
  assert.equal(containsInventedElectricalCopy('annual kWh'), true);
  assert.equal(containsInventedElectricalCopy('electricity cost'), true);
});
