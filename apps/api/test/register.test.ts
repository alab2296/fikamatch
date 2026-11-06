import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { verifyPassword } from "../src/auth/password.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let tdb: TestDb;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client });
});
afterAll(async () => {
  await tdb.drop();
});

const valid = {
  email: "Anna@Example.se",
  password: "correct horse battery",
  birthDate: "1995-04-02",
};
const post = (payload: unknown, lang?: string) =>
  app.inject({
    method: "POST",
    url: "/auth/register",
    payload: payload as object,
    headers: lang ? { "accept-language": lang } : {},
  });

describe("POST /auth/register", () => {
  it("creates a user with a hashed password and lowercase email", async () => {
    const res = await post(valid);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: "anna@example.se", locale: "sv" });
    const row = await tdb.client.query(
      "SELECT * FROM users WHERE email = 'anna@example.se'",
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].password_hash).not.toContain(valid.password);
    expect(await verifyPassword(valid.password, row.rows[0].password_hash)).toBe(true);
  });

  it("rejects a duplicate email (any casing) and creates no second row", async () => {
    const res = await post({ ...valid, email: "ANNA@example.se" }, "en");
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe("An account with those details already exists.");
    const count = await tdb.client.query("SELECT count(*)::int AS n FROM users");
    expect(count.rows[0].n).toBe(1);
  });

  it("rejects under-18s with a translated message and stores nothing", async () => {
    const year = new Date().getUTCFullYear() - 17;
    const res = await post({
      ...valid,
      email: "kid@example.se",
      birthDate: `${year}-01-01`,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: "underage" });
    expect(res.json().message).toContain("18");
    const row = await tdb.client.query(
      "SELECT 1 FROM users WHERE email = 'kid@example.se'",
    );
    expect(row.rows).toHaveLength(0);
  });

  it.each([
    ["short password", { password: "short" }],
    ["bad email", { email: "nope" }],
    ["impossible date", { birthDate: "1990-02-30" }],
    ["non-Swedish phone", { phone: "+4712345678" }],
    ["unknown locale", { locale: "fr" }],
  ])("returns 400 for %s", async (_name, patch) => {
    const res = await post({ ...valid, email: "x@example.se", ...patch });
    expect(res.statusCode).toBe(400);
  });

  it("uses the requested locale when given", async () => {
    const res = await post({ ...valid, email: "bo@example.se", locale: "en" });
    expect(res.json().locale).toBe("en");
  });
});
