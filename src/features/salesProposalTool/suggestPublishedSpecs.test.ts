import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  applyLibrarySpec,
  applyPhysicalMachine,
  currentMachineNeedsSpec,
} from './equipmentState.ts';
import {
  NO_PUBLISHED_SPEC_MATCH_MESSAGE,
  POSSIBLE_SPEC_MATCHES_HEADING,
  manufacturersAlign,
  physicalMachineLibrarySearchQuery,
  rankPublishedSpecsForPhysicalMachine,
} from './suggestPublishedSpecs.ts';
import { SEARCH_MENU_PANEL } from './searchOverlay.ts';
import type { PublicMachineSpec } from './types.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function spec(
  recordId: string,
  manufacturer: string,
  model: string,
  extras: Partial<PublicMachineSpec> = {},
): PublicMachineSpec {
  return {
    recordId,
    manufacturer,
    model,
    modelVariant: null,
    ratedPressureBarG: 8,
    ratedAirflowM3PerMin: 3.6,
    packageInputPowerKw: 22,
    motorShaftPowerKw: null,
    controlType: null,
    sourceTitle: `${manufacturer} datasheet`,
    sourceFileName: null,
    ...extras,
  };
}

const library: PublicMachineSpec[] = [
  spec('lib-sc-rs22a', 'Bouwa', 'SC-RS22A', {
    ratedAirflowM3PerMin: 3.6,
    packageInputPowerKw: 22,
  }),
  spec('lib-sc-rs37a', 'Bouwa', 'SC-RS37A', {
    ratedAirflowM3PerMin: 6.4,
    packageInputPowerKw: 37,
  }),
  spec('lib-svc-ii', 'Bouwa', 'SVC-RS132A-II', {
    ratedPressureBarG: 8,
    ratedAirflowM3PerMin: 24.5,
    packageInputPowerKw: 132,
  }),
  spec('lib-svc-variant', 'Bouwa', 'SVC-RS132A', {
    modelVariant: 'II',
    ratedPressureBarG: 8,
    ratedAirflowM3PerMin: 24.5,
    packageInputPowerKw: 132,
  }),
  spec('lib-ga18', 'Atlas Copco', 'GA18+ -125', {
    ratedPressureBarG: 8.62,
    ratedAirflowM3PerMin: 3.2,
    packageInputPowerKw: null,
    motorShaftPowerKw: 18,
  }),
  spec('lib-seize-same-model', 'Seize', 'SC-RS22A', {
    sourceTitle: 'Seize datasheet',
  }),
];

function currentEquipmentSource(): string {
  return fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
    'utf8',
  );
}

test('library search query uses the physical make and model without retyping', () => {
  assert.equal(
    physicalMachineLibrarySearchQuery('Bouwa', 'SVC-RS132A-II'),
    'Bouwa SVC RS132A II',
  );
  assert.equal(
    physicalMachineLibrarySearchQuery('Bouwa®', 'SC-RS22A'),
    'Bouwa SC RS22A',
  );
});

test('matching library candidates are ranked and unrelated models are excluded', () => {
  const ranked = rankPublishedSpecsForPhysicalMachine(
    { make: 'BOUWA', model: 'sc-rs22a' },
    library,
  );
  assert.deepEqual(
    ranked.map((item) => item.recordId),
    ['lib-sc-rs22a'],
  );

  const hyphen = rankPublishedSpecsForPhysicalMachine(
    { make: 'Bouwa', model: 'SVC-RS132A-II' },
    library,
  );
  assert.deepEqual(
    hyphen.map((item) => item.recordId),
    ['lib-svc-ii', 'lib-svc-variant'],
  );
  const spaced = rankPublishedSpecsForPhysicalMachine(
    { make: 'Bouwa', model: 'SVC-RS132A II' },
    library,
  );
  assert.ok(spaced.some((item) => item.recordId === 'lib-svc-ii'));
  assert.ok(spaced.some((item) => item.recordId === 'lib-svc-variant'));

  const nearby = rankPublishedSpecsForPhysicalMachine(
    { make: 'Bouwa', model: 'SC-RS22' },
    library,
  );
  assert.deepEqual(nearby, []);
});

test('customer-machine rows are not used as specification candidates', () => {
  const ranked = rankPublishedSpecsForPhysicalMachine(
    { make: 'Bouwa', model: 'SC-RS22A' },
    [
      spec('lib-sc-rs22a', 'Bouwa', 'SC-RS22A'),
      {
        recordId: '',
        manufacturer: 'Bouwa',
        model: 'SC-RS22A',
        modelVariant: null,
        ratedPressureBarG: null,
        ratedAirflowM3PerMin: null,
        packageInputPowerKw: null,
        motorShaftPowerKw: null,
        controlType: null,
        sourceTitle: 'Customer machine SZ260116401P',
        sourceFileName: null,
      },
    ],
  );
  assert.deepEqual(
    ranked.map((item) => item.recordId),
    ['lib-sc-rs22a'],
  );
  const helper = fs.readFileSync(
    path.join(FEATURE_ROOT, 'suggestPublishedSpecs.ts'),
    'utf8',
  );
  assert.equal(helper.includes('searchCustomerMachines'), false);
  assert.equal(helper.includes('getMachinesByCustomer'), false);
});

test('a single reliable candidate is still not auto-selected', () => {
  const ranked = rankPublishedSpecsForPhysicalMachine(
    { make: 'Bouwa', model: 'SC-RS22A' },
    library,
  );
  assert.equal(ranked.length, 1);
  const physical = applyPhysicalMachine(
    {
      key: 'x',
      arsMachineId: null,
      make: '',
      model: '',
      serialNumber: '',
      specLibraryRecordId: null,
      selectedSpec: null,
      changingSpec: true,
      sourceBacked: null,
      capturingSheet: false,
    },
    {
      _id: 'phys-1',
      make: 'Bouwa',
      model: 'SC-RS22A',
      serialNumber: '2112-30884010',
    },
  );
  assert.equal(currentMachineNeedsSpec(physical), true);
  assert.equal(physical.specLibraryRecordId, null);
  assert.equal(physical.selectedSpec, null);
  assert.equal(physical.make, 'Bouwa');
  assert.equal(physical.model, 'SC-RS22A');
  assert.equal(physical.serialNumber, '2112-30884010');
});

test('selecting a candidate applies only the library specification', () => {
  const physical = applyPhysicalMachine(
    {
      key: 'x',
      arsMachineId: null,
      make: '',
      model: '',
      serialNumber: '',
      specLibraryRecordId: null,
      selectedSpec: null,
      changingSpec: true,
      sourceBacked: null,
      capturingSheet: false,
    },
    {
      _id: 'phys-1',
      make: 'Bouwa',
      model: 'SVC-RS132A-II',
      serialNumber: 'SN-132',
    },
  );
  const [candidate] = rankPublishedSpecsForPhysicalMachine(
    { make: physical.make, model: physical.model },
    library,
  );
  assert.equal(candidate.recordId, 'lib-svc-ii');
  const applied = applyLibrarySpec(physical, candidate);
  assert.equal(applied.arsMachineId, 'phys-1');
  assert.equal(applied.make, 'Bouwa');
  assert.equal(applied.model, 'SVC-RS132A-II');
  assert.equal(applied.serialNumber, 'SN-132');
  assert.equal(applied.specLibraryRecordId, 'lib-svc-ii');
  assert.equal(applied.selectedSpec?.ratedAirflowM3PerMin, 24.5);
  assert.equal(applied.selectedSpec?.packageInputPowerKw, 132);
  assert.equal(applied.make !== candidate.model, true);
});

test('zero reliable matches leave the specification-sheet fallback', () => {
  const ranked = rankPublishedSpecsForPhysicalMachine(
    { make: 'Bouwa', model: 'SC-RS22' },
    library,
  );
  assert.deepEqual(ranked, []);
  assert.equal(
    NO_PUBLISHED_SPEC_MATCH_MESSAGE,
    'No matching published specification found',
  );
  const current = currentEquipmentSource();
  assert.match(current, /NO_PUBLISHED_SPEC_MATCH_MESSAGE/);
  assert.match(current, /Add from specification sheet/);
});

test('harmless formatting differences still match; Seize and Bouwa do not', () => {
  assert.equal(manufacturersAlign('Bouwa', 'BOUWA'), true);
  assert.equal(manufacturersAlign('Bouwa®', 'Bouwa'), true);
  assert.equal(manufacturersAlign('Atlas Copco', 'Atlas-Copco'), true);
  assert.equal(manufacturersAlign('Seize', 'Bouwa'), false);
  assert.equal(manufacturersAlign('Bouwa', 'Seize'), false);

  const marked = rankPublishedSpecsForPhysicalMachine(
    { make: 'bouwa®', model: 'svc-rs132a-ii' },
    library,
  );
  assert.ok(marked.some((item) => item.recordId === 'lib-svc-ii'));

  const seizeMachine = rankPublishedSpecsForPhysicalMachine(
    { make: 'Seize', model: 'SC-RS22A' },
    library,
  );
  assert.deepEqual(
    seizeMachine.map((item) => item.recordId),
    ['lib-seize-same-model'],
  );
});

test('unlinked physical-machine selection searches the library and stays inline', () => {
  const current = currentEquipmentSource();
  assert.equal(POSSIBLE_SPEC_MATCHES_HEADING, 'Possible specification matches');
  assert.match(current, /physicalMachineLibrarySearchQuery\(row\.make, row\.model\)/);
  assert.match(current, /searchSpecLibrary\(term, 'all'\)/);
  assert.match(current, /rankPublishedSpecsForPhysicalMachine/);
  assert.match(current, /POSSIBLE_SPEC_MATCHES_HEADING/);
  assert.match(current, /setSuggestionsOpen\(false\)/);
  assert.match(current, /setSuggestionsOpen\(true\)/);

  const selectPhysical = current.slice(
    current.indexOf('async function handleSelectPhysical'),
    current.indexOf('function handleSelectSpec'),
  );
  assert.doesNotMatch(selectPhysical, /applyLibrarySpec/);
  assert.match(selectPhysical, /setMenuOpen\(false\)/);

  const selectSpec = current.slice(
    current.indexOf('function handleSelectSpec'),
    current.indexOf('if (row.capturingSheet)'),
  );
  assert.match(selectSpec, /applyLibrarySpec\(row, spec\)/);
  assert.doesNotMatch(selectSpec, /getMachinesByCustomer/);

  assert.doesNotMatch(current, /suggestedSpecs\.length === 1/);
  assert.doesNotMatch(current, /rankedSpecs\.length === 1/);
  assert.match(
    current,
    /rankPublishedSpecsForPhysicalMachine\(\s*\{\s*make: row\.make,\s*model: row\.model\s*\},\s*specs,/,
  );
  assert.doesNotMatch(
    current,
    /rankPublishedSpecsForPhysicalMachine\(\s*\{\s*make: row\.make,\s*model: row\.model\s*\},\s*dropdown/,
  );
  assert.doesNotMatch(
    current,
    /rankPublishedSpecsForPhysicalMachine\(\s*\{\s*make: row\.make,\s*model: row\.model\s*\},\s*customer/,
  );

  const suggestionsAt = current.indexOf('function PhysicalMachineSpecSuggestions');
  const suggestions = current.slice(suggestionsAt);
  assert.doesNotMatch(suggestions, /SEARCH_MENU_PANEL/);
  assert.equal(suggestions.includes(SEARCH_MENU_PANEL), false);
  assert.doesNotMatch(suggestions, /searchMenuWrapClass/);
  assert.doesNotMatch(suggestions, /absolute left-0 right-0 top-full/);
});
