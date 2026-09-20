/**
 * Converts the out-of-location distance from metres to kilometres.
 * GPS accuracy stays in metres.
 */
export function formatOutOfLocationDistance(metres: number): string {
  return `${(metres / 1000).toFixed(2)} km from scheduled pin`;
}
