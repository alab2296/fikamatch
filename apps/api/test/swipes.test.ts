import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSwipe, hasLikedBy, recordSwipe } from "../src/swipes/repository.js";
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

describe("swipes", () => {
  it("stores a swipe once and keeps the first answer", async () => {
    expect(await recordSwipe(db.client, a, b, "like")).toBe(true);
    expect(await recordSwipe(db.client, a, b, "pass")).toBe(false);
    expect(await getSwipe(db.client, a, b)).toBe("like");
  });

  it("sees a like from the other side only", async () => {
    expect(await hasLikedBy(db.client, b, a)).toBe(true);
    expect(await hasLikedBy(db.client, a, b)).toBe(false);
  });

  it("rejects swiping yourself", async () => {
    await expect(recordSwipe(db.client, a, a, "like")).rejects.toThrow();
  });

  it("removes swipes when a user is deleted", async () => {
    await db.client.query("DELETE FROM users WHERE id = $1", [b]);
    expect(await getSwipe(db.client, a, b)).toBeNull();
  });
});
