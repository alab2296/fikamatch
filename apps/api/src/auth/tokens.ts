import { createHmac, timingSafeEqual } from "node:crypto";

export type TokenKind = "access" | "refresh";

export interface TokenClaims {
  sub: string;
  role: string;
  kind: TokenKind;
  iat: number;
  exp: number;
}

export type VerifyResult =
  | { ok: true; claims: TokenClaims }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "wrong_kind" };

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
  "base64url",
);

function sign(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function signToken(
  input: { sub: string; role: string; kind: TokenKind },
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): string {
  const ttl = input.kind === "access" ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS;
  const claims: TokenClaims = { ...input, iat: now, exp: now + ttl };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const data = `${HEADER}.${body}`;
  return `${data}.${sign(data, secret).toString("base64url")}`;
}

export function verifyToken(
  token: string,
  secret: string,
  expectedKind: TokenKind,
  now: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== HEADER)
    return { ok: false, reason: "malformed" };
  const [header, body, sig] = parts as [string, string, string];

  const given = Buffer.from(sig, "base64url");
  const wanted = sign(`${header}.${body}`, secret);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return { ok: false, reason: "bad_signature" };
  }

  let claims: TokenClaims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenClaims;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof claims.sub !== "string" ||
    typeof claims.role !== "string" ||
    typeof claims.exp !== "number" ||
    typeof claims.iat !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (claims.exp <= now) return { ok: false, reason: "expired" };
  if (claims.kind !== expectedKind) return { ok: false, reason: "wrong_kind" };
  return { ok: true, claims };
}
