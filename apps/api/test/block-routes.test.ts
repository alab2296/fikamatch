import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { isBlockedEitherWay } from "../src/blocks/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let a: { id: string; headers: { authorization: string } };
let b: { id: string; headers: { authorization: string } };
let c: { id: string; headers: { authorization: string } };

async function addUser(email: string) {
  const u = await tdb.client.query(
    `INSERT INTO users (email, password_hash, birth_date) VALUES ($1, 'x', '1990-01-01') RETURNING id`,
    [email],
  );
  const id = u.rows[0].id as string;
  return {
    id,
    headers: {
      authorization:
        "Bearer " + signToken({ sub: id, role: "user", kind: "access" }, secret),
    },
  };
}

const block = (userId: unknown, who = a) =>
  app.inject({
    method: "POST",
    url: "/blocks",
    payload: { userId },
    headers: who.headers,
  });
const unblock = (userId: string, who = a) =>
  app.inject({ method: "DELETE", url: `/blocks/${userId}`, headers: who.headers });
const list = (who = a) =>
  app.inject({ method: "GET", url: "/blocks", headers: who.headers });

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
  a = await addUser("a@example.se");
  b = await addUser("b@example.se");
  c = await addUser("c@example.se");
});
afterAll(async () => {
  await tdb.drop();
});

describe("/blocks", () => {
  it("requires a sign-in", async () => {
    expect((await app.inject({ method: "GET", url: "/blocks" })).statusCode).toBe(401);
    const res = await app.inject({
      method: "POST",
      url: "/blocks",
      payload: { userId: b.id },
    });
    expect(res.statusCode).toBe(401);
  });

  it("blocks, lists and is safe to repeat", async () => {
    expect((await block(b.id)).statusCode).toBe(204);
    expect((await block(b.id)).statusCode).toBe(204);
    expect((await list()).json()).toEqual({ blocked: [b.id] });
    expect(await isBlockedEitherWay(tdb.client, a.id, b.id)).toBe(true);
    expect(await isBlockedEitherWay(tdb.client, b.id, a.id)).toBe(true);
  });

  it("never tells the blocked person, and their list stays empty", async () => {
    expect((await list(b)).json()).toEqual({ blocked: [] });
  });

  it("rejects self-blocks, bad ids and people who do not exist", async () => {
    expect((await block(a.id)).statusCode).toBe(400);
    expect((await block("nope")).statusCode).toBe(400);
    expect((await block(undefined)).statusCode).toBe(400);
    expect((await block(randomUUID())).statusCode).toBe(404);
  });

  it("only removes your own block", async () => {
    await block(c.id, b);
    expect((await unblock(c.id, a)).statusCode).toBe(204); // a never blocked c
    expect(await isBlockedEitherWay(tdb.client, b.id, c.id)).toBe(true);
    expect((await unblock(b.id, a)).statusCode).toBe(204);
    expect(await isBlockedEitherWay(tdb.client, a.id, b.id)).toBe(false);
    expect((await list()).json()).toEqual({ blocked: [] });
    expect((await unblock("nope")).statusCode).toBe(404);
  });
});
