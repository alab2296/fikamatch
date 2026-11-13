import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "../src/ratelimit/limiter.js";

describe("MemoryRateLimiter", () => {
  it("allows up to the max and then blocks", () => {
    const l = new MemoryRateLimiter(3, 60_000);
    expect(l.hit("a", 0)).toEqual({ allowed: true, remaining: 2 });
    l.hit("a", 1);
    expect(l.hit("a", 2)).toEqual({ allowed: true, remaining: 0 });
    expect(l.hit("a", 3)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("reports the time left in the window", () => {
    const l = new MemoryRateLimiter(1, 10_000);
    l.hit("a", 0);
    expect(l.hit("a", 4_500)).toEqual({ allowed: false, retryAfterSeconds: 6 });
  });

  it("resets after the window passes", () => {
    const l = new MemoryRateLimiter(1, 1_000);
    l.hit("a", 0);
    expect(l.hit("a", 500).allowed).toBe(false);
    expect(l.hit("a", 1_000).allowed).toBe(true);
  });

  it("counts keys separately", () => {
    const l = new MemoryRateLimiter(1, 1_000);
    l.hit("a", 0);
    expect(l.hit("b", 0).allowed).toBe(true);
  });

  it("prune removes expired windows only", () => {
    const l = new MemoryRateLimiter(1, 1_000);
    l.hit("old", 0);
    l.hit("new", 900);
    l.prune(1_500);
    expect(l.hit("old", 1_500).allowed).toBe(true);
    expect(l.hit("new", 1_500).allowed).toBe(false);
  });

  it("rejects nonsense config", () => {
    expect(() => new MemoryRateLimiter(0, 1000)).toThrow();
  });
});
