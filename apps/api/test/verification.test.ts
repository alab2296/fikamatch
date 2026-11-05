import { describe, expect, it } from "vitest";
import { FakeVerificationProvider } from "../src/verification/fake.js";

describe("FakeVerificationProvider", () => {
  it("verifies a started session", async () => {
    const p = new FakeVerificationProvider();
    const { sessionId } = await p.start("user-1");
    const r = await p.check(sessionId);
    expect(r.status).toBe("verified");
    expect(r.personalNumberHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives the same hash for the same user and a different one for another", async () => {
    const p = new FakeVerificationProvider();
    const a1 = await p.check((await p.start("a")).sessionId);
    const a2 = await p.check((await p.start("a")).sessionId);
    const b = await p.check((await p.start("b")).sessionId);
    expect(a1.personalNumberHash).toBe(a2.personalNumberHash);
    expect(a1.personalNumberHash).not.toBe(b.personalNumberHash);
  });

  it("fails an unknown session", async () => {
    const p = new FakeVerificationProvider();
    expect((await p.check("nope")).status).toBe("failed");
  });

  it("can be told to fail once", async () => {
    const p = new FakeVerificationProvider();
    p.failNext();
    const bad = await p.check((await p.start("u")).sessionId);
    expect(bad.status).toBe("failed");
    expect(bad.personalNumberHash).toBeUndefined();
    const ok = await p.check((await p.start("u")).sessionId);
    expect(ok.status).toBe("verified");
  });
});
