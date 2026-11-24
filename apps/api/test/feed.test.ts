import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { blockUser } from "../src/blocks/repository.js";
import { candidateFeed } from "../src/feed/repository.js";
import { setLocation } from "../src/location/repository.js";
import { recordSwipe } from "../src/swipes/repository.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let cityA: number;
let cityB: number;
const ids: Record<string, string> = {};

interface Opts {
  gender?: string;
  looking?: string[];
  age?: number;
  city?: number;
  at?: [number, number];
  prefs?: [number, number, number];
  noProfile?: boolean;
}

async function add(name: string, o: Opts = {}) {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - (o.age ?? 30) - 1);
  const { rows } = await tdb.client.query(
    `INSERT INTO users (email, password_hash, birth_date) VALUES ($1, 'x', $2) RETURNING id`,
    [`${name}@example.se`, birth.toISOString().slice(0, 10)],
  );
  const id = rows[0].id as string;
  ids[name] = id;
  if (o.noProfile) return;
  await tdb.client.query(
    `INSERT INTO profiles (user_id, display_name, gender, looking_for, city_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, name, o.gender ?? "woman", o.looking ?? [], o.city ?? cityA],
  );
  if (o.at) await setLocation(tdb.client, id, { lat: o.at[0], lon: o.at[1] });
  if (o.prefs)
    await tdb.client.query(
      `INSERT INTO preferences (user_id, min_age, max_age, max_distance_km) VALUES ($1,$2,$3,$4)`,
      [id, ...o.prefs],
    );
}

const feed = async (who: string) =>
  (await candidateFeed(tdb.client, ids[who]!)).map((c) => c.userId);
const names = (list: string[]) =>
  list.map((id) => Object.keys(ids).find((k) => ids[k] === id));

beforeAll(async () => {
  tdb = await createTestDb();
  const c = await tdb.client.query("SELECT id FROM cities ORDER BY id LIMIT 2");
  cityA = c.rows[0].id;
  cityB = c.rows[1].id;
});
afterAll(async () => {
  await tdb.drop();
});

describe("candidate feed (no locations, same city)", () => {
  beforeAll(async () => {
    await add("me", { gender: "woman", looking: ["man"], age: 30, prefs: [25, 40, 25] });
    await add("ok", { gender: "man", age: 33 });
    await add("ok2", { gender: "man", looking: ["woman"], age: 28 });
    await add("elsewhere", { gender: "man", city: cityB });
    await add("wrong-gender", { gender: "woman" });
    await add("not-into-me", { gender: "man", looking: ["nonbinary"] });
    await add("too-young", { gender: "man", age: 22 });
    await add("too-old", { gender: "man", age: 45 });
    await add("wants-younger", { gender: "man", age: 33, prefs: [18, 25, 25] });
    await add("banned", { gender: "man" });
    await tdb.client.query("UPDATE users SET banned_at = now() WHERE id = $1", [
      ids.banned,
    ]);
    await add("no-profile", { noProfile: true });
  });

  it("shows only people who fit both ways, never the viewer", async () => {
    const got = names(await feed("me")).sort();
    expect(got).toEqual(["ok", "ok2"]);
  });

  it("drops blocked (either way) and swiped people", async () => {
    await add("blocker", { gender: "man" });
    await add("blocked", { gender: "man" });
    await add("swiped", { gender: "man" });
    await blockUser(tdb.client, ids.blocker!, ids.me!);
    await blockUser(tdb.client, ids.me!, ids.blocked!);
    await recordSwipe(tdb.client, ids.me!, ids.swiped!, "pass");
    const got = names(await feed("me"));
    expect(got).not.toContain("blocker");
    expect(got).not.toContain("blocked");
    expect(got).not.toContain("swiped");
    expect(got).toContain("ok");
  });

  it("honours the limit and returns no coordinates", async () => {
    const one = await candidateFeed(tdb.client, ids.me!, 1);
    expect(one).toHaveLength(1);
    expect(Object.keys(one[0]!).sort()).toEqual([
      "age",
      "bio",
      "cityId",
      "displayName",
      "distanceKm",
      "userId",
    ]);
    expect(one[0]!.distanceKm).toBeNull();
  });
});

describe("candidate feed (with locations)", () => {
  beforeAll(async () => {
    await add("geo", {
      gender: "woman",
      looking: ["man"],
      at: [59.33, 18.07],
      prefs: [18, 99, 100],
    });
    await add("near", { gender: "man", at: [59.4, 18.0] });
    await add("mid", { gender: "man", at: [59.86, 17.64], city: cityB });
    await add("far", { gender: "man", at: [55.6, 13.0] });
    await add("nolocation", { gender: "man" });
  });

  it("filters by the viewer's distance and orders nearest first", async () => {
    const list = await candidateFeed(tdb.client, ids.geo!);
    expect(names(list.map((c) => c.userId))).toEqual(["near", "mid"]);
    expect(list[0]!.distanceKm).toBeLessThan(list[1]!.distanceKm!);
  });

  it("works over HTTP, needs a profile and a sign-in", async () => {
    const app = buildApp(undefined, { db: tdb.client, jwtSecret: secret });
    const as = (name: string) => ({
      authorization:
        "Bearer " + signToken({ sub: ids[name]!, role: "user", kind: "access" }, secret),
    });
    expect((await app.inject({ method: "GET", url: "/feed" })).statusCode).toBe(401);
    const none = await app.inject({
      method: "GET",
      url: "/feed",
      headers: as("no-profile"),
    });
    expect(none.statusCode).toBe(404);
    const bad = await app.inject({
      method: "GET",
      url: "/feed?limit=0",
      headers: as("geo"),
    });
    expect(bad.statusCode).toBe(400);
    const ok = await app.inject({
      method: "GET",
      url: "/feed?limit=1",
      headers: as("geo"),
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().candidates).toHaveLength(1);
  });
});
