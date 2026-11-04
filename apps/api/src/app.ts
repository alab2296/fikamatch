import Fastify from "fastify";
import type { Config } from "./config.js";

export function buildApp(config?: Pick<Config, "LOG_LEVEL">) {
  const app = Fastify({
    logger: {
      level: config?.LOG_LEVEL ?? "silent",
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
