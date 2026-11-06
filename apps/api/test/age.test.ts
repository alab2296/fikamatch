import { describe, expect, it } from "vitest";
import { ageOn, isAdult } from "../src/auth/age.js";

const now = new Date("2026-06-15T12:00:00Z");

describe("age gate", () => {
  it("allows someone turning 18 today", () => {
    expect(isAdult("2008-06-15", now)).toBe(true);
  });

  it("blocks someone turning 18 tomorrow", () => {
    expect(isAdult("2008-06-16", now)).toBe(false);
  });

  it("counts a birthday earlier in the year", () => {
    expect(ageOn("2000-01-01", now)).toBe(26);
    expect(ageOn("2000-12-31", now)).toBe(25);
  });

  it("rejects impossible or malformed dates", () => {
    expect(isAdult("2000-02-30", now)).toBe(false);
    expect(isAdult("15/06/2000", now)).toBe(false);
    expect(isAdult("", now)).toBe(false);
  });

  it("handles leap-day birthdays", () => {
    expect(ageOn("2004-02-29", new Date("2026-02-28T00:00:00Z"))).toBe(21);
    expect(ageOn("2004-02-29", new Date("2026-03-01T00:00:00Z"))).toBe(22);
  });
});
