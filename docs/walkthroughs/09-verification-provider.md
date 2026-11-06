# 09 - Verification provider

**What changed:** there is now a small interface for checking who a person is, plus a fake version for development.

1. `src/verification/provider.ts` defines `VerificationProvider` with two steps: `start(userId)` returns a session id, and `check(sessionId)` says pending, verified or failed.
2. `src/verification/fake.ts` is an in-memory fake. It says "verified" on the first check, and a test can call `failNext()` to see the failure path.
3. A verified result carries only a hash of the personal number, never the number itself.
4. `test/verification.test.ts` covers success, stable hashes, unknown sessions and forced failure.

**Why:** real BankID needs a contract and certificates. The rest of the app can be built against this interface now, and the real provider drops in later.
