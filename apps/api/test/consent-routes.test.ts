import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let a: { id: string; headers: { authorization: string } };
let b: { id: string; headers: { authorization: string } };

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

const put = (kind: string, payload: object, who = a) =>
  app.inject({
    method: "PUT",
    url: `/me/consents/${kind}`,
    payload,
    headers: who.headers,
  });
const get = (who = a) =>
  app.inject({ method: "GET", url: "/me/consents", headers: who.headers });

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
  a = await addUser("a@example.se");
  b = await addUser("b@example.se");
});
afterAll(async () => {
  await tdb.drop();
});

describe("/me/consents", () => {
  it("requires a sign-in", async () => {
    expect((await app.inject({ method: "GET", url: "/me/consents" })).statusCode).toBe(
      401,
    );
  });

  it("starts with everything off", async () => {
    expect((await get()).json()).toEqual({
      terms: false,
      privacy: false,
      ai_processing: false,
    });
  });

  it("grants and withdraws, keeping a history row per real change", async () => {
    expect((await put("terms", { granted: true })).json().terms).toBe(true);
    await put("terms", { granted: true }); // no change, no new row
    await put("ai_processing", { granted: true });
    expect((await get()).json()).toMatchObject({ terms: true, ai_processing: true });
    await put("ai_processing", { granted: false });
    expect((await get()).json().ai_processing).toBe(false);
    const { rows } = await tdb.client.query(
      "SELECT kind, granted FROM consents WHERE user_id = $1 ORDER BY id",
      [a.id],
    );
    expect(rows).toEqual([
      { kind: "terms", granted: true },
      { kind: "ai_processing", granted: true },
      { kind: "ai_processing", granted: false },
    ]);
  });

  it("keeps users apart", async () => {
    expect((await get(b)).json().terms).toBe(false);
  });

  it("rejects unknown kinds and bad bodies", async () => {
    expect((await put("marketing", { granted: true })).statusCode).toBe(404);
    expect((await put("terms", { granted: "yes" })).statusCode).toBe(400);
    expect((await put("terms", {})).statusCode).toBe(400);
  });

  it("switches AI off on the profile when AI consent is withdrawn", async () => {
    const city = (await tdb.client.query("SELECT id FROM cities LIMIT 1")).rows[0].id;
    await tdb.client.query(
      `INSERT INTO profiles (user_id, display_name, gender, city_id, ai_enabled)
       VALUES ($1, 'B', 'man', $2, true)`,
      [b.id, city],
    );
    await put("ai_processing", { granted: true }, b);
    await put("ai_processing", { granted: false }, b);
    const { rows } = await tdb.client.query(
      "SELECT ai_enabled FROM profiles WHERE user_id = $1",
      [b.id],
    );
    expect(rows[0].ai_enabled).toBe(false);
  });
});
