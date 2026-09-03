// db.js - Vercel / Railway / Cloud compatible MySQL setup
const mysql = require('mysql2');

const connectionConfig = (process.env.MYSQL_URL || process.env.DATABASE_URL)
  ? process.env.MYSQL_URL || process.env.DATABASE_URL
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'reactwebsiteapp',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'true' || process.env.MYSQL_URL || process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
    };

const pool = mysql.createPool(connectionConfig);

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ DB connection error:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL database');
  connection.release();
});

module.exports = pool;
module.exports.promise = pool.promise();

