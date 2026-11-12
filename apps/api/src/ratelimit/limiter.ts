export type LimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

export interface RateLimiter {
  hit(key: string, nowMs?: number): LimitResult;
}

/**
 * Fixed-window counter kept in memory. Good enough for a single node and
 * for tests; a Redis-backed version can implement the same interface later.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {
    if (max < 1 || windowMs < 1) throw new Error("invalid rate limit");
  }

  hit(key: string, nowMs: number = Date.now()): LimitResult {
    let w = this.windows.get(key);
    if (!w || nowMs - w.start >= this.windowMs) {
      w = { start: nowMs, count: 0 };
      this.windows.set(key, w);
    }
    if (w.count >= this.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((w.start + this.windowMs - nowMs) / 1000),
      );
      return { allowed: false, retryAfterSeconds };
    }
    w.count += 1;
    return { allowed: true, remaining: this.max - w.count };
  }

  /** Drop windows that have already expired so the map does not grow forever. */
  prune(nowMs: number = Date.now()): void {
    for (const [k, w] of this.windows) {
      if (nowMs - w.start >= this.windowMs) this.windows.delete(k);
    }
  }
}
