import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "../app.js";
import { verifyToken, type TokenClaims } from "./tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: TokenClaims;
  }
}

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

/** Requires a valid access token in the Authorization header. */
export function requireAuth(secret: string): Guard {
  return async (req) => {
    const header = req.headers.authorization;
    const match = header ? /^Bearer (\S+)$/.exec(header) : null;
    if (!match) throw new ApiError(401, "unauthorized");
    const result = verifyToken(match[1]!, secret, "access");
    if (!result.ok) throw new ApiError(401, "unauthorized");
    req.auth = result.claims;
  };
}

/** Requires a valid access token whose role is one of the given roles. */
export function requireRole(secret: string, ...roles: string[]): Guard {
  const authenticate = requireAuth(secret);
  return async (req, reply) => {
    await authenticate(req, reply);
    if (!roles.includes(req.auth!.role)) throw new ApiError(403, "forbidden");
  };
}
