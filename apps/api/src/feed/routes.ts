import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import { getProfile } from "../profiles/repository.js";
import { candidateFeed } from "./repository.js";

const query = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

export function registerFeedRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  const guard = requireAuth(jwtSecret);
  const client = db as Parameters<typeof candidateFeed>[0] &
    Parameters<typeof getProfile>[0];

  app.get("/feed", { preHandler: guard }, async (req) => {
    const q = query.safeParse(req.query);
    if (!q.success) throw new ApiError(400, "validation");
    const me = req.auth!.sub;
    // A profile is needed before anyone can be shown to you.
    if (!(await getProfile(client, me))) throw new ApiError(404, "not_found");
    return { candidates: await candidateFeed(client, me, q.data.limit) };
  });
}
