# 8a - Auth guard

Two small helpers in `apps/api/src/auth/guard.ts`:

- `requireAuth(secret)` reads `Authorization: Bearer <token>`, checks it is a valid, unexpired access token and puts the claims on `req.auth`. Anything else is a 401.
- `requireRole(secret, "admin")` does the same and then checks the role, answering 403 if it does not match.

Attach them to a route with `{ preHandler: requireAuth(secret) }`. Refresh tokens are refused here on purpose. Rate limits on the auth routes come in the next step.
