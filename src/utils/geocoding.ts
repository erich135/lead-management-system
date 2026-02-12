/**
 * Frontend Geocoding Utility
 * Uses OpenStreetMap Nominatim for address-to-coordinates conversion.
 * Rate limit: 1 request/second.
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'ARS-Lead-Management/1.0' },
  });
}

/**
 * Geocode an address to coordinates.
 */
export async function geocodeAddress(
  address: string,
  countryCodes: string = 'za'
): Promise<GeocodingResult | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=${countryCodes}&limit=1`;

    const response = await rateLimitedFetch(url);
    if (!response.ok) return null;

    const results = await response.json();
    if (results.length === 0) return null;

    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    
    const response = await rateLimitedFetch(url);
    if (!response.ok) return null;

    const result = await response.json();
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
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
