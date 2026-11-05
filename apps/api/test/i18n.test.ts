import { describe, expect, it } from "vitest";
import { ApiError, buildApp } from "../src/app.js";
import { detectLocale, translate } from "../src/i18n/index.js";
import en from "../src/i18n/messages/en.json" with { type: "json" };
import sv from "../src/i18n/messages/sv.json" with { type: "json" };

describe("detectLocale", () => {
  it("defaults to Swedish", () => {
    expect(detectLocale(undefined)).toBe("sv");
    expect(detectLocale("fr-FR")).toBe("sv");
  });
  it("picks English when preferred", () => {
    expect(detectLocale("en-GB,en;q=0.9")).toBe("en");
  });
  it("respects q weights and skips unsupported languages", () => {
    expect(detectLocale("de,en;q=0.8,sv;q=0.5")).toBe("en");
    expect(detectLocale("en;q=0.3,sv;q=0.9")).toBe("sv");
    expect(detectLocale("en;q=0,fr")).toBe("sv");
  });
});

describe("message files", () => {
  it("have the same keys in both languages", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(sv).sort());
  });
  it("translate by locale", () => {
    expect(translate("en", "error.not_found")).toBe("Not found.");
    expect(translate("sv", "error.not_found")).toBe("Sidan hittades inte.");
  });
});

describe("error responses", () => {
  const app = buildApp();
  app.get("/boom", async () => {
    throw new Error("secret details");
  });
  app.get("/nope", async () => {
    throw new ApiError(403, "forbidden");
  });
  app.post("/json", async () => ({ ok: true }));

  it("translates 404 using Accept-Language", async () => {
    const sv = await app.inject({ method: "GET", url: "/missing" });
    expect(sv.statusCode).toBe(404);
    expect(sv.json()).toEqual({ code: "not_found", message: "Sidan hittades inte." });
    const en = await app.inject({
      method: "GET",
      url: "/missing",
      headers: { "accept-language": "en" },
    });
    expect(en.json()).toEqual({ code: "not_found", message: "Not found." });
  });

  it("hides internal error details", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/boom",
      headers: { "accept-language": "en" },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().code).toBe("internal");
    expect(res.body).not.toContain("secret");
  });

  it("maps ApiError to its code and status", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("forbidden");
  });

  it("returns a translated validation error for bad JSON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/json",
      headers: { "content-type": "application/json" },
      payload: "{bad",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("validation");
  });
});
