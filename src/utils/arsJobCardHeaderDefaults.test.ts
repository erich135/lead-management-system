import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { jobCardLetterhead } from './arsJobCardHeaderDefaults.ts';

test('job card letterhead uses the Johannesburg head office and no legacy postal address', () => {
  const header = jobCardLetterhead();
  const text = [header.companyName, header.address, header.city].join('\n');
  assert.match(text, /AIR ROTARY SERVICES \(PTY\) LTD/);
  assert.match(text, /Johannesburg \(Head Office\)/);
  assert.match(text, /Centric Park, Block C, 21 Romeo Street, Boksburg, Gauteng, 1459, South Africa/);
  assert.equal(header.registrationNumber, undefined);
  assert.equal(header.vatNumber, undefined);
  assert.doesNotMatch(text, /Quality Street|PO Box|Sunshine Coast/);
});

test('the repair status report no longer tells anyone to file a coloured paper copy', () => {
  const source = readFileSync(
    new URL('../components/fixedJobCardReports/RepairStatusReportDocument.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /White copy|Blue copy|Yellow copy|Job File Office/);
});
