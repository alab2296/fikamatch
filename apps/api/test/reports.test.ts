import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createReport, listOpenReports } from "../src/reports/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
let a: string;
let b: string;

async function addUser(email: string): Promise<string> {
  const { rows } = await db.client.query(
    `INSERT INTO users (email, password_hash, birth_date)
     VALUES ($1, 'x', '1990-01-01') RETURNING id`,
    [email],
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = await createTestDb();
  a = await addUser("a@example.se");
  b = await addUser("b@example.se");
});
afterAll(async () => {
  await db.drop();
});

describe("reports", () => {
  it("stores a report as open", async () => {
    const r = await createReport(db.client, {
      reporterId: a,
      reportedId: b,
      reason: "spam",
      details: "sends links",
    });
    expect(r.status).toBe("open");
    expect(r.details).toBe("sends links");
    expect(await listOpenReports(db.client)).toHaveLength(1);
  });

  it("refuses to report yourself", async () => {
    await expect(
      createReport(db.client, { reporterId: a, reportedId: a, reason: "other" }),
    ).rejects.toThrow();
  });

  it("refuses an unknown reason", async () => {
    await expect(
      db.client.query(
        "INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, 'nope')",
        [a, b],
      ),
    ).rejects.toThrow();
  });

  it("refuses overlong details", async () => {
    await expect(
      createReport(db.client, {
        reporterId: a,
        reportedId: b,
        reason: "other",
        details: "x".repeat(1001),
      }),
    ).rejects.toThrow();
  });

  it("removes reports when either user is deleted", async () => {
    await db.client.query("DELETE FROM users WHERE id = $1", [b]);
    const { rows } = await db.client.query("SELECT 1 FROM reports");
    expect(rows).toHaveLength(0);
  });
});
