import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../app.js";
import { requireAuth } from "../auth/guard.js";
import type { Queryable } from "../auth/register.js";
import { consentKinds, currentConsents, recordConsent } from "./repository.js";

const params = z.object({ kind: z.enum(consentKinds) });
const body = z.object({ granted: z.boolean() });

export function registerConsentRoutes(
  app: FastifyInstance,
  db: Queryable,
  jwtSecret: string,
) {
  const guard = requireAuth(jwtSecret);
  const client = db as Parameters<typeof currentConsents>[0];

  app.get("/me/consents", { preHandler: guard }, async (req) =>
    currentConsents(client, req.auth!.sub),
  );

  app.put("/me/consents/:kind", { preHandler: guard }, async (req) => {
    const p = params.safeParse(req.params);
    if (!p.success) throw new ApiError(404, "not_found");
    const b = body.safeParse(req.body);
    if (!b.success) throw new ApiError(400, "validation");

    const userId = req.auth!.sub;
    const before = await currentConsents(client, userId);
    // Only changes are recorded, so the history stays a list of real decisions.
    if (before[p.data.kind] !== b.data.granted) {
      await recordConsent(client, userId, p.data.kind, b.data.granted);
    }
    // Withdrawing AI consent also switches AI off on the profile straight away.
    if (p.data.kind === "ai_processing" && !b.data.granted) {
      await client.query("UPDATE profiles SET ai_enabled = false WHERE user_id = $1", [
        userId,
      ]);
    }
    return currentConsents(client, userId);
  });
}
