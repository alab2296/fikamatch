import { randomUUID } from "node:crypto";
import pg from "pg";
import { migrate } from "../../src/db/migrate.js";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgres://fika:fika@localhost:5432/fikamatch";

export interface TestDb {
  client: pg.Client;
  schema: string;
  drop(): Promise<void>;
}

/** Creates a throwaway schema, points the connection at it and runs all migrations. */
export async function createTestDb(): Promise<TestDb> {
  const schema = `t_${randomUUID().replaceAll("-", "")}`;
  const client = new pg.Client({ connectionString: testDatabaseUrl });
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}, public`);
  await migrate(client);
  return {
    client,
    schema,
    async drop() {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA ${schema} CASCADE`);
      await client.end();
    },
  };
}
