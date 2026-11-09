import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteProfile, getProfile, saveProfile } from "../src/profiles/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

let db: TestDb;
let userId: string;

beforeAll(async () => {
  db = await createTestDb();
  const { rows } = await db.client.query(
    `INSERT INTO users (email, password_hash, birth_date)
     VALUES ('a@example.com', 'x', '1990-01-01') RETURNING id`,
  );
  userId = rows[0].id;
});
afterAll(async () => {
  await db.drop();
});

const base = {
  displayName: "Elin",
  bio: "Kanelbulle enthusiast",
  gender: "woman" as const,
  lookingFor: ["man" as const],
  cityId: 1,
};

describe("profiles repository", () => {
  it("returns null before a profile exists", async () => {
    expect(await getProfile(db.client, userId)).toBeNull();
  });

  it("creates a profile with AI off by default", async () => {
    const p = await saveProfile(db.client, userId, base);
    expect(p).toMatchObject({ displayName: "Elin", aiEnabled: false, cityId: 1 });
  });

  it("updates fields but keeps the AI choice unless it is given", async () => {
    await saveProfile(db.client, userId, { ...base, aiEnabled: true });
    const p = await saveProfile(db.client, userId, { ...base, displayName: "Elin B" });
    expect(p.displayName).toBe("Elin B");
    expect(p.aiEnabled).toBe(true);
  });

  it("rejects bad data", async () => {
    await expect(
      saveProfile(db.client, userId, { ...base, displayName: "" }),
    ).rejects.toThrow();
    await expect(
      saveProfile(db.client, userId, { ...base, cityId: 99 }),
    ).rejects.toThrow();
    await expect(
      saveProfile(db.client, userId, { ...base, lookingFor: ["robot" as never] }),
    ).rejects.toThrow();
  });

  it("is removed with the user", async () => {
    expect(await deleteProfile(db.client, userId)).toBe(true);
    expect(await deleteProfile(db.client, userId)).toBe(false);
    await saveProfile(db.client, userId, base);
    await db.client.query("DELETE FROM users WHERE id = $1", [userId]);
    const { rows } = await db.client.query("SELECT 1 FROM profiles WHERE user_id = $1", [
      userId,
    ]);
    expect(rows).toHaveLength(0);
  });
});
