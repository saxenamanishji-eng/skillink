import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabaseConfig } from './databaseConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = createDatabaseConfig();
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true
});

// Verify connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[MySQL] Connection pool established successfully to ${dbConfig.database}.`);
    connection.release();
  } catch (error) {
    console.error('[MySQL] Database connection pool error:', error.message);
  }
})();

export default pool;
