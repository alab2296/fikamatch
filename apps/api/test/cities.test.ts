import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.drop();
});

describe("cities", () => {
  it("seeds the four launch cities in Sweden", async () => {
    const { rows } = await db.client.query(
      "SELECT slug, country FROM cities ORDER BY id",
    );
    expect(rows.map((r) => r.slug)).toEqual([
      "stockholm",
      "gothenburg",
      "malmo",
      "uppsala",
    ]);
    expect(rows.every((r) => r.country === "SE")).toBe(true);
  });

  it("rejects duplicate slugs and out-of-range coordinates", async () => {
    await expect(
      db.client.query(
        "INSERT INTO cities (id, slug, name, centre_lat, centre_lon) VALUES (9, 'malmo', 'X', 1, 1)",
      ),
    ).rejects.toThrow();
    await expect(
      db.client.query(
        "INSERT INTO cities (id, slug, name, centre_lat, centre_lon) VALUES (10, 'x', 'X', 99, 1)",
      ),
    ).rejects.toThrow();
  });
});
