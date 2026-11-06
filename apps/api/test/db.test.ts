import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../src/db/migrate.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.drop();
});

const insert = (email: string, birth: string, phone: string | null = null) =>
  db.client.query(
    "INSERT INTO users (email, phone, password_hash, birth_date) VALUES ($1, $2, 'x', $3)",
    [email, phone, birth],
  );

describe("migrations", () => {
  it("records applied files and is safe to run twice", async () => {
    const again = await migrate(db.client);
    expect(again).toEqual([]);
    const { rows } = await db.client.query("SELECT name FROM schema_migrations");
    expect(rows.map((r) => r.name)).toContain("0001_users.sql");
  });

  it("keeps each test schema separate", async () => {
    const other = await createTestDb();
    await insert("a@example.com", "1990-01-01");
    const { rows } = await other.client.query("SELECT count(*)::int AS n FROM users");
    expect(rows[0].n).toBe(0);
    await other.drop();
  });
});

describe("users table", () => {
  it("applies defaults", async () => {
    await insert("defaults@example.com", "1990-05-05");
    const { rows } = await db.client.query(
      "SELECT role, locale, banned_at FROM users WHERE email = 'defaults@example.com'",
    );
    expect(rows[0]).toEqual({ role: "user", locale: "sv", banned_at: null });
  });

  it("rejects duplicate emails regardless of case", async () => {
    await insert("dup@example.com", "1990-01-01");
    await expect(insert("DUP@example.com", "1991-01-01")).rejects.toThrow(/duplicate/);
  });

  it("rejects users under 18", async () => {
    const young = new Date();
    young.setFullYear(young.getFullYear() - 17);
    await expect(
      insert("young@example.com", young.toISOString().slice(0, 10)),
    ).rejects.toThrow(/users_adult/);
  });

  it("only accepts Swedish phone numbers", async () => {
    await expect(insert("p1@example.com", "1990-01-01", "+4799999999")).rejects.toThrow(
      /users_phone_se/,
    );
    await insert("p2@example.com", "1990-01-01", "+46701234567");
  });
});
