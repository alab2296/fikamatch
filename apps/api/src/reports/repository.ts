import type pg from "pg";

type Db = Pick<pg.Client, "query">;

export const REPORT_REASONS = [
  "harassment",
  "spam",
  "fake_profile",
  "underage",
  "unsafe",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: ReportReason;
  details: string | null;
  status: "open" | "reviewed" | "dismissed";
  createdAt: Date;
}

function toReport(r: Record<string, unknown>): Report {
  return {
    id: r.id as string,
    reporterId: r.reporter_id as string,
    reportedId: r.reported_id as string,
    reason: r.reason as ReportReason,
    details: (r.details as string | null) ?? null,
    status: r.status as Report["status"],
    createdAt: r.created_at as Date,
  };
}

export async function createReport(
  db: Db,
  input: {
    reporterId: string;
    reportedId: string;
    reason: ReportReason;
    details?: string;
  },
): Promise<Report> {
  const { rows } = await db.query(
    `INSERT INTO reports (reporter_id, reported_id, reason, details)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.reporterId, input.reportedId, input.reason, input.details ?? null],
  );
  return toReport(rows[0]);
}

/** Oldest open reports first, which is the order a moderator works through them. */
export async function listOpenReports(db: Db, limit = 50): Promise<Report[]> {
  const { rows } = await db.query(
    "SELECT * FROM reports WHERE status = 'open' ORDER BY created_at LIMIT $1",
    [limit],
  );
  return rows.map(toReport);
}
