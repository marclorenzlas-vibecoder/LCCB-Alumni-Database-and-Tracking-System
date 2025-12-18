require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  try {
    const url = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/alumni';
    const { hostname, port, username, password, pathname } = new URL(url);
    const database = pathname.replace(/^\//, '');

    const connection = await mysql.createConnection({
      host: hostname || 'localhost',
      port: port ? Number(port) : 3306,
      user: username || 'root',
      password: password || '',
      database,
      multipleStatements: true,
    });

    const sql = `ALTER TABLE alumni ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50) NULL AFTER email;`;
    await connection.execute(sql);
    console.log('Contact number column ensured on alumni table.');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure contact_number column:', err.message);
    process.exit(1);
  }
}

main();
