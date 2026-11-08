import Fastify from "fastify";
import type { Config } from "./config.js";
import { registerLoginRoute } from "./auth/login.js";
import { registerAuthRoutes, type Queryable } from "./auth/register.js";
import {
  defaultLocale,
  detectLocale,
  translate,
  type Locale,
  type MessageKey,
} from "./i18n/index.js";

declare module "fastify" {
  interface FastifyRequest {
    locale: Locale;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export function buildApp(
  config?: Pick<Config, "LOG_LEVEL">,
  deps: { db?: Queryable; jwtSecret?: string } = {},
) {
  const app = Fastify({
    logger: {
      level: config?.LOG_LEVEL ?? "silent",
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });

  app.decorateRequest("locale", defaultLocale);
  app.addHook("onRequest", async (req) => {
    req.locale = detectLocale(req.headers["accept-language"]);
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send(errorBody(req.locale, "not_found"));
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      return reply.status(err.statusCode).send(errorBody(req.locale, err.code));
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) {
      req.log.error(err);
      return reply.status(500).send(errorBody(req.locale, "internal"));
    }
    return reply.status(status).send(errorBody(req.locale, "validation"));
  });

  app.get("/health", async () => ({ status: "ok" }));

  if (deps.db) registerAuthRoutes(app, deps.db);
  if (deps.db && deps.jwtSecret) registerLoginRoute(app, deps.db, deps.jwtSecret);

  return app;
}

function errorBody(locale: Locale, code: string) {
  return { code, message: translate(locale, `error.${code}` as MessageKey) };
}
