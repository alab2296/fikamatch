import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let authA: { authorization: string };
let authB: { authorization: string };

async function addUser(email: string) {
  const u = await tdb.client.query(
    `INSERT INTO users (email, password_hash, birth_date) VALUES ($1, 'x', '1990-01-01') RETURNING id`,
    [email],
  );
  return {
    authorization:
      "Bearer " + signToken({ sub: u.rows[0].id, role: "user", kind: "access" }, secret),
  };
}

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
  authA = await addUser("a@example.se");
  authB = await addUser("b@example.se");
});
afterAll(async () => {
  await tdb.drop();
});

const call = (method: "GET" | "PUT", payload?: object, headers = authA) =>
  app.inject({ method, url: "/preferences/me", payload, headers });

describe("/preferences/me", () => {
  it("requires a sign-in", async () => {
    expect((await call("GET", undefined, {} as never)).statusCode).toBe(401);
  });

  it("is 404 before preferences exist", async () => {
    expect((await call("GET")).statusCode).toBe(404);
  });

  it("saves, updates and reads preferences", async () => {
    const first = await call("PUT", { minAge: 25, maxAge: 40, maxDistanceKm: 30 });
    expect(first.statusCode).toBe(200);
    await call("PUT", { minAge: 28, maxAge: 45, maxDistanceKm: 50 });
    expect((await call("GET")).json()).toMatchObject({
      minAge: 28,
      maxAge: 45,
      maxDistanceKm: 50,
    });
  });

  it("keeps each user's preferences separate", async () => {
    expect((await call("GET", undefined, authB)).statusCode).toBe(404);
  });

  it("rejects under-18, reversed ranges and silly distances", async () => {
    for (const bad of [
      { minAge: 17, maxAge: 40, maxDistanceKm: 30 },
      { minAge: 40, maxAge: 30, maxDistanceKm: 30 },
      { minAge: 20, maxAge: 30, maxDistanceKm: 0 },
      { minAge: 20, maxAge: 30, maxDistanceKm: 501 },
      { minAge: 20.5, maxAge: 30, maxDistanceKm: 10 },
    ]) {
      expect((await call("PUT", bad)).statusCode).toBe(400);
    }
  });
});
