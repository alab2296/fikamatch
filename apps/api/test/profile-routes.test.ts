import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let auth: { authorization: string };
let cityId: number;

const valid = () => ({
  displayName: "Anna",
  bio: "Kaffe och långa promenader",
  gender: "woman",
  lookingFor: ["man", "man", "nonbinary"],
  cityId,
});

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
  const u = await tdb.client.query(
    `INSERT INTO users (email, password_hash, birth_date) VALUES ('anna@example.se', 'x', '1990-01-01') RETURNING id`,
  );
  const c = await tdb.client.query("SELECT id FROM cities ORDER BY id LIMIT 1");
  cityId = c.rows[0].id;
  auth = {
    authorization:
      "Bearer " + signToken({ sub: u.rows[0].id, role: "user", kind: "access" }, secret),
  };
});
afterAll(async () => {
  await tdb.drop();
});

const call = (method: "GET" | "PUT" | "DELETE", payload?: object, headers = auth) =>
  app.inject({ method, url: "/profile/me", payload, headers });

describe("/profile/me", () => {
  it("requires a sign-in", async () => {
    expect((await call("GET", undefined, {} as never)).statusCode).toBe(401);
  });

  it("is 404 before a profile exists", async () => {
    expect((await call("GET")).statusCode).toBe(404);
  });

  it("creates, reads and updates the profile", async () => {
    const put = await call("PUT", valid());
    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({
      displayName: "Anna",
      lookingFor: ["man", "nonbinary"],
      aiEnabled: false,
    });
    await call("PUT", { ...valid(), displayName: "Anna L", aiEnabled: true });
    const got = (await call("GET")).json();
    expect(got).toMatchObject({ displayName: "Anna L", aiEnabled: true });
  });

  it("rejects bad input and unknown cities with a translated error", async () => {
    expect((await call("PUT", { ...valid(), displayName: "" })).statusCode).toBe(400);
    expect((await call("PUT", { ...valid(), gender: "x" })).statusCode).toBe(400);
    const res = await call("PUT", { ...valid(), cityId: 9999 });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("validation");
  });

  it("really deletes the profile", async () => {
    expect((await call("DELETE")).statusCode).toBe(204);
    expect((await call("GET")).statusCode).toBe(404);
    const { rowCount } = await tdb.client.query("SELECT 1 FROM profiles");
    expect(rowCount).toBe(0);
    expect((await call("DELETE")).statusCode).toBe(404);
  });
});
