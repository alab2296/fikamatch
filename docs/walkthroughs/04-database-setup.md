# 04 - Database setup

**What changed:** the API can now create its own database tables, and tests get a clean database each.

1. `src/db/migrate.ts` reads the `.sql` files in `src/db/migrations/` in name order and runs the ones that have not run yet. It remembers them in a `schema_migrations` table, so running it twice does nothing the second time.
2. `0001_users.sql` is the first table: users with a unique email (case-insensitive), optional Swedish +46 phone, role, locale (sv/en) and a database-level check that the person is 18 or older.
3. `pnpm --filter @fikamatch/api migrate` applies migrations to the database in `DATABASE_URL`.
4. `test/helpers/db.ts` makes a throwaway schema per test file, runs the migrations inside it, and drops it afterwards, so tests never see each other's data.
5. `docker-compose.yml` host ports can be changed with `DB_PORT` and `REDIS_PORT` if 5432 or 6379 is already taken.

**Why:** rules like "no under-18 accounts" and "no duplicate emails" are safest when the database itself enforces them.
