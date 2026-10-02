import { describe, expect, it } from 'vitest';
import {
  OPERATING_ASSUMPTIONS_AUDIT_KEYS,
  OPERATING_ASSUMPTIONS_ELECTRICITY_KEYS,
  SITE_INTAKE_KEYS,
  SITE_MAP_KEYS,
  SITE_NAME_KEYS,
  ownershipCovers,
  projectOwned,
} from './proposalFieldOwnership';
import { classifyNumericEntry, parseDays, parseNonNegativeNumber, productionDayRejection } from './electricityBasis';
import { mergeSavePayload, samePayload } from './saveResponseMerge';
import type { OperatingAssumptions, SalesProposalSite } from './types';
import { EMPTY_SITE } from './types';

const assumptions: OperatingAssumptions = {
  annualOperatingHours: 4000,
  averageLoadPercent: 70,
  hasAirAudit: true,
  hoursAreEstimated: false,
};

describe('field ownership', () => {
  it('does not let a stale complete operating-assumptions object overwrite hasAirAudit', () => {
    const current = { ...assumptions, hasAirAudit: false, annualOperatingHours: 4000 };
    const staleComplete = { ...assumptions, hasAirAudit: true, annualOperatingHours: 5200 };
    const next = projectOwned(current, staleComplete, OPERATING_ASSUMPTIONS_ELECTRICITY_KEYS);
    expect(next.hasAirAudit).toBe(false);
    expect(next.annualOperatingHours).toBe(5200);
  });

  it('keeps an intake temperature when a late location object arrives', () => {
    const current: SalesProposalSite = {
      ...EMPTY_SITE,
      name: 'Bushbuckridge',
      intakeAirTemperatureC: 25,
      intakeAirTemperatureKind: 'measured',
    };
    const lateGeocode: SalesProposalSite = {
      ...EMPTY_SITE,
      name: 'Somewhere else',
      latitude: -24.8,
      longitude: 31.1,
      altitudeMetres: 500,
    };
    const next = projectOwned(current, lateGeocode, SITE_MAP_KEYS);
    expect(next.name).toBe('Bushbuckridge');
    expect(next.intakeAirTemperatureC).toBe(25);
    expect(next.latitude).toBe(-24.8);
  });

  it('assigns every operating-assumptions and site key exactly once', () => {
    const assumptionKeys: (keyof OperatingAssumptions)[] = [
      'annualOperatingHours',
      'averageLoadPercent',
      'hasAirAudit',
      'hoursAreEstimated',
    ];
    const assumptionOwnership = ownershipCovers(
      [OPERATING_ASSUMPTIONS_ELECTRICITY_KEYS, OPERATING_ASSUMPTIONS_AUDIT_KEYS],
      assumptionKeys,
    );
    expect(assumptionOwnership.missing).toEqual([]);
    expect(assumptionOwnership.duplicated).toEqual([]);

    const siteKeys = Object.keys(EMPTY_SITE).concat([
      'intakeAirTemperatureC',
      'intakeAirTemperatureKind',
    ]) as (keyof SalesProposalSite)[];
    const siteOwnership = ownershipCovers(
      [SITE_NAME_KEYS, SITE_MAP_KEYS, SITE_INTAKE_KEYS],
      siteKeys,
    );
    expect(siteOwnership.missing).toEqual([]);
    expect(siteOwnership.duplicated).toEqual([]);
  });
});

describe('rejected numeric entry', () => {
  it('treats 2.50 and 2.5 as the same valid value', () => {
    const first = classifyNumericEntry('2.50', parseNonNegativeNumber, () => 'no');
    const second = classifyNumericEntry('2.5', parseNonNegativeNumber, () => 'no');
    expect(first).toEqual({ kind: 'valid', value: 2.5 });
    expect(second).toEqual({ kind: 'valid', value: 2.5 });
  });

  it('rejects 400 production days and keeps the reason, without accepting it', () => {
    expect(parseDays('400')).toBeNull();
    expect(classifyNumericEntry('400', parseDays, productionDayRejection)).toEqual({
      kind: 'rejected',
      reason: 'Production days cannot be more than 366. Change it, or clear the field.',
    });
  });

  it('treats an empty field as unset rather than rejected', () => {
    expect(classifyNumericEntry('  ', parseDays, productionDayRejection)).toEqual({ kind: 'empty' });
  });
});

describe('save response merge', () => {
  it('does not mark edits made during the save as saved', () => {
    const submitted = { hours: 4000, site: 'A' };
    const current = { hours: 5200, site: 'A' };
    const accepted = { hours: 4000, site: 'A' };
    const merged = mergeSavePayload(submitted, current, accepted);
    expect(merged.editedDuringSave).toBe(true);
    expect(merged.next.hours).toBe(5200);
    expect(samePayload(merged.next, accepted)).toBe(false);
  });

  it('keeps server normalisation when the rep did not edit that field', () => {
    const submitted = { name: '  Bushbuckridge  ' };
    const current = { name: '  Bushbuckridge  ' };
    const accepted = { name: 'Bushbuckridge' };
    const merged = mergeSavePayload(submitted, current, accepted);
    expect(merged.editedDuringSave).toBe(false);
    expect(merged.next.name).toBe('Bushbuckridge');
  });
});
