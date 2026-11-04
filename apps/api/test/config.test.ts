import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const base = { JWT_SECRET: "a-secret-that-is-long-enough" };

describe("loadConfig", () => {
  it("fills in defaults", () => {
    const c = loadConfig(base);
    expect(c.PORT).toBe(3000);
    expect(c.LOG_LEVEL).toBe("info");
  });

  it("reads numbers from strings", () => {
    expect(loadConfig({ ...base, PORT: "8080" }).PORT).toBe(8080);
  });

  it("rejects a missing or short secret", () => {
    expect(() => loadConfig({})).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });

  it("rejects a bad port", () => {
    expect(() => loadConfig({ ...base, PORT: "99999" })).toThrow(/PORT/);
  });
});
