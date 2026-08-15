/**
 * Small geodesic helpers. Kept dependency-free so both the map screen and the
 * trip history card can share one implementation instead of re-deriving the
 * same formula inline.
 */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371000;
const toRad = (value: number) => (value * Math.PI) / 180;

/** Great-circle distance between two points, in METRES. */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
