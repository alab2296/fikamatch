import type { Client } from "pg";

export type Gender = "woman" | "man" | "nonbinary" | "other";

export interface Profile {
  userId: string;
  displayName: string;
  bio: string;
  gender: Gender;
  lookingFor: Gender[];
  cityId: number;
  aiEnabled: boolean;
}

export type ProfileInput = Omit<Profile, "userId" | "aiEnabled"> & {
  aiEnabled?: boolean;
};

interface Row {
  user_id: string;
  display_name: string;
  bio: string;
  gender: Gender;
  looking_for: Gender[];
  city_id: number;
  ai_enabled: boolean;
}

const toProfile = (r: Row): Profile => ({
  userId: r.user_id,
  displayName: r.display_name,
  bio: r.bio,
  gender: r.gender,
  lookingFor: r.looking_for,
  cityId: r.city_id,
  aiEnabled: r.ai_enabled,
});

export async function getProfile(db: Client, userId: string): Promise<Profile | null> {
  const { rows } = await db.query<Row>("SELECT * FROM profiles WHERE user_id = $1", [
    userId,
  ]);
  return rows[0] ? toProfile(rows[0]) : null;
}

/** Creates the profile or replaces its editable fields; ai_enabled is only touched when given. */
export async function saveProfile(
  db: Client,
  userId: string,
  input: ProfileInput,
): Promise<Profile> {
  const { rows } = await db.query<Row>(
    `INSERT INTO profiles (user_id, display_name, bio, gender, looking_for, city_id, ai_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false))
     ON CONFLICT (user_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       bio = EXCLUDED.bio,
       gender = EXCLUDED.gender,
       looking_for = EXCLUDED.looking_for,
       city_id = EXCLUDED.city_id,
       ai_enabled = COALESCE($7, profiles.ai_enabled),
       updated_at = now()
     RETURNING *`,
    [
      userId,
      input.displayName,
      input.bio,
      input.gender,
      input.lookingFor,
      input.cityId,
      input.aiEnabled ?? null,
    ],
  );
  return toProfile(rows[0]!);
}

export async function deleteProfile(db: Client, userId: string): Promise<boolean> {
  const res = await db.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
  return (res.rowCount ?? 0) > 0;
}
