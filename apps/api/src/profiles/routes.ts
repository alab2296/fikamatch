import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import { deleteProfile, getProfile, saveProfile } from "./repository.js";

const gender = z.enum(["woman", "man", "nonbinary", "other"]);

const body = z.object({
  displayName: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(500).default(""),
  gender,
  lookingFor: z.array(gender).max(4).default([]),
  cityId: z.number().int().positive(),
  aiEnabled: z.boolean().optional(),
});

const FK_VIOLATION = "23503";

export function registerProfileRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  const guard = requireAuth(jwtSecret);
  // Repository functions take a Client; Queryable only needs query().
  const client = db as Parameters<typeof getProfile>[0];

  app.get("/profile/me", { preHandler: guard }, async (req) => {
    const profile = await getProfile(client, req.auth!.sub);
    if (!profile) throw new ApiError(404, "not_found");
    return profile;
  });

  app.put("/profile/me", { preHandler: guard }, async (req) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "validation");
    const input = parsed.data;
    try {
      return await saveProfile(client, req.auth!.sub, {
        ...input,
        lookingFor: [...new Set(input.lookingFor)],
      });
    } catch (err) {
      if ((err as { code?: string }).code === FK_VIOLATION)
        throw new ApiError(400, "validation");
      throw err;
    }
  });

  app.delete("/profile/me", { preHandler: guard }, async (req, reply) => {
    const removed = await deleteProfile(client, req.auth!.sub);
    if (!removed) throw new ApiError(404, "not_found");
    return reply.status(204).send();
  });
}
