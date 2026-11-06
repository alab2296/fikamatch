import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().url().default("postgres://fika:fika@localhost:5433/fikamatch"),
  REDIS_URL: z.string().url().default("redis://localhost:6380"),
  JWT_SECRET: z.string().min(16),
  LLM_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${problems}`);
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.JWT_SECRET === "change-me-please-now"
  ) {
    throw new Error("Invalid configuration: JWT_SECRET must not be the example value");
  }
  return parsed.data;
}
