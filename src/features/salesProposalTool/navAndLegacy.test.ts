import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { containsInventedElectricalCopy } from './formatMeasured.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(FEATURE_ROOT, '../..');

test('normal ARS navigation shows Sales Proposal Tool and hides Bouwa', () => {
  const dashboard = fs.readFileSync(
    path.join(APP_ROOT, 'components/Dashboard.tsx'),
    'utf8',
  );
  const mobile = fs.readFileSync(
    path.join(APP_ROOT, 'components/MobileNavigation.tsx'),
    'utf8',
  );
  const app = fs.readFileSync(path.join(APP_ROOT, 'App.tsx'), 'utf8');

  assert.match(dashboard, /SALES_PROPOSAL_TOOL_LABEL/);
  assert.match(dashboard, /SALES_PROPOSAL_TOOL_PATH/);
  assert.doesNotMatch(dashboard, /to="\/bouwa"/);
  assert.doesNotMatch(dashboard, /showBouwaNavigation/);

  assert.match(mobile, /SALES_PROPOSAL_TOOL_LABEL/);
  assert.match(mobile, /SALES_PROPOSAL_TOOL_PATH/);
  assert.doesNotMatch(mobile, /to="\/bouwa"/);
  assert.doesNotMatch(mobile, /showBouwaNavigation/);

  assert.match(app, /path="\/bouwa\/\*"/);
  assert.match(app, /path="\/sales-proposal-tool"/);
});

test('measured result card does not invent electrical values', () => {
  const card = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/MeasuredAuditCard.tsx'),
    'utf8',
  );
  assert.equal(containsInventedElectricalCopy(card), false);
  assert.doesNotMatch(card, /bar\(g\)/);
  assert.match(card, /Recorded pressure/);
  assert.match(card, /Mean measured airflow/);
});
