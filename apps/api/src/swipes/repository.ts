import type pg from "pg";

type Db = Pick<pg.Client, "query">;

export type SwipeDirection = "like" | "pass";

/**
 * Records a swipe. Swiping the same person twice is harmless: the first
 * answer stays, so a repeated request never flips a decision.
 * Returns true when a new row was written.
 */
export async function recordSwipe(
  db: Db,
  swiperId: string,
  targetId: string,
  direction: SwipeDirection,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `INSERT INTO swipes (swiper_id, target_id, direction)
     VALUES ($1, $2, $3)
     ON CONFLICT (swiper_id, target_id) DO NOTHING`,
    [swiperId, targetId, direction],
  );
  return rowCount === 1;
}

export async function getSwipe(
  db: Db,
  swiperId: string,
  targetId: string,
): Promise<SwipeDirection | null> {
  const { rows } = await db.query(
    "SELECT direction FROM swipes WHERE swiper_id = $1 AND target_id = $2",
    [swiperId, targetId],
  );
  return rows[0] ? (rows[0].direction as SwipeDirection) : null;
}

/** True when the other person has already liked this user. */
export async function hasLikedBy(
  db: Db,
  userId: string,
  otherId: string,
): Promise<boolean> {
  const { rows } = await db.query(
    "SELECT 1 FROM swipes WHERE swiper_id = $1 AND target_id = $2 AND direction = 'like'",
    [otherId, userId],
  );
  return rows.length > 0;
}
