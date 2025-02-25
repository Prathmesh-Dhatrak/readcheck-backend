import { Application, Status, Pool } from "./deps.ts";
import { config } from "./config.ts";
import { setupDatabase } from "./src/db/setup.ts";
import { ClientPostgreSQL } from "./deps.ts";
import { errorMiddleware } from "./src/middleware/error.ts";
import router from "./src/routes/index.ts";

const app = new Application();

// Ensure the nessie_migrations table exists
async function ensureMigrationsTableExists() {
  const pool = new Pool(config.DB_URL, 2);
  const MIGRATIONS_TABLE = "nessie_migrations";
  
  try {
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
  } finally {
    await pool.end();
  }
}

// Initialize database and run migrations
try {
  console.log("Setting up database...");
  await setupDatabase();
  
  // Run migrations if not in production (in production, migrations should be run separately)
  if (config.ENV !== "production") {
    console.log("Running migrations...");
    
    // First ensure migrations table exists
    await ensureMigrationsTableExists();
    
    const client = new ClientPostgreSQL(config.DB_URL);
    try {
      // Use the client directly for migrations
      const result = await client.migrate(10);
      
      // Handle undefined result gracefully
      if (result === undefined || result === 0) {
        console.log("No migrations were applied");
      } else {
        console.log(`Applied ${result} migrations`);
      }
    } catch (error) {
      console.error("Migration failed:", error);
    }
  }
} catch (error) {
  console.error("Database setup failed:", error);
  Deno.exit(1);
}

// Global error handling
app.use(errorMiddleware);

// CORS middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = Status.OK;
    return;
  }
  
  await next();
});

// Basic health check endpoint
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = { status: "healthy" };
  } else {
    await next();
  }
});

// Register routes
app.use(router.routes());
app.use(router.allowedMethods());

// 404 handler
app.use((ctx) => {
  ctx.response.status = Status.NotFound;
  ctx.response.body = { status: "error", message: "Not found" };
});

// Start the server
console.log(`Server starting on port ${config.PORT}...`);
await app.listen({ port: config.PORT });