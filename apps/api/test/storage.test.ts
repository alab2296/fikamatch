import { describe, expect, it } from "vitest";
import { MemoryPhotoStorage } from "../src/storage/memory.js";

const secret = "test-secret-for-photo-links";

function parse(url: string) {
  const u = new URL(url);
  return {
    key: decodeURIComponent(u.pathname.split("/").pop()!),
    expires: Number(u.searchParams.get("expires")),
    sig: u.searchParams.get("sig")!,
  };
}

describe("MemoryPhotoStorage", () => {
  it("stores, reads and really deletes an object", async () => {
    const s = new MemoryPhotoStorage(secret);
    const stored = await s.put("u1/a.jpg", Buffer.from("abc"), "image/jpeg");
    expect(stored.size).toBe(3);
    expect((await s.get("u1/a.jpg"))?.contentType).toBe("image/jpeg");
    await s.delete("u1/a.jpg");
    expect(await s.get("u1/a.jpg")).toBeNull();
    await expect(s.delete("u1/a.jpg")).resolves.toBeUndefined();
  });

  it("accepts a fresh signed link", () => {
    const s = new MemoryPhotoStorage(secret);
    const { key, expires, sig } = parse(s.signedUrl("u1/a.jpg", 60));
    expect(s.verifyUrl(key, expires, sig)).toBe(true);
  });

  it("rejects an expired link", () => {
    let t = 1_000_000;
    const s = new MemoryPhotoStorage(secret, undefined, () => t);
    const { key, expires, sig } = parse(s.signedUrl("u1/a.jpg", 60));
    t += 61_000;
    expect(s.verifyUrl(key, expires, sig)).toBe(false);
  });

  it("rejects a changed key, expiry or signature", () => {
    const s = new MemoryPhotoStorage(secret);
    const { key, expires, sig } = parse(s.signedUrl("u1/a.jpg", 60));
    expect(s.verifyUrl("u2/a.jpg", expires, sig)).toBe(false);
    expect(s.verifyUrl(key, expires + 1000, sig)).toBe(false);
    expect(s.verifyUrl(key, expires, "0".repeat(64))).toBe(false);
    expect(s.verifyUrl(key, expires, "short")).toBe(false);
  });

  it("rejects links signed with another secret", () => {
    const a = new MemoryPhotoStorage(secret);
    const b = new MemoryPhotoStorage("another-secret-entirely");
    const { key, expires, sig } = parse(a.signedUrl("k", 60));
    expect(b.verifyUrl(key, expires, sig)).toBe(false);
  });
});
