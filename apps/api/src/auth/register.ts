import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { z } from "zod";
import { ApiError } from "../app.js";
import { isLocale } from "../i18n/index.js";
import { ageOn, isAdult } from "./age.js";
import { hashPassword } from "./password.js";

export type Queryable = Pick<pg.Client, "query">;

const body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
  birthDate: z.string(),
  phone: z
    .string()
    .regex(/^\+46[0-9]{7,10}$/)
    .optional(),
  locale: z.string().refine(isLocale).optional(),
});

export function registerAuthRoutes(app: FastifyInstance, db: Queryable) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "validation");
    const input = parsed.data;
    if (ageOn(input.birthDate, new Date()) === null) throw new ApiError(400, "validation");
    if (!isAdult(input.birthDate)) throw new ApiError(403, "underage");

    const passwordHash = await hashPassword(input.password);
    try {
      const res = await db.query<{ id: string }>(
        `INSERT INTO users (email, phone, password_hash, birth_date, locale)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          input.email,
          input.phone ?? null,
          passwordHash,
          input.birthDate,
          input.locale ?? req.locale,
        ],
      );
      return reply
        .status(201)
        .send({
          id: res.rows[0]!.id,
          email: input.email,
          locale: input.locale ?? req.locale,
        });
    } catch (err) {
      if ((err as { code?: string }).code === "23505")
        throw new ApiError(409, "account_exists");
      throw err;
    }
  });
}
