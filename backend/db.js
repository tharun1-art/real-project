const mysql = require('mysql2/promise');

if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is not configured');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'currency_exchange',
  user: process.env.DB_USER || 'currency_app',
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

module.exports = pool;
