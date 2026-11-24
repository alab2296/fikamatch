import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import { blockUser, listBlocked, unblockUser } from "./repository.js";

const FK_VIOLATION = "23503";
const uuid = z.string().uuid();
const body = z.object({ userId: uuid });

export function registerBlockRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  const guard = requireAuth(jwtSecret);
  const client = db as Parameters<typeof blockUser>[0];

  // Only your own list; there is deliberately no way to see who has blocked you.
  app.get("/blocks", { preHandler: guard }, async (req) => ({
    blocked: await listBlocked(client, req.auth!.sub),
  }));

  app.post("/blocks", { preHandler: guard }, async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "validation");
    const me = req.auth!.sub;
    if (parsed.data.userId === me) throw new ApiError(400, "validation");
    try {
      await blockUser(client, me, parsed.data.userId);
    } catch (err) {
      if ((err as { code?: string }).code === FK_VIOLATION)
        throw new ApiError(404, "not_found");
      throw err;
    }
    return reply.status(204).send();
  });

  app.delete("/blocks/:userId", { preHandler: guard }, async (req, reply) => {
    const id = uuid.safeParse((req.params as { userId: string }).userId);
    if (!id.success) throw new ApiError(404, "not_found");
    await unblockUser(client, req.auth!.sub, id.data);
    return reply.status(204).send();
  });
}
