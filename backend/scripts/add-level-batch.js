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

    const alterLevel = `
      ALTER TABLE alumni 
      ADD COLUMN IF NOT EXISTS level ENUM('COLLEGE','HIGH_SCHOOL','SENIOR_HIGH_SCHOOL') NULL AFTER contact_number;
    `;

    const alterBatch = `
      ALTER TABLE alumni 
      ADD COLUMN IF NOT EXISTS batch INT NULL AFTER level;
    `;

    await connection.execute(alterLevel);
    await connection.execute(alterBatch);

    console.log('Ensured alumni.level and alumni.batch columns exist.');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure level/batch columns:', err.message);
    process.exit(1);
  }
}

main();
