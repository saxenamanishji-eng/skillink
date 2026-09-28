import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { createDatabaseConfig } from '../../backend/config/databaseConfig.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const dbConfig = createDatabaseConfig();

async function executeAllAcademicQueries() {
  console.log('===============================================================');
  console.log('📚 SkillLink DBMS Academic Query Suite Execution');
  console.log('===============================================================');

  let connection;
  let totalQueries = 0;
  let successQueries = 0;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server successfully.\n');

    const queryFiles = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of queryFiles) {
      console.log(`\n📄 Executing Query Group: ${file}`);
      console.log('---------------------------------------------------------------');
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');

      // Split queries by semicolon followed by newline
      const rawStatements = content
        .split(/;\s*(?=\r?\n|$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of rawStatements) {
        // Extract comment query title if present
        const titleMatch = statement.match(/--\s*Query\s*\d+:?\s*(.*)/i);
        const queryTitle = titleMatch ? titleMatch[1].trim() : 'Academic SQL Query';

        // Strip comments to find actual SQL executable
        const cleanedSQL = statement
          .replace(/--.*$/gm, '')
          .trim();

        if (cleanedSQL.length === 0) continue;

        totalQueries++;
        try {
          const startTime = Date.now();
          const [rows] = await connection.query(cleanedSQL);
          const elapsed = Date.now() - startTime;
          const rowCount = Array.isArray(rows) ? rows.length : (rows?.affectedRows || 0);

          console.log(`[PASS] Query #${totalQueries}: ${queryTitle} (${rowCount} rows, ${elapsed}ms)`);
          successQueries++;
        } catch (queryErr) {
          console.error(`[FAIL] Query #${totalQueries}: ${queryTitle}`);
          console.error(`       Error: ${queryErr.message}`);
        }
      }
    }

    console.log('\n===============================================================');
    console.log(`DBMS Query Suite Summary: ${successQueries} / ${totalQueries} Executed Successfully (${Math.round((successQueries/totalQueries)*100)}%)`);
    console.log('===============================================================');
  } catch (error) {
    console.error('Query runner encountered error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

executeAllAcademicQueries();
