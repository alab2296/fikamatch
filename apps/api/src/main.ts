import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

buildApp(config)
  .listen({ port: config.PORT, host: "0.0.0.0" })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
