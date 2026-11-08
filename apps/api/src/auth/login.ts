import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { verifyPassword } from "./password.js";
import type { Queryable } from "./register.js";
import { ACCESS_TTL_SECONDS, signToken } from "./tokens.js";

const body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

// A real hash of a throwaway password, so unknown emails cost the same time as wrong passwords.
const DUMMY_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export function registerLoginRoute(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  app.post("/auth/login", async (req) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "validation");
    const { email, password } = parsed.data;

    const res = await db.query<{
      id: string;
      role: string;
      password_hash: string;
      banned_at: Date | null;
    }>("SELECT id, role, password_hash, banned_at FROM users WHERE lower(email) = $1", [
      email,
    ]);
    const user = res.rows[0];
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw new ApiError(401, "invalid_credentials");
    if (user.banned_at) throw new ApiError(403, "forbidden");

    return {
      accessToken: signToken(
        { sub: user.id, role: user.role, kind: "access" },
        jwtSecret,
      ),
      refreshToken: signToken(
        { sub: user.id, role: user.role, kind: "refresh" },
        jwtSecret,
      ),
      expiresIn: ACCESS_TTL_SECONDS,
    };
  });
}
