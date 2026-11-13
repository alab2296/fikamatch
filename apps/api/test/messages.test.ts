import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMessage, listHistory } from "../src/messages/repository.js";
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

describe("messages", () => {
  it("returns history for a pair in both directions, newest first", async () => {
    await addMessage(db.client, a, b, "hej");
    await addMessage(db.client, b, a, "hej själv");
    await addMessage(db.client, a, c, "private to c");
    const hist = await listHistory(db.client, b, a);
    expect(hist.map((m) => m.body)).toEqual(["hej själv", "hej"]);
  });

  it("pages with limit and before", async () => {
    const hist = await listHistory(db.client, a, b, { limit: 1 });
    expect(hist).toHaveLength(1);
    const older = await listHistory(db.client, a, b, { before: hist[0]!.createdAt });
    expect(older.map((m) => m.body)).toEqual(["hej"]);
  });

  it("rejects empty, oversized and self messages", async () => {
    await expect(addMessage(db.client, a, b, "")).rejects.toThrow();
    await expect(addMessage(db.client, a, b, "x".repeat(2001))).rejects.toThrow();
    await expect(addMessage(db.client, a, a, "hi")).rejects.toThrow();
  });

  it("removes messages when a user is deleted", async () => {
    await db.client.query("DELETE FROM users WHERE id = $1", [c]);
    const { rows } = await db.client.query(
      "SELECT 1 FROM messages WHERE body = 'private to c'",
    );
    expect(rows).toHaveLength(0);
  });
});
