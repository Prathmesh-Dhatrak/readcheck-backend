import { Application, Status } from "./deps.ts";
import { config } from "./config.ts";
import { errorMiddleware } from "./middleware/error.ts";
import router from "./routes/index.ts";
import { setupDatabase } from "./db/setup.ts";

const app = new Application();

// Initialize database
try {
  await setupDatabase();
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