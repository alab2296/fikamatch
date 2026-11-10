import type pg from "pg";

type Db = Pick<pg.Client, "query">;

/** Blocks someone. Blocking twice is fine and changes nothing. */
export async function blockUser(
  db: Db,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await db.query(
    `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [blockerId, blockedId],
  );
}

export async function unblockUser(
  db: Db,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await db.query("DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2", [
    blockerId,
    blockedId,
  ]);
}

/** True when either person has blocked the other. */
export async function isBlockedEitherWay(db: Db, a: string, b: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [a, b],
  );
  return rows.length > 0;
}

export async function listBlocked(db: Db, blockerId: string): Promise<string[]> {
  const { rows } = await db.query(
    "SELECT blocked_id FROM blocks WHERE blocker_id = $1 ORDER BY created_at",
    [blockerId],
  );
  return rows.map((r) => r.blocked_id as string);
}
