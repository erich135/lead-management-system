export const GOOGLE_LOOKUP_UNAVAILABLE = 'Google address lookup is unavailable';
export const STREET_MAP_ZOOM = 17;

export type PinSearchHit = {
  latitude: number;
  longitude: number;
  address: string;
};

export function isGoogleLookupUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message) : '';
  return message === GOOGLE_LOOKUP_UNAVAILABLE;
}

function parseCoordinate(value: string | number | undefined): number | null {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function isCoordinateLabel(value: string): boolean {
  return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

export function pinFromPlaceDetails(details: {
  displayName?: string;
  lat?: string;
  lon?: string;
} | null): PinSearchHit | null {
  if (!details?.displayName?.trim()) return null;
  const latitude = parseCoordinate(details.lat);
  const longitude = parseCoordinate(details.lon);
  if (latitude === null || longitude === null) return null;
  return {
    latitude,
    longitude,
    address: details.displayName.trim(),
  };
}

export function pinFromSearchResult(result: {
  display_name?: string;
  lat?: string;
  lon?: string;
} | undefined): PinSearchHit | null {
  if (!result?.display_name?.trim()) return null;
  const latitude = parseCoordinate(result.lat);
  const longitude = parseCoordinate(result.lon);
  if (latitude === null || longitude === null) return null;
  return {
    latitude,
    longitude,
    address: result.display_name.trim(),
  };
}

export function pinFromReverse(result: {
  display_name?: string;
  lat?: string;
  lon?: string;
} | null): PinSearchHit | null {
  const address = result?.display_name?.trim() || '';
  if (!address || isCoordinateLabel(address)) return null;
  const latitude = parseCoordinate(result?.lat);
  const longitude = parseCoordinate(result?.lon);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude, address };
}

export function canConfirmMapPin(args: {
  pin: [number, number] | null;
  reversing: boolean;
  googleAddress: string | null;
  typedAddress: string;
}): boolean {
  if (!args.pin || args.reversing) return false;
  if (args.googleAddress && args.googleAddress.trim()) return true;
  return args.typedAddress.trim().length >= 3;
}

export function confirmedPinAddress(googleAddress: string | null, typedAddress: string): string {
  return googleAddress?.trim() || typedAddress.trim();
}
