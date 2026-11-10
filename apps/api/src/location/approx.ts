export interface Point {
  lat: number;
  lon: number;
}

/** Grid size in degrees. 0.01 is roughly 1.1 km north-south, so no exact spot is ever kept. */
export const GRID_DEGREES = 0.01;

const EARTH_RADIUS_KM = 6371;

export function isValidPoint(p: Point): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lon >= -180 &&
    p.lon <= 180
  );
}

/** Snap a point to the centre of its grid cell. Throws on out-of-range input. */
export function approximate(p: Point): Point {
  if (!isValidPoint(p)) throw new RangeError("invalid coordinates");
  const snap = (v: number) =>
    Number(((Math.floor(v / GRID_DEGREES) + 0.5) * GRID_DEGREES).toFixed(4));
  return { lat: snap(p.lat), lon: snap(p.lon) };
}

/** Great-circle distance in kilometres, rounded to whole km so it cannot be used to triangulate. */
export function distanceKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)));
}
