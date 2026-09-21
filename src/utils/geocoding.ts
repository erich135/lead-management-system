/**
 * Frontend geocoding helpers. Address lookup goes through the backend Google
 * proxy; this file keeps local distance and coordinate conversion utilities.
 */

import { geocodeReverse, geocodeSearch } from '../lib/api';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult | null> {
  try {
    const results = await geocodeSearch(address, 1);
    if (!results.length) return null;
    const latitude = parseFloat(results[0].lat);
    const longitude = parseFloat(results[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      displayName: results[0].display_name,
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodingResult | null> {
  try {
    const result = await geocodeReverse(latitude, longitude);
    if (!result?.display_name) return null;
    const parsedLat = parseFloat(result.lat);
    const parsedLon = parseFloat(result.lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return null;
    return {
      latitude: parsedLat,
      longitude: parsedLon,
      displayName: result.display_name,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate distance between two points (Haversine formula).
 * Returns distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a point is inside a geofence.
 */
export function isWithinGeofence(
  pointLat: number,
  pointLon: number,
  fenceLat: number,
  fenceLon: number,
  radiusMeters: number
): boolean {
  return calculateDistance(pointLat, pointLon, fenceLat, fenceLon) <= radiusMeters;
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Convert GeoJSON [lng, lat] to Leaflet [lat, lng] format.
 */
export function geoJsonToLatLng(coordinates: [number, number]): [number, number] {
  return [coordinates[1], coordinates[0]];
}

/**
 * Convert Leaflet [lat, lng] to GeoJSON [lng, lat] format.
 */
export function latLngToGeoJson(latLng: [number, number]): [number, number] {
  return [latLng[1], latLng[0]];
}
