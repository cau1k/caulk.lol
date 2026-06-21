import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../.env" });
config({ path: "../../apps/server/.env" });

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "sqlite",
  driver: "d1-http",
});
