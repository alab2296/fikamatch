import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  currentConsents,
  hasConsent,
  recordConsent,
} from "../src/consents/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
let userId: string;
beforeAll(async () => {
  db = await createTestDb();
  const { rows } = await db.client.query(
    `INSERT INTO users (email, password_hash, birth_date)
     VALUES ('c@example.se', 'x', '1990-01-01') RETURNING id`,
  );
  userId = rows[0].id;
});
afterAll(async () => {
  await db.drop();
});

describe("consents", () => {
  it("is false until granted", async () => {
    expect(await hasConsent(db.client, userId, "ai_processing")).toBe(false);
  });

  it("latest record wins, so withdrawal takes effect", async () => {
    await recordConsent(db.client, userId, "ai_processing", true);
    expect(await hasConsent(db.client, userId, "ai_processing")).toBe(true);
    await recordConsent(db.client, userId, "ai_processing", false);
    expect(await hasConsent(db.client, userId, "ai_processing")).toBe(false);
    const { rows } = await db.client.query(
      "SELECT count(*)::int AS n FROM consents WHERE user_id = $1",
      [userId],
    );
    expect(rows[0].n).toBe(2);
  });

  it("summarises current state per kind", async () => {
    await recordConsent(db.client, userId, "terms", true);
    expect(await currentConsents(db.client, userId)).toEqual({
      terms: true,
      privacy: false,
      ai_processing: false,
    });
  });

  it("rejects unknown kinds and removes consents with the user", async () => {
    await expect(
      db.client.query(
        "INSERT INTO consents (user_id, kind, granted) VALUES ($1, 'x', true)",
        [userId],
      ),
    ).rejects.toThrow();
    await db.client.query("DELETE FROM users WHERE id = $1", [userId]);
    const { rows } = await db.client.query("SELECT 1 FROM consents WHERE user_id = $1", [
      userId,
    ]);
    expect(rows).toHaveLength(0);
  });
});
