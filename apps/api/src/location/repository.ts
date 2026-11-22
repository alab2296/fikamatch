import type { Client } from "pg";
import { approximate, type Point } from "./approx.js";

/** Stores the grid-snapped point. Returns false when the user has no profile yet. */
export async function setLocation(
  db: Client,
  userId: string,
  exact: Point,
): Promise<boolean> {
  const p = approximate(exact); // throws on bad input; the exact point is never stored
  const res = await db.query(
    `UPDATE profiles
        SET location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
            updated_at = now()
      WHERE user_id = $1`,
    [userId, p.lon, p.lat],
  );
  return res.rowCount === 1;
}

export async function clearLocation(db: Client, userId: string): Promise<boolean> {
  const res = await db.query(
    "UPDATE profiles SET location = NULL, updated_at = now() WHERE user_id = $1",
    [userId],
  );
  return res.rowCount === 1;
}

/** Whole-kilometre distance between two users, or null if either has no location. */
export async function distanceBetweenUsers(
  db: Client,
  a: string,
  b: string,
): Promise<number | null> {
  const { rows } = await db.query<{ km: number | null }>(
    `SELECT round(ST_Distance(pa.location, pb.location) / 1000)::int AS km
       FROM profiles pa, profiles pb
      WHERE pa.user_id = $1 AND pb.user_id = $2`,
    [a, b],
  );
  return rows[0]?.km ?? null;
}

/** Ids of users within `km` of the given user, nearest first. Excludes the user. */
export async function userIdsWithin(
  db: Client,
  userId: string,
  km: number,
): Promise<string[]> {
  const { rows } = await db.query<{ user_id: string }>(
    `SELECT o.user_id
       FROM profiles me
       JOIN profiles o ON o.user_id <> me.user_id
        AND ST_DWithin(me.location, o.location, $2 * 1000)
      WHERE me.user_id = $1
      ORDER BY ST_Distance(me.location, o.location), o.user_id`,
    [userId, km],
  );
  return rows.map((r) => r.user_id);
}
