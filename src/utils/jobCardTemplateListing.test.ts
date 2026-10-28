import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesTemplateSearch, sourceTemplateName, versionLabel } from './jobCardTemplateListing.ts';

const original = { _id: 'a1', name: 'Mechanical Checklist on Compressors', version: 1 };
const noVersion = { _id: 'a2', name: 'Repair Status Report' };
const v2 = {
  _id: 'b1',
  name: 'Mechanical Checklist \u2014 PHOTO TEST V2',
  description: 'TEST ONLY - photo question test version',
  version: 2,
  versionFamilyId: 'a1',
  sourceTemplateId: 'a1',
};

test('only created versions carry a version label', () => {
  assert.equal(versionLabel(v2), 'V2');
  assert.equal(versionLabel({ version: 11 }), 'V11');
  assert.equal(versionLabel(original), null);
  assert.equal(versionLabel(noVersion), null);
});

test('a version names the form it was created from when that form is listed', () => {
  assert.equal(sourceTemplateName(v2, [original, noVersion, v2]), 'Mechanical Checklist on Compressors');
  assert.equal(sourceTemplateName(v2, [noVersion]), null);
  assert.equal(sourceTemplateName(original, [original]), null);
});

test('search finds the V2 form by name, by version and by description, and ignores case', () => {
  assert.equal(matchesTemplateSearch(v2, 'photo test'), true);
  assert.equal(matchesTemplateSearch(v2, 'MECHANICAL v2'), true);
  assert.equal(matchesTemplateSearch(v2, 'version 2'), true);
  assert.equal(matchesTemplateSearch(v2, 'photo question'), true);
  assert.equal(matchesTemplateSearch(v2, 'repair'), false);
  assert.equal(matchesTemplateSearch(original, 'v2'), false);
  assert.equal(matchesTemplateSearch(original, '   '), true);
});