# 14 - Photo storage interface

**What changed:** photos now go through a small storage interface, with an in-memory version for development and tests.

1. `src/storage/provider.ts` defines `PhotoStorage`: `put`, `get`, `delete`, plus `signedUrl` and `verifyUrl` for short-lived links.
2. `src/storage/memory.ts` keeps photos in memory. A signed link carries the key, an expiry time and an HMAC signature made with a secret.
3. A link stops working when it expires, or when the key, expiry or signature is changed.
4. `delete` removes the object for real, which the later delete-my-account work relies on.
5. `test/storage.test.ts` covers the round trip, expiry, tampering and a wrong secret.

**Why:** the real EU-hosted object store can be added later without touching the upload code.
