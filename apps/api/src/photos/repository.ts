import type { Client } from "pg";

export const MAX_PHOTOS = 6;

export interface Photo {
  id: string;
  storageKey: string;
  contentType: string;
  position: number;
}

interface Row {
  id: string;
  storage_key: string;
  content_type: string;
  position: number;
}

const toPhoto = (r: Row): Photo => ({
  id: r.id,
  storageKey: r.storage_key,
  contentType: r.content_type,
  position: r.position,
});

export async function listPhotos(db: Client, userId: string): Promise<Photo[]> {
  const { rows } = await db.query<Row>(
    "SELECT * FROM photos WHERE user_id = $1 ORDER BY position",
    [userId],
  );
  return rows.map(toPhoto);
}

/** Adds a photo at the end. Returns null when the user already has the maximum. */
export async function addPhoto(
  db: Client,
  userId: string,
  storageKey: string,
  contentType: string,
): Promise<Photo | null> {
  const { rows } = await db.query<Row>(
    `INSERT INTO photos (user_id, storage_key, content_type, position)
     SELECT $1, $2, $3, COALESCE(MAX(position), 0) + 1
       FROM photos WHERE user_id = $1
     HAVING COUNT(*) < $4
     RETURNING *`,
    [userId, storageKey, contentType, MAX_PHOTOS],
  );
  return rows[0] ? toPhoto(rows[0]) : null;
}

/** Puts the photos in the given order. The ids must be exactly the user's photos. */
export async function reorderPhotos(
  db: Client,
  userId: string,
  orderedIds: string[],
): Promise<boolean> {
  const current = await listPhotos(db, userId);
  const have = new Set(current.map((p) => p.id));
  if (
    orderedIds.length !== current.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    !orderedIds.every((id) => have.has(id))
  )
    return false;
  await db.query(
    `UPDATE photos p SET position = v.pos
       FROM unnest($2::uuid[], $3::int[]) AS v(id, pos)
      WHERE p.id = v.id AND p.user_id = $1`,
    [userId, orderedIds, orderedIds.map((_, i) => i + 1)],
  );
  return true;
}

/** Deletes the row, closes the gap in positions and returns the removed photo. */
export async function removePhoto(
  db: Client,
  userId: string,
  photoId: string,
): Promise<Photo | null> {
  const { rows } = await db.query<Row>(
    "DELETE FROM photos WHERE id = $1 AND user_id = $2 RETURNING *",
    [photoId, userId],
  );
  if (!rows[0]) return null;
  await db.query(
    `UPDATE photos p SET position = r.rn
       FROM (SELECT id, row_number() OVER (ORDER BY position)::int AS rn
               FROM photos WHERE user_id = $1) r
      WHERE p.id = r.id AND p.position <> r.rn`,
    [userId],
  );
  return toPhoto(rows[0]);
}

export async function storageKeysForUser(db: Client, userId: string): Promise<string[]> {
  const { rows } = await db.query<{ storage_key: string }>(
    "SELECT storage_key FROM photos WHERE user_id = $1",
    [userId],
  );
  return rows.map((r) => r.storage_key);
}
