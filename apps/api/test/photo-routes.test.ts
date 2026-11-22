import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { signToken } from "../src/auth/tokens.js";
import { storageKeysForUser } from "../src/photos/repository.js";
import { MemoryPhotoStorage } from "../src/storage/memory.js";
import { createTestDb, type TestDb } from "./helpers/db.js";

const secret = "test-secret-long-enough-123";
let tdb: TestDb;
let app: ReturnType<typeof buildApp>;
let storage: MemoryPhotoStorage;
let a: { id: string; headers: { authorization: string } };
let b: { id: string; headers: { authorization: string } };

const png = () =>
  Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from("fake-pixels")]);
const jpeg = () => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const webp = () =>
  Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPx")]);

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

const upload = (who = a, data: Buffer = png(), type = "image/png") =>
  app.inject({
    method: "POST",
    url: "/photos/me",
    payload: data,
    headers: { ...who.headers, "content-type": type },
  });
const list = (who = a) =>
  app.inject({ method: "GET", url: "/photos/me", headers: who.headers });

beforeAll(async () => {
  tdb = await createTestDb();
  storage = new MemoryPhotoStorage(secret, "http://localhost/photos");
  app = buildApp(undefined, { db: tdb.client, jwtSecret: secret, storage });
  a = await addUser("a@example.se");
  b = await addUser("b@example.se");
});
afterAll(async () => {
  await tdb.drop();
});

describe("photos", () => {
  it("requires a sign-in", async () => {
    expect((await app.inject({ method: "GET", url: "/photos/me" })).statusCode).toBe(401);
    const res = await app.inject({
      method: "POST",
      url: "/photos/me",
      payload: png(),
      headers: { "content-type": "image/png" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects wrong types, mismatched bytes and empty bodies", async () => {
    expect((await upload(a, Buffer.from("hello"), "text/plain")).statusCode).toBe(415);
    expect(
      (await upload(a, Buffer.from("not a png at all"), "image/png")).statusCode,
    ).toBe(415);
    expect((await upload(a, jpeg(), "image/png")).statusCode).toBe(415);
    expect((await list()).json().photos).toHaveLength(0);
  });

  it("uploads in order and serves each through its signed link", async () => {
    const one = await upload(a, png(), "image/png");
    expect(one.statusCode).toBe(201);
    expect(one.json().position).toBe(1);
    expect((await upload(a, jpeg(), "image/jpeg")).json().position).toBe(2);
    expect((await upload(a, webp(), "image/webp")).json().position).toBe(3);

    const url = new URL(one.json().url);
    const got = await app.inject({ method: "GET", url: url.pathname + url.search });
    expect(got.statusCode).toBe(200);
    expect(got.headers["content-type"]).toBe("image/png");
    expect(got.headers["x-content-type-options"]).toBe("nosniff");
    expect(got.rawPayload.equals(png())).toBe(true);
  });

  it("refuses a tampered or unsigned link", async () => {
    const url = new URL((await list()).json().photos[0].url);
    const bad = url.search.replace(/sig=(.)/, (_m, c) => `sig=${c === "0" ? "1" : "0"}`);
    expect(
      (await app.inject({ method: "GET", url: url.pathname + bad })).statusCode,
    ).toBe(403);
    expect((await app.inject({ method: "GET", url: url.pathname })).statusCode).toBe(403);
  });

  it("reorders, and only accepts exactly the user's own photos", async () => {
    const ids: string[] = (await list()).json().photos.map((p: { id: string }) => p.id);
    const reversed = [...ids].reverse();
    const res = await app.inject({
      method: "PUT",
      url: "/photos/me/order",
      payload: { ids: reversed },
      headers: a.headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().photos.map((p: { id: string }) => p.id)).toEqual(reversed);

    for (const bad of [ids.slice(1), [...ids, ids[0]], [ids[0], ids[0], ids[1]], ["x"]]) {
      const r = await app.inject({
        method: "PUT",
        url: "/photos/me/order",
        payload: { ids: bad },
        headers: a.headers,
      });
      expect(r.statusCode).toBe(400);
    }
    const other = await app.inject({
      method: "PUT",
      url: "/photos/me/order",
      payload: { ids },
      headers: b.headers,
    });
    expect(other.statusCode).toBe(400);
  });

  it("keeps users apart and stops at six photos", async () => {
    expect((await list(b)).json().photos).toHaveLength(0);
    for (let i = 0; i < 3; i++) expect((await upload(a)).statusCode).toBe(201);
    const seventh = await upload(a);
    expect(seventh.statusCode).toBe(409);
    expect(seventh.json().code).toBe("too_many_photos");
    expect(await storageKeysForUser(tdb.client, a.id)).toHaveLength(6);
  });

  it("deletes the row and the stored file, and closes the gap", async () => {
    const photos = (await list()).json().photos as { id: string }[];
    const keys = await storageKeysForUser(tdb.client, a.id);
    const target = photos[1]!;
    const forbidden = await app.inject({
      method: "DELETE",
      url: `/photos/me/${target.id}`,
      headers: b.headers,
    });
    expect(forbidden.statusCode).toBe(404);

    const del = await app.inject({
      method: "DELETE",
      url: `/photos/me/${target.id}`,
      headers: a.headers,
    });
    expect(del.statusCode).toBe(204);
    const after = (await list()).json().photos as { id: string; position: number }[];
    expect(after.map((p) => p.position)).toEqual([1, 2, 3, 4, 5]);
    const remaining = await storageKeysForUser(tdb.client, a.id);
    const gone = keys.filter((k) => !remaining.includes(k));
    expect(gone).toHaveLength(1);
    expect(await storage.get(gone[0]!)).toBeNull();
  });
});
