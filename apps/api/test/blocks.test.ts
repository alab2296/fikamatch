import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  blockUser,
  isBlockedEitherWay,
  listBlocked,
  unblockUser,
} from "../src/blocks/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
let a: string;
let b: string;
let c: string;

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
  c = await addUser("c@example.se");
});
afterAll(async () => {
  await db.drop();
});

describe("blocks", () => {
  it("is not blocked until someone blocks", async () => {
    expect(await isBlockedEitherWay(db.client, a, b)).toBe(false);
  });

  it("applies in both directions", async () => {
    await blockUser(db.client, a, b);
    expect(await isBlockedEitherWay(db.client, a, b)).toBe(true);
    expect(await isBlockedEitherWay(db.client, b, a)).toBe(true);
    expect(await isBlockedEitherWay(db.client, a, c)).toBe(false);
  });

  it("blocking twice keeps a single row", async () => {
    await blockUser(db.client, a, b);
    expect(await listBlocked(db.client, a)).toEqual([b]);
  });

  it("refuses to block yourself", async () => {
    await expect(blockUser(db.client, a, a)).rejects.toThrow();
  });

  it("unblock lifts it", async () => {
    await unblockUser(db.client, a, b);
    expect(await isBlockedEitherWay(db.client, a, b)).toBe(false);
  });

  it("deleting a user removes their blocks", async () => {
    await blockUser(db.client, b, c);
    await db.client.query("DELETE FROM users WHERE id = $1", [b]);
    expect(await isBlockedEitherWay(db.client, b, c)).toBe(false);
  });
});
