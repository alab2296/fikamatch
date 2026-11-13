# FikaMatch

A safety-first dating app for Sweden, built around low-pressure fika meetups.

## How the pieces fit

```
Flutter app ──HTTPS/WS──> Fastify API ──> Postgres 16 + PostGIS
Admin web (React) ──HTTPS──┘     │──────> Redis 7 (rate limits, pub/sub, presence)
                                 └──────> LLM provider wrapper (swappable)
```

More detail lives in [`docs/architecture.md`](docs/architecture.md).

## Principles

- Swedish first, English second. All user-facing text comes from translation files.
- 18+ only, with identity verification behind an interface (a fake one for now).
- Approximate location only; exact positions are never stored.
- AI features are labelled, optional, consent-based and audit logged.
- Users can export their data and really delete it.

## Running it locally

You need Node 22, pnpm and Docker (Colima works fine on macOS).

```bash
docker compose up -d
cp .env.example .env
npx pnpm@10.28.0 install
npx pnpm@10.28.0 test
```

## Where to read next

- [`docs/build-plan.md`](docs/build-plan.md): what is done and what is next
- [`docs/requirements.md`](docs/requirements.md) and [`docs/data-model.md`](docs/data-model.md)
- [`docs/walkthroughs/`](docs/walkthroughs): plain-language notes for each merged step
