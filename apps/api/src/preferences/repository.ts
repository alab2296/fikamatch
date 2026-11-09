import type { Client } from "pg";

export interface Preferences {
  userId: string;
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
}

export type PreferencesInput = Omit<Preferences, "userId">;

interface Row {
  user_id: string;
  min_age: number;
  max_age: number;
  max_distance_km: number;
}

const toPrefs = (r: Row): Preferences => ({
  userId: r.user_id,
  minAge: r.min_age,
  maxAge: r.max_age,
  maxDistanceKm: r.max_distance_km,
});

export async function getPreferences(
  db: Client,
  userId: string,
): Promise<Preferences | null> {
  const { rows } = await db.query<Row>("SELECT * FROM preferences WHERE user_id = $1", [
    userId,
  ]);
  return rows[0] ? toPrefs(rows[0]) : null;
}

export async function savePreferences(
  db: Client,
  userId: string,
  input: PreferencesInput,
): Promise<Preferences> {
  const { rows } = await db.query<Row>(
    `INSERT INTO preferences (user_id, min_age, max_age, max_distance_km)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       min_age = EXCLUDED.min_age,
       max_age = EXCLUDED.max_age,
       max_distance_km = EXCLUDED.max_distance_km,
       updated_at = now()
     RETURNING *`,
    [userId, input.minAge, input.maxAge, input.maxDistanceKm],
  );
  return toPrefs(rows[0]!);
}
