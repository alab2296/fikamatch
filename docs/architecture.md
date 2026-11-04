# Architecture

```
Flutter app ──HTTPS/WS──> Fastify API ──> Postgres 16 + PostGIS
Admin web (React) ──HTTPS──┘     │──────> Redis 7 (rate limits, pub/sub, presence)
                                 └──────> LLM provider wrapper (swappable)
```

- **Monorepo** (pnpm): `apps/api`, later `apps/admin`, `packages/*` for shared code and the
  generated API contract.
- **API**: Fastify 5, zod for validation, one folder per module (auth, profiles, discovery,
  chat, safety, ai, admin). Routes stay thin; logic lives in services; SQL lives in repositories.
- **Realtime**: WebSocket gateway authenticated with the same JWT; Redis pub/sub fans messages out.
- **AI**: a small `LlmProvider` interface with an Anthropic implementation and a fake for tests.
  A cheap model handles routine calls, a stronger one only where quality matters. Every call is
  written to an audit table. Features are gated by flags and per-user consent.
- **Verification**: `VerificationProvider` interface; `FakeVerificationProvider` now, BankID later.
- **i18n**: message keys in `sv.json` and `en.json`; AI prompts take the user's language.
- **Contract**: an OpenAPI file is the source for the generated Dart client.
- **Testing**: vitest; data-integrity tests run against real Postgres, one schema per test.
