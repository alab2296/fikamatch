import { createHmac, timingSafeEqual } from "node:crypto";
import type { PhotoStorage, StoredObject } from "./provider.js";

/** In-memory storage for development and tests. Signed links use HMAC-SHA256. */
export class MemoryPhotoStorage implements PhotoStorage {
  private objects = new Map<string, { data: Buffer; contentType: string }>();

  constructor(
    private readonly secret: string,
    private readonly baseUrl = "http://localhost:3000/photos",
    private readonly now: () => number = () => Date.now(),
  ) {}

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    this.objects.set(key, { data: Buffer.from(data), contentType });
    return { key, contentType, size: data.length };
  }

  async get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  signedUrl(key: string, ttlSeconds: number): string {
    const expires = Math.floor(this.now() / 1000) + ttlSeconds;
    const sig = this.sign(key, expires);
    return `${this.baseUrl}/${encodeURIComponent(key)}?expires=${expires}&sig=${sig}`;
  }

  verifyUrl(key: string, expires: number, signature: string): boolean {
    if (!Number.isFinite(expires) || expires * 1000 < this.now()) return false;
    const expected = Buffer.from(this.sign(key, expires));
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }

  private sign(key: string, expires: number): string {
    return createHmac("sha256", this.secret).update(`${key}:${expires}`).digest("hex");
  }
}
