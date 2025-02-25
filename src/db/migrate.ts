import { ClientPostgreSQL } from "../../deps.ts";
import { config } from "../../config.ts";
import { Pool } from "../../deps.ts";

// Process command line arguments
const args = Deno.args;
const command = args[0]?.toLowerCase() || "";

// Initialize the client
const client = new ClientPostgreSQL(config.DB_URL);

// For direct database queries
const pool = new Pool(config.DB_URL, 2);

// Table name constant - Nessie appears to be using this name
const MIGRATIONS_TABLE = "nessie_migrations";

// Ensure the nessie_migrations table exists with proper schema
async function ensureMigrationsTableExists() {
  const conn = await pool.connect();
  try {
    const tableExistsResult = await conn.queryObject<{ exists: boolean }>(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${MIGRATIONS_TABLE}') as exists`
    );
    
    if (!tableExistsResult.rows[0]?.exists) {
      console.log(`Creating ${MIGRATIONS_TABLE} table...`);
      // Create table with the schema Nessie expects
      await conn.queryArray(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          file_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log(`${MIGRATIONS_TABLE} table created.`);
    } else {
      // Check if file_name column exists
      const columnExistsResult = await conn.queryObject<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = '${MIGRATIONS_TABLE}' AND column_name = 'file_name'
        ) as exists`
      );
      
      if (!columnExistsResult.rows[0]?.exists) {
        console.log("Adding missing file_name column to migrations table...");
        await conn.queryArray(
          `ALTER TABLE ${MIGRATIONS_TABLE} ADD COLUMN file_name VARCHAR(100)`
        );
        console.log("Column added.");
      }
    }
  } finally {
    conn.release();
  }
}

// Function to create a migration file
async function createMigration(name: string) {
  if (!name) {
    console.error("Please provide a migration name");
    Deno.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "").split("T")[0] + "T" + 
                   new Date().toISOString().replace(/[:.]/g, "").split("T")[1].substring(0, 6);
  const filename = `${timestamp}_${name.replace(/\s+/g, "_").toLowerCase()}.ts`;
  const filepath = `./src/db/migrations/${filename}`;

  const template = `import { AbstractMigration } from "../../../deps.ts";

export default class extends AbstractMigration {
  /** Migration description */
  name = "${name}";

  /** Runs on migrate */
  async up(): Promise<void> {
    // Write your migration code here
    // Example:
    // await this.client.queryArray(\`
    //   ALTER TABLE my_table ADD COLUMN new_column TEXT;
    // \`);
  }

  /** Runs on rollback */
  async down(): Promise<void> {
    // Revert the changes made in up()
    // Example:
    // await this.client.queryArray(\`
    //   ALTER TABLE my_table DROP COLUMN new_column;
    // \`);
  }
}
`;

  try {
    await Deno.mkdir("./src/db/migrations", { recursive: true });
    await Deno.writeTextFile(filepath, template);
    console.log(`Migration file created: ${filepath}`);
  } catch (error) {
    console.error(`Failed to create migration file: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

// Initialize the database with our UUID convert migration
async function initializeWithUUIDMigration() {
  const conn = await pool.connect();
  try {
    // First check if migration was already run
    const migrationExists = await conn.queryObject<{ exists: boolean }>(
      `SELECT EXISTS (SELECT FROM ${MIGRATIONS_TABLE} WHERE name = 'Convert to UUID') as exists`
    );
    
    if (migrationExists.rows[0]?.exists) {
      console.log("UUID migration already applied.");
      return;
    }
    
    console.log("Running initial UUID migration directly...");
    
    // Enable UUID extension
    await conn.queryArray(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create new tables with UUID
    await conn.queryArray(`
      -- Create new users table with UUID
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create new blog table with UUID
      CREATE TABLE IF NOT EXISTS blog (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Record that we've run this migration
    await conn.queryArray(`
      INSERT INTO ${MIGRATIONS_TABLE} (name, file_name) 
      VALUES ('Convert to UUID', '20250225T000000_convert_to_uuid.ts')
    `);
    
    console.log("UUID migration complete.");
  } catch (error) {
    console.error("Error running UUID migration:", error);
    throw error;
  } finally {
    conn.release();
  }
}

// Main function
async function main() {
  try {
    // Ensure the migrations table exists regardless of command
    await ensureMigrationsTableExists();
    
    switch (command) {
      case "init":
        await initializeWithUUIDMigration();
        console.log("Database initialized with UUID tables.");
        break;
        
      case "up":
      case "migrate":
        try {
          const numApplied = await client.migrate(10);
          console.log(`Applied ${numApplied} migrations`);
        } catch (error) {
          console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
          
          // If no migrations are found, suggest initializing
          if (error instanceof Error && 
             (error.message.includes("no migrations found") || 
              error.message.includes("migrations folder does not exist"))) {
            console.log("\nTip: If this is a new database, run 'init' command first:");
            console.log("deno run --allow-read --allow-write --allow-net --allow-env --no-lock src/db/migrate.ts init");
          }
          
          Deno.exit(1);
        }
        break;

      case "down":
      case "rollback":
        try {
          const numRolledBack = await client.rollback(1);
          console.log(`Rolled back ${numRolledBack} migrations`);
        } catch (error) {
          console.error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
          Deno.exit(1);
        }
        break;

      case "create":
        await createMigration(args.slice(1).join(" "));
        break;

      case "status":
        try {
          // Use the pool directly for database queries
          const conn = await pool.connect();
          try {
            // Get latest migration
            const result = await conn.queryObject<{ name: string; file_name: string; created_at: Date }>(
              `SELECT name, file_name, created_at FROM ${MIGRATIONS_TABLE} ORDER BY id DESC LIMIT 1`
            );
            
            if (result.rows.length === 0) {
              console.log("No migrations have been applied yet");
            } else {
              const migration = result.rows[0];
              console.log(`Latest migration: ${migration.name}`);
              console.log(`File: ${migration.file_name || "Not specified"}`);
              console.log(`Applied at: ${migration.created_at}`);
            }
          } finally {
            // Release the connection
            conn.release();
          }
        } catch (error) {
          console.error(`Failed to get migration status: ${error instanceof Error ? error.message : String(error)}`);
          Deno.exit(1);
        }
        break;

      default:
        console.log(`
Migration CLI Usage:
  deno run --allow-read --allow-write --allow-net --allow-env --no-lock src/db/migrate.ts [command]

Commands:
  init                  Initialize database with UUID tables
  up, migrate           Run all pending migrations
  down, rollback        Rollback the most recent migration
  create [name]         Create a new migration file
  status                Show the latest applied migration
`);
        break;
    }
  } finally {
    // Always close the pool when done
    await pool.end();
  }
}

if (import.meta.main) {
  await main();
}