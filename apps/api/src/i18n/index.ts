import en from "./messages/en.json" with { type: "json" };
import sv from "./messages/sv.json" with { type: "json" };

export const locales = ["sv", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "sv";

export type MessageKey = keyof typeof sv;

const catalogs: Record<Locale, Record<string, string>> = { sv, en };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Picks the best supported locale from an Accept-Language header, Swedish by default. */
export function detectLocale(header: string | undefined): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0] ?? "", weight, index };
    })
    .filter((x) => x.lang && Number.isFinite(x.weight) && x.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { lang } of ranked) {
    if (isLocale(lang)) return lang;
  }
  return defaultLocale;
}

export function translate(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs[defaultLocale][key] ?? key;
}
