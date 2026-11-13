import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPreferences, savePreferences } from "../src/preferences/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
let userId: string;

beforeAll(async () => {
  db = await createTestDb();
  const { rows } = await db.client.query(
    `INSERT INTO users (email, password_hash, birth_date)
     VALUES ('p@example.com', 'x', '1990-01-01') RETURNING id`,
  );
  userId = rows[0].id;
});
afterAll(async () => {
  await db.drop();
});

const input = { minAge: 25, maxAge: 40, maxDistanceKm: 30 };

describe("preferences repository", () => {
  it("returns null before anything is saved", async () => {
    expect(await getPreferences(db.client, userId)).toBeNull();
  });

  it("saves and then updates in place", async () => {
    expect(await savePreferences(db.client, userId, input)).toMatchObject(input);
    const next = await savePreferences(db.client, userId, { ...input, maxAge: 50 });
    expect(next.maxAge).toBe(50);
    const { rows } = await db.client.query("SELECT count(*)::int AS n FROM preferences");
    expect(rows[0].n).toBe(1);
  });

  it("rejects under-18 and inverted ranges", async () => {
    await expect(
      savePreferences(db.client, userId, { ...input, minAge: 17 }),
    ).rejects.toThrow();
    await expect(
      savePreferences(db.client, userId, { ...input, minAge: 45, maxAge: 30 }),
    ).rejects.toThrow();
  });

  it("is removed when the user is deleted", async () => {
    await db.client.query("DELETE FROM users WHERE id = $1", [userId]);
    expect(await getPreferences(db.client, userId)).toBeNull();
  });
});
