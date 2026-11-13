import type { Client } from "pg";

export const consentKinds = ["terms", "privacy", "ai_processing"] as const;
export type ConsentKind = (typeof consentKinds)[number];

export async function recordConsent(
  db: Client,
  userId: string,
  kind: ConsentKind,
  granted: boolean,
): Promise<void> {
  await db.query("INSERT INTO consents (user_id, kind, granted) VALUES ($1, $2, $3)", [
    userId,
    kind,
    granted,
  ]);
}

/** True only when the most recent record for this kind is a grant. */
export async function hasConsent(
  db: Client,
  userId: string,
  kind: ConsentKind,
): Promise<boolean> {
  const { rows } = await db.query<{ granted: boolean }>(
    "SELECT granted FROM consents WHERE user_id = $1 AND kind = $2 ORDER BY id DESC LIMIT 1",
    [userId, kind],
  );
  return rows[0]?.granted ?? false;
}

export async function currentConsents(
  db: Client,
  userId: string,
): Promise<Record<ConsentKind, boolean>> {
  const { rows } = await db.query<{ kind: ConsentKind; granted: boolean }>(
    `SELECT DISTINCT ON (kind) kind, granted FROM consents
     WHERE user_id = $1 ORDER BY kind, id DESC`,
    [userId],
  );
  const result = { terms: false, privacy: false, ai_processing: false };
  for (const r of rows) result[r.kind] = r.granted;
  return result;
}
