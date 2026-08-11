/**
 * Builds a GeoJSON Point payload only when coordinates are complete and valid.
 * Accepts raw [lng, lat] tuples or partial geo objects from form state.
 */
export function buildGeoLocationPayload(
  input:
    | [number, number]
    | { type?: string; coordinates?: unknown }
    | null
    | undefined,
): { type: 'Point'; coordinates: [number, number] } | undefined {
  if (!input) {
    return undefined;
  }

  const coordinates = Array.isArray(input)
    ? input
    : Array.isArray(input.coordinates)
      ? input.coordinates
      : null;

  if (!coordinates || coordinates.length !== 2) {
    return undefined;
  }

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return undefined;
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [lng, lat],
  };
}

/**
 * Removes invalid geoLocation values so the backend never receives partial objects.
 */
export function sanitizeGeoLocationForRequest<T extends { geoLocation?: unknown }>(
  payload: T,
): T {
  const geoLocation = buildGeoLocationPayload(
    payload.geoLocation as
      | [number, number]
      | { type?: string; coordinates?: unknown }
      | null
      | undefined,
  );

  if (geoLocation) {
    return { ...payload, geoLocation };
  }

  const { geoLocation: _removed, ...rest } = payload;
  return rest as T;
}
