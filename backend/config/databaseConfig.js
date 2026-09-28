export const createDatabaseConfig = () => {
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
  if (!password) {
    throw new Error('Database password is required. Set DB_PASSWORD or MYSQLPASSWORD.');
  }

  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'skilllink_db',
    multipleStatements: true
  };
};
