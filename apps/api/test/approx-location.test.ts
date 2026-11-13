import { describe, expect, it } from "vitest";
import { approximate, distanceKm } from "../src/location/approx.js";

describe("approximate location", () => {
  it("snaps to the middle of a grid cell", () => {
    expect(approximate({ lat: 59.32931, lon: 18.06862 })).toEqual({
      lat: 59.325,
      lon: 18.065,
    });
  });

  it("gives the same answer for nearby points", () => {
    expect(approximate({ lat: 59.3251, lon: 18.0651 })).toEqual(
      approximate({ lat: 59.3299, lon: 18.0699 }),
    );
  });

  it("never returns the exact input", () => {
    const exact = { lat: 57.7089, lon: 11.9746 };
    expect(approximate(exact)).not.toEqual(exact);
  });

  it("rejects bad coordinates", () => {
    expect(() => approximate({ lat: 91, lon: 0 })).toThrow(RangeError);
    expect(() => approximate({ lat: 0, lon: Number.NaN })).toThrow(RangeError);
  });
});

describe("distanceKm", () => {
  it("is about 400 km from Stockholm to Gothenburg", () => {
    const d = distanceKm({ lat: 59.3293, lon: 18.0686 }, { lat: 57.7089, lon: 11.9746 });
    expect(d).toBeGreaterThan(390);
    expect(d).toBeLessThan(410);
  });

  it("is zero for the same point", () => {
    expect(distanceKm({ lat: 55.6, lon: 13 }, { lat: 55.6, lon: 13 })).toBe(0);
  });
});
