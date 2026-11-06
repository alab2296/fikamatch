import { loadConfig } from "../config.js";
import { connect } from "./client.js";
import { migrate } from "./migrate.js";

const config = loadConfig();
const client = await connect(config.DATABASE_URL);
try {
  const applied = await migrate(client);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Nothing to apply");
} finally {
  await client.end();
}
