import { describe, expect, it } from "vitest";
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  signToken,
  verifyToken,
} from "../src/auth/tokens.js";

const secret = "a-test-secret-long-enough";
const user = { sub: "user-1", role: "user" };

describe("tokens", () => {
  it("round-trips an access token", () => {
    const t = signToken({ ...user, kind: "access" }, secret, 1000);
    const r = verifyToken(t, secret, "access", 1001);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.claims.sub).toBe("user-1");
      expect(r.claims.exp).toBe(1000 + ACCESS_TTL_SECONDS);
    }
  });

  it("gives refresh tokens a longer life", () => {
    const t = signToken({ ...user, kind: "refresh" }, secret, 1000);
    const r = verifyToken(t, secret, "refresh", 1000);
    expect(r.ok && r.claims.exp).toBe(1000 + REFRESH_TTL_SECONDS);
  });

  it("rejects an expired token", () => {
    const t = signToken({ ...user, kind: "access" }, secret, 1000);
    expect(verifyToken(t, secret, "access", 1000 + ACCESS_TTL_SECONDS)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a token signed with another secret", () => {
    const t = signToken({ ...user, kind: "access" }, "some-other-secret-value", 1000);
    expect(verifyToken(t, secret, "access", 1001)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a tampered payload", () => {
    const t = signToken({ ...user, kind: "access" }, secret, 1000);
    const [h, , s] = t.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        sub: "admin",
        role: "admin",
        kind: "access",
        iat: 1000,
        exp: 99999,
      }),
    ).toString("base64url");
    expect(verifyToken(`${h}.${forged}.${s}`, secret, "access", 1001).ok).toBe(false);
  });

  it("does not accept a refresh token as an access token", () => {
    const t = signToken({ ...user, kind: "refresh" }, secret, 1000);
    expect(verifyToken(t, secret, "access", 1001)).toEqual({
      ok: false,
      reason: "wrong_kind",
    });
  });

  it("rejects garbage", () => {
    expect(verifyToken("nope", secret, "access")).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifyToken("a.b.c", secret, "access").ok).toBe(false);
  });
});
