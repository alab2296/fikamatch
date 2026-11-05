import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Client } from "pg";

export const defaultMigrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

/**
 * Applies every `*.sql` file in the folder that has not run yet, in name order.
 * Each file runs in its own transaction and is recorded in `schema_migrations`.
 * Returns the names that were applied this time.
 */
export async function migrate(
  client: Client,
  dir: string = defaultMigrationsDir,
): Promise<string[]> {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const done = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
  const seen = new Set(done.rows.map((r) => r.name));
  const applied: string[] = [];
  for (const file of files) {
    if (seen.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
    applied.push(file);
  }
  return applied;
}
