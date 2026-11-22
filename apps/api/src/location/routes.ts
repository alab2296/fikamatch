import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import { clearLocation, setLocation } from "./repository.js";

const body = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export function registerLocationRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  const guard = requireAuth(jwtSecret);
  const client = db as Parameters<typeof setLocation>[0];

  // The reply never echoes coordinates back, exact or rounded.
  app.put("/profile/me/location", { preHandler: guard }, async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "validation");
    if (!(await setLocation(client, req.auth!.sub, parsed.data)))
      throw new ApiError(404, "not_found");
    return reply.status(204).send();
  });

  app.delete("/profile/me/location", { preHandler: guard }, async (req, reply) => {
    if (!(await clearLocation(client, req.auth!.sub)))
      throw new ApiError(404, "not_found");
    return reply.status(204).send();
  });
}
