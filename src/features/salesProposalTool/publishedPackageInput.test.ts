import { describe, expect, it } from 'vitest';
import {
  AIR_AUDIT_ELECTRICAL_NOTE,
  displayedMotorRatingKw,
  effectivePackageInput,
  MOTOR_RATING_LABEL,
  PUBLISHED_PACKAGE_INPUT_LABEL,
  publishedPowerRatingRows,
} from './specDisplay';
import type { PublicMachineSpec, SourceBackedSpec } from './types';

const currentSource: SourceBackedSpec = {
  manufacturer: 'Atlas Copco',
  model: 'ZT 160 VSD+-10.4',
  modelVariant: null,
  ratedPressureBarG: 10.34,
  ratedAirflowM3PerMin: 23.52,
  packageInputPowerKw: 176.3,
  motorShaftPowerKw: 160.03,
  controlType: 'VSD',
  sourceFileName: 'ZT160_CAGI.pdf',
  sourceFileId: null,
  sourceSha256: null,
};

const proposedLibrary: PublicMachineSpec = {
  recordId: 'lib-svc-rs250a',
  manufacturer: 'Bouwa',
  model: 'SVC-RS250A-II',
  modelVariant: '525V',
  ratedPressureBarG: 8,
  ratedAirflowM3PerMin: 55.3,
  packageInputPowerKw: 250,
  motorShaftPowerKw: 250,
  controlType: null,
  sourceTitle: 'BOUWA datasheet',
  sourceFileName: null,
};

function row(rows: ReturnType<typeof publishedPowerRatingRows>, label: string) {
  return rows.find((item) => item.label === label);
}

describe('published package input presentation', () => {
  it('keeps current-machine published package input separate from motor rating', () => {
    const packageInput = effectivePackageInput(null, currentSource);
    const motor = displayedMotorRatingKw(null, currentSource);
    const rows = publishedPowerRatingRows(null, currentSource);

    expect(packageInput.value).toBe(176.3);
    expect(packageInput.origin).toBe('source');
    expect(motor).toBe(160.03);
    expect(motor).not.toBe(packageInput.value);

    expect(row(rows, PUBLISHED_PACKAGE_INPUT_LABEL)).toEqual({
      label: 'Published package input',
      value: '176,3 kW',
    });
    expect(row(rows, MOTOR_RATING_LABEL)).toEqual({
      label: 'Motor rating',
      value: '160,03 kW',
    });
    expect(rows.map((item) => item.label)).toEqual([
      'Published package input',
      'Motor rating',
    ]);
    expect(row(rows, 'Published package input')?.value).not.toBe('160,03 kW');
    expect(row(rows, 'Motor rating')?.value).not.toBe('176,3 kW');
  });

  it('labels package input as published and never as measured electrical input', () => {
    const currentRows = publishedPowerRatingRows(null, currentSource);
    const proposedRows = publishedPowerRatingRows(proposedLibrary, null);
    const labels = [...currentRows, ...proposedRows].map((item) => item.label).join('\n');
    const values = [...currentRows, ...proposedRows].map((item) => item.value).join('\n');

    expect(labels).toMatch(/Published package input/);
    expect(labels).not.toMatch(/measured electrical input/i);
    expect(labels).not.toMatch(/Measured package input/i);
    expect(values).not.toMatch(/measured electrical input/i);
    expect(AIR_AUDIT_ELECTRICAL_NOTE).toMatch(/published machine specification/);
    expect(AIR_AUDIT_ELECTRICAL_NOTE).not.toMatch(/Did you measure electrical power/);
    expect(AIR_AUDIT_ELECTRICAL_NOTE).not.toMatch(/measured electrical input/i);
  });

  it('displays proposed-machine package input as published / source-backed, not as motor rating', () => {
    const libraryRows = publishedPowerRatingRows(proposedLibrary, null);
    expect(effectivePackageInput(proposedLibrary, null).origin).toBe('library');
    expect(row(libraryRows, PUBLISHED_PACKAGE_INPUT_LABEL)).toEqual({
      label: 'Published package input',
      value: '250,0 kW',
    });
    expect(row(libraryRows, MOTOR_RATING_LABEL)).toEqual({
      label: 'Motor rating',
      value: '250,00 kW',
    });

    const sourceBackedProposed: SourceBackedSpec = {
      ...currentSource,
      manufacturer: 'Bouwa',
      model: 'SVC-RS250A-II',
      packageInputPowerKw: 248.5,
      motorShaftPowerKw: 250,
      sourceFileName: 'BOUWA_SVC_RS250A.pdf',
    };
    const sourceRows = publishedPowerRatingRows(null, sourceBackedProposed);
    expect(effectivePackageInput(null, sourceBackedProposed).origin).toBe('source');
    expect(row(sourceRows, PUBLISHED_PACKAGE_INPUT_LABEL)).toEqual({
      label: 'Published package input',
      value: '248,5 kW',
    });
    expect(row(sourceRows, MOTOR_RATING_LABEL)?.value).toBe('250,00 kW');
    expect(row(sourceRows, 'Published package input')?.value).not.toBe(
      row(sourceRows, 'Motor rating')?.value,
    );
  });
});
