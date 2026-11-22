import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import { getPreferences, savePreferences } from "./repository.js";

const body = z
  .object({
    minAge: z.number().int().min(18).max(120),
    maxAge: z.number().int().min(18).max(120),
    maxDistanceKm: z.number().int().min(1).max(500),
  })
  .refine((v) => v.minAge <= v.maxAge);

export function registerPreferenceRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  const guard = requireAuth(jwtSecret);
  const client = db as Parameters<typeof getPreferences>[0];

  app.get("/preferences/me", { preHandler: guard }, async (req) => {
    const prefs = await getPreferences(client, req.auth!.sub);
    if (!prefs) throw new ApiError(404, "not_found");
    return prefs;
  });

  app.put("/preferences/me", { preHandler: guard }, async (req) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "validation");
    return savePreferences(client, req.auth!.sub, parsed.data);
  });
}
