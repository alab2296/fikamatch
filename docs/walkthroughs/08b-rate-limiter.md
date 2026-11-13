# 08b - Rate limiter building block

Baby steps:

1. Login and register are the doors people will hammer, so we want a limit on how many tries one key (for example an IP address) gets per time window.
2. `MemoryRateLimiter` counts hits per key. After the limit is reached it says "no" and tells you how many seconds to wait.
3. When the window is over the counter starts again.
4. It sits behind a tiny `RateLimiter` interface, so a Redis version can replace it later without touching callers.
5. Wiring it into the auth routes comes in the next step; this change only adds the tested piece.
