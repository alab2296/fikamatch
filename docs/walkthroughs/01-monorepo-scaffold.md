# 01 - Monorepo scaffold

**What changed:** the project now has a skeleton that builds, tests and checks itself.

1. **pnpm workspace**: one repo, several packages. `pnpm-workspace.yaml` says packages live in `apps/` and `packages/`.
2. **apps/api**: a tiny Fastify server with one route, `GET /health`. `buildApp()` creates the app without starting it, so tests can call it directly with `app.inject`.
3. **Checks**: Prettier (formatting), ESLint (code mistakes), TypeScript (types), vitest (tests). The root scripts run them across all packages.
4. **docker-compose.yml**: Postgres with PostGIS and Redis for local work.
5. **CI**: the GitHub workflow runs every check on each pull request, with a PostGIS database ready.
6. **PR template**: reminds me what to write on every pull request.

**Why:** a green, boring foundation first means every later change can be checked automatically.
