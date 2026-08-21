/**
 * Site-location answers produced from one map click, search selection, or
 * typed GPS pair. Coordinates are authoritative. Address and altitude are
 * applied only when the enrichment actually returned them.
 */

import type { IntakeAnswer } from '../auditIntakeTypes';

export const TERRAIN_ALTITUDE_NOTE = 'Estimated from Open-Meteo terrain model';
export const MANUAL_ALTITUDE_NOTE = 'Manually supplied';

export const SITE_LOCATION_CAPTURE_CODES = [
  'AUDIT.IDENTITY.GPS_REFERENCE',
  'AUDIT.IDENTITY.MUNICIPALITY',
  'AUDIT.SITE.ALTITUDE',
  'AUDIT.SITE.ALTITUDE_SOURCE',
] as const;

export interface SiteCoordinates {
  latitude: number;
  longitude: number;
}

export interface SiteAddressParts {
  formatted: string | null;
  road: string | null;
  houseNumber: string | null;
  suburb: string | null;
  locality: string | null;
  municipality: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
  country: string | null;
  countryCode: string | null;
}

export interface SiteElevation {
  metres: number;
  source: 'published_map_reference';
  provider: 'open_meteo';
  latitude: number;
  longitude: number;
  lookedUpAt: string;
}

export interface SiteLocationEnrichment {
  coordinates: SiteCoordinates;
  address: SiteAddressParts | null;
  geocodeFailed: boolean;
  elevation: SiteElevation | null;
  elevationFailed: boolean;
}

export type GpsCaptureSource = 'map_lookup' | 'user_supplied';

function answered<T>(value: T, note: string | null = null): IntakeAnswer<T> {
  return { state: 'answered', value, note };
}

export function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

export function formatGpsReference(
  latitude: number,
  longitude: number,
): string {
  return `${roundCoordinate(latitude).toFixed(6)}, ${roundCoordinate(longitude).toFixed(6)}`;
}

export function parseGpsReference(
  value: string | null | undefined,
): SiteCoordinates | null {
  if (typeof value !== 'string') return null;
  const match = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(
    value,
  );
  if (match === null) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    return null;
  return { latitude, longitude };
}

export function sameCoordinates(
  left: SiteCoordinates | null,
  right: SiteCoordinates | null,
): boolean {
  if (left === null || right === null) return false;
  return (
    roundCoordinate(left.latitude) === roundCoordinate(right.latitude) &&
    roundCoordinate(left.longitude) === roundCoordinate(right.longitude)
  );
}

export function isAutoTerrainAltitude(
  answer: IntakeAnswer<number> | null | undefined,
): boolean {
  return (
    answer?.state === 'answered' && answer.note === TERRAIN_ALTITUDE_NOTE
  );
}

/**
 * A new pin replaces the previous terrain estimate. A typed altitude survives
 * a repeat lookup of the same coordinates, including forward/back navigation
 * that must not re-hydrate over the rep's figure.
 */
export function shouldReplaceAltitude(
  current: IntakeAnswer<number> | null | undefined,
  previousGps: SiteCoordinates | null,
  nextGps: SiteCoordinates,
): boolean {
  if (current === undefined || current === null || current.state !== 'answered')
    return true;
  if (!sameCoordinates(previousGps, nextGps)) return true;
  return isAutoTerrainAltitude(current);
}

export function composeAddress(parts: SiteAddressParts): string | null {
  if (parts.formatted !== null && parts.formatted.trim() !== '')
    return parts.formatted.trim();
  const street =
    parts.houseNumber !== null && parts.road !== null
      ? `${parts.houseNumber} ${parts.road}`
      : parts.road;
  const pieces = [
    street,
    parts.suburb,
    parts.locality,
    parts.municipality,
    parts.province,
    parts.postcode,
    parts.country,
  ].filter((value): value is string => value !== null && value.trim() !== '');
  return pieces.length === 0 ? null : pieces.join(', ');
}

export function altitudeCaption(
  altitude: IntakeAnswer<number> | null | undefined,
  elevationFailed: boolean,
): string {
  if (altitude?.state === 'answered' && typeof altitude.value === 'number') {
    const metres = Number.isInteger(altitude.value)
      ? String(altitude.value)
      : String(altitude.value);
    if (altitude.note === MANUAL_ALTITUDE_NOTE)
      return `${metres} m — manually supplied`;
    if (altitude.note === TERRAIN_ALTITUDE_NOTE)
      return `${metres} m — estimated from terrain model`;
    return `${metres} m`;
  }
  if (elevationFailed)
    return 'Not estimated — enter a known site altitude if you have one';
  return 'Not yet estimated';
}

export function intakeEntriesForLocation(input: {
  enrichment: SiteLocationEnrichment;
  gpsSource: GpsCaptureSource;
  previousGps: SiteCoordinates | null;
  currentAltitude: IntakeAnswer<number> | null;
  currentAddress: IntakeAnswer<string> | null;
}): readonly [string, IntakeAnswer<unknown>][] {
  const { enrichment } = input;
  const entries: [string, IntakeAnswer<unknown>][] = [
    [
      'identity.gpsReference',
      answered(
        formatGpsReference(
          enrichment.coordinates.latitude,
          enrichment.coordinates.longitude,
        ),
      ),
    ],
    ['identity.gpsSource', answered(input.gpsSource)],
  ];

  const composed =
    enrichment.address === null ? null : composeAddress(enrichment.address);
  if (composed !== null)
    entries.push(['identity.physicalAddress', answered(composed)]);
  else if (
    enrichment.geocodeFailed &&
    (input.currentAddress === null || input.currentAddress.state !== 'answered')
  ) {
    /* Keep an existing address; do not invent one from the coordinates. */
  }

  const municipality = enrichment.address?.municipality ?? null;
  if (municipality !== null)
    entries.push(['identity.municipality', answered(municipality)]);

  if (
    enrichment.elevation !== null &&
    shouldReplaceAltitude(
      input.currentAltitude,
      input.previousGps,
      enrichment.coordinates,
    )
  ) {
    entries.push([
      'siteConditions.altitudeM',
      answered(enrichment.elevation.metres, TERRAIN_ALTITUDE_NOTE),
    ]);
    entries.push([
      'siteConditions.altitudeSource',
      answered(enrichment.elevation.source, TERRAIN_ALTITUDE_NOTE),
    ]);
  }

  return entries;
}
