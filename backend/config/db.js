import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'skilllink_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true // Return date/time as formatted strings instead of JS Date objects
});

// Verify connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('[MySQL] Connection pool established successfully to skilllink_db.');
    connection.release();
  } catch (error) {
    console.error('[MySQL] Database connection pool error:', error.message);
  }
})();

export default pool;
