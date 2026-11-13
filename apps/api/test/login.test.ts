import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { verifyToken } from "../src/auth/tokens.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
const password = "correct horse battery";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let userId: string;

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
  const hash = await hashPassword(password);
  const r = await tdb.client.query(
    `INSERT INTO users (email, password_hash, birth_date) VALUES ($1, $2, '1990-01-01'), ('banned@example.se', $2, '1990-01-01') RETURNING id`,
    ["anna@example.se", hash],
  );
  userId = r.rows[0].id;
  await tdb.client.query(
    "UPDATE users SET banned_at = now() WHERE email = 'banned@example.se'",
  );
});
afterAll(async () => {
  await tdb.drop();
});

const login = (payload: unknown, lang?: string) =>
  app.inject({
    method: "POST",
    url: "/auth/login",
    payload: payload as object,
    headers: lang ? { "accept-language": lang } : {},
  });

describe("POST /auth/login", () => {
  it("returns working access and refresh tokens", async () => {
    const res = await login({ email: "Anna@Example.se", password });
    expect(res.statusCode).toBe(200);
    const { accessToken, refreshToken, expiresIn } = res.json();
    expect(expiresIn).toBe(900);
    const a = verifyToken(accessToken, secret, "access");
    const r = verifyToken(refreshToken, secret, "refresh");
    expect(a).toMatchObject({ ok: true, claims: { sub: userId, role: "user" } });
    expect(r.ok).toBe(true);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    const wrong = await login(
      { email: "anna@example.se", password: "nope nope nope" },
      "en",
    );
    const unknown = await login({ email: "ghost@example.se", password }, "en");
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrong.json());
    expect(wrong.json().message).toBe("Email or password is wrong.");
  });

  it("answers in Swedish by default", async () => {
    const res = await login({ email: "ghost@example.se", password });
    expect(res.json().message).toBe("Fel e-postadress eller lösenord.");
  });

  it("refuses banned users without issuing tokens", async () => {
    const res = await login({ email: "banned@example.se", password });
    expect(res.statusCode).toBe(403);
    expect(res.json().accessToken).toBeUndefined();
  });

  it("returns 400 for a malformed body", async () => {
    expect((await login({ email: "nope", password })).statusCode).toBe(400);
    expect((await login({ email: "a@b.se" })).statusCode).toBe(400);
  });
});
