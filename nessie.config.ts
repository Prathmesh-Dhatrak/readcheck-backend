import type { NessieConfig } from "./deps.ts";
import { ClientPostgreSQL } from "./deps.ts";
import { config } from "./config.ts";

const nessieConfig: NessieConfig = {
  client: new ClientPostgreSQL(config.DB_URL),
  migrationFolders: ["./src/db/migrations"],
  seedFolders: ["./src/db/seeds"],
};

export default nessieConfig;