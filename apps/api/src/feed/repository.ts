import type { Client } from "pg";

export interface Candidate {
  userId: string;
  displayName: string;
  bio: string;
  age: number;
  cityId: number;
  /** Whole kilometres, or null when the feed fell back to same-city matching. */
  distanceKm: number | null;
}

const DEFAULT_PREFS = { minAge: 18, maxAge: 99, maxDistanceKm: 25 };

/**
 * People the viewer could be shown next. A candidate must:
 * - not be the viewer, be banned, be blocked either way, or already be swiped by the viewer
 * - fit each other's gender wishes (an empty "looking for" means open to anyone)
 * - fit each other's age range
 * - be within the viewer's distance when the viewer has a location; otherwise live in the
 *   same city as the viewer
 * Nearest first, ties broken by id so paging is stable. No coordinates are ever returned.
 */
export async function candidateFeed(
  db: Pick<Client, "query">,
  viewerId: string,
  limit = 20,
): Promise<Candidate[]> {
  const capped = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const { rows } = await db.query(
    `WITH me AS (
       SELECT p.user_id, p.gender, p.looking_for, p.city_id, p.location,
              date_part('year', age(u.birth_date))::int AS age,
              COALESCE(pr.min_age, $2::int) AS min_age,
              COALESCE(pr.max_age, $3::int) AS max_age,
              COALESCE(pr.max_distance_km, $4::int) AS max_km
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN preferences pr ON pr.user_id = p.user_id
        WHERE p.user_id = $1
     ),
     cand AS (
       SELECT p.user_id, p.display_name, p.bio, p.city_id, p.gender, p.looking_for,
              p.location,
              date_part('year', age(u.birth_date))::int AS age,
              COALESCE(pr.min_age, $2::int) AS min_age,
              COALESCE(pr.max_age, $3::int) AS max_age
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN preferences pr ON pr.user_id = p.user_id
        WHERE u.banned_at IS NULL
     )
     SELECT c.user_id, c.display_name, c.bio, c.age, c.city_id,
            CASE WHEN me.location IS NOT NULL AND c.location IS NOT NULL
                 THEN round(ST_Distance(me.location, c.location) / 1000)::int END AS distance_km
       FROM me
       JOIN cand c ON c.user_id <> me.user_id
      WHERE c.age BETWEEN me.min_age AND me.max_age
        AND me.age BETWEEN c.min_age AND c.max_age
        AND (cardinality(me.looking_for) = 0 OR c.gender = ANY (me.looking_for))
        AND (cardinality(c.looking_for) = 0 OR me.gender = ANY (c.looking_for))
        AND CASE WHEN me.location IS NOT NULL
                 THEN c.location IS NOT NULL
                      AND ST_DWithin(me.location, c.location, me.max_km * 1000)
                 ELSE c.city_id = me.city_id END
        AND NOT EXISTS (
              SELECT 1 FROM blocks b
               WHERE (b.blocker_id = me.user_id AND b.blocked_id = c.user_id)
                  OR (b.blocker_id = c.user_id AND b.blocked_id = me.user_id))
        AND NOT EXISTS (
              SELECT 1 FROM swipes s
               WHERE s.swiper_id = me.user_id AND s.target_id = c.user_id)
      ORDER BY distance_km NULLS LAST, c.user_id
      LIMIT $5`,
    [
      viewerId,
      DEFAULT_PREFS.minAge,
      DEFAULT_PREFS.maxAge,
      DEFAULT_PREFS.maxDistanceKm,
      capped,
    ],
  );
  return rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    bio: r.bio,
    age: r.age,
    cityId: r.city_id,
    distanceKm: r.distance_km,
  }));
}
