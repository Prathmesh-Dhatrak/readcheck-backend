import { db } from "./client.ts";

export async function setupDatabase(): Promise<void> {
  // Create users table if not exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create blog table if not exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS blog (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database setup completed");
}