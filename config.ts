import { load } from "./deps.ts";

// Load environment variables
await load({ export: true });

export const config = {
    PORT: Number(Deno.env.get("PORT")) || 8000,
    DB_URL: Deno.env.get("DB_URL") || "postgres://user:pass@localhost:5432/read-check-db",
    JWT_SECRET: Deno.env.get("JWT_SECRET") || "your-secret-key",
    OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") || "",
    ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY") || "",
    ENV: Deno.env.get("ENV") || "development"
};