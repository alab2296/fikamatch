import type pg from "pg";

type Db = Pick<pg.Client, "query">;

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
}

function toMessage(r: Record<string, unknown>): Message {
  return {
    id: r.id as string,
    senderId: r.sender_id as string,
    recipientId: r.recipient_id as string,
    body: r.body as string,
    createdAt: r.created_at as Date,
    readAt: (r.read_at as Date | null) ?? null,
  };
}

export async function addMessage(
  db: Db,
  senderId: string,
  recipientId: string,
  body: string,
): Promise<Message> {
  const { rows } = await db.query(
    `INSERT INTO messages (sender_id, recipient_id, body)
     VALUES ($1, $2, $3) RETURNING *`,
    [senderId, recipientId, body],
  );
  return toMessage(rows[0]);
}

/** Newest first. Pass `before` (a timestamp) to fetch the next older page. */
export async function listHistory(
  db: Db,
  a: string,
  b: string,
  opts: { limit?: number; before?: Date } = {},
): Promise<Message[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const { rows } = await db.query(
    `SELECT * FROM messages
     WHERE LEAST(sender_id, recipient_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(sender_id, recipient_id) = GREATEST($1::uuid, $2::uuid)
       AND ($3::timestamptz IS NULL OR created_at < $3)
     ORDER BY created_at DESC, id DESC
     LIMIT $4`,
    [a, b, opts.before ?? null, limit],
  );
  return rows.map(toMessage);
}
