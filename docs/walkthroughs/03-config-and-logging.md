# 03 - Config and logging

**What changed:** the API now reads its settings from environment variables and checks them at startup.

1. `src/config.ts` describes every setting with zod (port, log level, database URL, secret...). `loadConfig()` reads them, fills defaults, and throws a clear error if something is wrong, such as a missing or too-short `JWT_SECRET`.
2. `src/main.ts` calls `loadConfig()` first, so a bad setup fails immediately instead of later.
3. `buildApp()` turns on Fastify's logger at the configured level and hides the `Authorization` and `Cookie` headers from logs. In tests the logger is silent.
4. `test/config.test.ts` checks defaults, string-to-number conversion and the failures.

**Why:** secrets and URLs belong in `.env`, and a typo in them should be caught on boot.
