# 07a - Signed access and refresh tokens

**What changed:** there are now helpers that make and check login tokens. The login endpoint itself comes next.

1. `src/auth/tokens.ts` has `signToken`, which builds a small signed token (HS256) holding the user id, the role, the kind and the expiry.
2. There are two kinds. An access token lasts 15 minutes. A refresh token lasts 30 days.
3. `verifyToken` checks the signature with a constant-time compare, then the expiry, then that the token is the kind the caller expected.
4. It never throws. It returns `ok: true` with the claims, or `ok: false` with a reason: malformed, bad signature, expired or wrong kind.
5. The clock can be passed in, so tests do not have to wait for real time to pass.

**Why:** short-lived access tokens limit the damage if one leaks, and the refresh token lets people stay signed in. Keeping the helpers pure makes them easy to test before any route uses them.
