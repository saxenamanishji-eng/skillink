import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createDatabaseConfig } from '../backend/config/databaseConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const dbConfig = createDatabaseConfig();

async function runMigrations() {
  console.log('Starting SkillLink database migrations on Railway MySQL...');
  console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}, database: ${dbConfig.database}`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Successfully connected to Railway MySQL server.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const [appliedRows] = await connection.query('SELECT migration_name FROM schema_migrations');
    const appliedSet = new Set(appliedRows.map(r => r.migration_name));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[SKIPPED] Migration ${file} already applied.`);
        continue;
      }

      console.log(`[APPLYING] Migration ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
      console.log(`[SUCCESS] Migration ${file} applied successfully.`);
    }

    console.log('All migrations completed successfully on Railway MySQL!');
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
