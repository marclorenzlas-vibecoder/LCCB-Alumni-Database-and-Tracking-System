const pool = require('./database');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function createDatabase() {
  // Create a connection without database selected
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'alumni'}`);
    console.log('Database created or already exists');
  } finally {
    await connection.end();
  }
}

async function ensureUsersTable() {
  const createUsersSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT(11) NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('ADMIN','ALUMNI','STAFF') DEFAULT 'ALUMNI',
      is_active TINYINT(1) DEFAULT 1,
      email_verified TINYINT(1) DEFAULT 0,
      oauth_provider VARCHAR(20) NULL,
      oauth_id VARCHAR(191) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY email (email),
      UNIQUE KEY username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.query(createUsersSql);

  // Add composite unique index for oauth if not exists (best-effort)
  try {
    await pool.query('CREATE UNIQUE INDEX uniq_oauth ON users (oauth_provider, oauth_id)');
  } catch (e) {
    // ignore if already exists
  }
}

async function initDatabase() {
  try {
    await createDatabase();
    await ensureUsersTable();
    console.log('Database and tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    // Continue execution but warn
    console.warn('Database initialization failed - some features may not work');
  }
}

module.exports = { initDatabase };


