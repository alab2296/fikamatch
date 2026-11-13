import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { requireAuth, requireRole } from "../src/auth/guard.js";
import { signToken } from "../src/auth/tokens.js";

const secret = "a-test-secret-long-enough";

function appWithRoutes() {
  const app = buildApp();
  app.get("/me", { preHandler: requireAuth(secret) }, async (req) => ({
    id: req.auth!.sub,
  }));
  app.get("/admin", { preHandler: requireRole(secret, "admin") }, async () => ({
    ok: true,
  }));
  return app;
}

const bearer = (role: string, kind: "access" | "refresh" = "access") => ({
  authorization: `Bearer ${signToken({ sub: "u1", role, kind }, secret)}`,
});

describe("auth guard", () => {
  it("lets a valid access token through", async () => {
    const res = await appWithRoutes().inject({
      url: "/me",
      headers: bearer("user"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "u1" });
  });

  it("rejects a missing header with a translated 401", async () => {
    const res = await appWithRoutes().inject({
      url: "/me",
      headers: { "accept-language": "sv" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("unauthorized");
    expect(res.json().message).not.toBe("You need to sign in.");
  });

  it("rejects refresh tokens, garbage and wrong secrets", async () => {
    const app = appWithRoutes();
    for (const authorization of [
      bearer("user", "refresh").authorization,
      "Bearer nonsense",
      "Basic abc",
      `Bearer ${signToken({ sub: "u1", role: "user", kind: "access" }, "another-secret-value-x")}`,
    ]) {
      const res = await app.inject({ url: "/me", headers: { authorization } });
      expect(res.statusCode).toBe(401);
    }
  });

  it("enforces roles", async () => {
    const app = appWithRoutes();
    const user = await app.inject({ url: "/admin", headers: bearer("user") });
    expect(user.statusCode).toBe(403);
    const admin = await app.inject({ url: "/admin", headers: bearer("admin") });
    expect(admin.statusCode).toBe(200);
    const anon = await app.inject({ url: "/admin" });
    expect(anon.statusCode).toBe(401);
  });
});
