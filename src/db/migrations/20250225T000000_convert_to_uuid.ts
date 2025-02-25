import { AbstractMigration } from "../../../deps.ts";

export default class extends AbstractMigration {
  /** Migration description */
  name = "Convert to UUID";

  /** Runs on migrate */
  async up(): Promise<void> {
    // Enable UUID extension
    await this.client.queryArray(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create new tables with UUID
    await this.client.queryArray(`
      -- Create new users table with UUID
      CREATE TABLE users_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create new blog table with UUID
      CREATE TABLE blog_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users_new(id),
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Copy data from old tables to new tables (if they exist)
    await this.client.queryArray(`
      DO $$
      BEGIN
        -- Check if the old tables exist
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
          -- Insert existing users with generated UUIDs
          INSERT INTO users_new (id, email, password_hash, created_at)
          SELECT uuid_generate_v4(), email, password_hash, created_at FROM users;
          
          -- Create a temporary table to map old IDs to new UUIDs
          CREATE TEMP TABLE id_mapping AS
          SELECT u.id AS old_id, un.id AS new_id
          FROM users u
          JOIN users_new un ON u.email = un.email;
          
          -- Insert blog entries with corresponding user UUIDs
          IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blog') THEN
            INSERT INTO blog_new (id, user_id, url, title, question, answer, is_read, created_at)
            SELECT 
              uuid_generate_v4(), 
              m.new_id, 
              b.url, 
              b.title, 
              b.question, 
              b.answer, 
              b.is_read, 
              b.created_at
            FROM blog b
            JOIN id_mapping m ON b.user_id = m.old_id;
          END IF;
          
          -- Drop temporary table
          DROP TABLE id_mapping;
        END IF;
      END $$;
    `);

    // Drop old tables and rename new tables
    await this.client.queryArray(`
      -- Drop old tables if they exist
      DROP TABLE IF EXISTS blog;
      DROP TABLE IF EXISTS users;
      
      -- Rename new tables to original names
      ALTER TABLE users_new RENAME TO users;
      ALTER TABLE blog_new RENAME TO blog;
    `);
  }

  /** Runs on rollback */
  async down(): Promise<void> {
    // Backup data to temp tables
    await this.client.queryArray(`
      -- Create backup tables with serial IDs
      CREATE TABLE users_backup (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE blog_backup (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users_backup(id),
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Copy data from UUID tables to serial ID tables
      INSERT INTO users_backup (email, password_hash, created_at)
      SELECT email, password_hash, created_at FROM users;

      -- Create mapping between UUID and new serial IDs
      CREATE TEMP TABLE uuid_to_serial AS
      SELECT u.id AS uuid, ub.id AS serial
      FROM users u
      JOIN users_backup ub ON u.email = ub.email;

      -- Copy blog data with converted user IDs
      INSERT INTO blog_backup (user_id, url, title, question, answer, is_read, created_at)
      SELECT 
        m.serial, 
        b.url, 
        b.title, 
        b.question, 
        b.answer, 
        b.is_read, 
        b.created_at
      FROM blog b
      JOIN uuid_to_serial m ON b.user_id = m.uuid;

      DROP TABLE uuid_to_serial;
    `);

    // Drop UUID tables and rename backup tables
    await this.client.queryArray(`
      DROP TABLE blog;
      DROP TABLE users;
      
      ALTER TABLE users_backup RENAME TO users;
      ALTER TABLE blog_backup RENAME TO blog;
    `);
  }
}