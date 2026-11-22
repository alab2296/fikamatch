import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { distanceBetweenUsers, userIdsWithin } from "../src/location/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let cityId: number;
const users: Record<string, { id: string; auth: { authorization: string } }> = {};

async function addUser(name: string, withProfile = true) {
  const u = await tdb.client.query(
    `INSERT INTO users (email, password_hash, birth_date) VALUES ($1, 'x', '1990-01-01') RETURNING id`,
    [`${name}@example.se`],
  );
  const id = u.rows[0].id as string;
  if (withProfile)
    await tdb.client.query(
      `INSERT INTO profiles (user_id, display_name, gender, city_id) VALUES ($1, $2, 'woman', $3)`,
      [id, name, cityId],
    );
  users[name] = {
    id,
    auth: {
      authorization:
        "Bearer " + signToken({ sub: id, role: "user", kind: "access" }, secret),
    },
  };
}

const put = (who: string, payload: object) =>
  app.inject({
    method: "PUT",
    url: "/profile/me/location",
    payload,
    headers: users[who]!.auth,
  });

beforeAll(async () => {
  tdb = await createTestDb();
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
  cityId = (await tdb.client.query("SELECT id FROM cities ORDER BY id LIMIT 1")).rows[0]
    .id;
  await addUser("stockholm");
  await addUser("uppsala");
  await addUser("malmo");
  await addUser("noprofile", false);
});
afterAll(async () => {
  await tdb.drop();
});

describe("/profile/me/location", () => {
  it("requires a sign-in", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/profile/me/location",
      payload: { lat: 59.3, lon: 18.0 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("is 404 without a profile and 400 for bad coordinates", async () => {
    expect((await put("noprofile", { lat: 59.3, lon: 18.0 })).statusCode).toBe(404);
    expect((await put("stockholm", { lat: 91, lon: 18 })).statusCode).toBe(400);
    expect((await put("stockholm", { lat: 59 })).statusCode).toBe(400);
  });

  it("stores only the rounded point and returns no coordinates", async () => {
    const res = await put("stockholm", { lat: 59.329323, lon: 18.068581 });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    const { rows } = await tdb.client.query(
      `SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
         FROM profiles WHERE user_id = $1`,
      [users.stockholm!.id],
    );
    expect(rows[0].lat).toBeCloseTo(59.325, 4);
    expect(rows[0].lon).toBeCloseTo(18.065, 4);
  });

  it("measures whole-km distances and finds nearby users", async () => {
    await put("uppsala", { lat: 59.8586, lon: 17.6389 });
    await put("malmo", { lat: 55.605, lon: 13.0038 });
    const km = await distanceBetweenUsers(
      tdb.client,
      users.stockholm!.id,
      users.uppsala!.id,
    );
    expect(km).toBeGreaterThan(55);
    expect(km).toBeLessThan(75);
    const near = await userIdsWithin(tdb.client, users.stockholm!.id, 100);
    expect(near).toEqual([users.uppsala!.id]);
    const far = await userIdsWithin(tdb.client, users.stockholm!.id, 1000);
    expect(far).toEqual([users.uppsala!.id, users.malmo!.id]);
  });

  it("clears the location for real", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/profile/me/location",
      headers: users.uppsala!.auth,
    });
    expect(res.statusCode).toBe(204);
    const { rows } = await tdb.client.query(
      "SELECT location FROM profiles WHERE user_id = $1",
      [users.uppsala!.id],
    );
    expect(rows[0].location).toBeNull();
    expect(
      await distanceBetweenUsers(tdb.client, users.stockholm!.id, users.uppsala!.id),
    ).toBeNull();
  });
});
