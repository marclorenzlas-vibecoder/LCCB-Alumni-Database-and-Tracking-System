require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni'
  });

  try {
    await connection.execute(`
      ALTER TABLE \`job_posting\`
        ADD COLUMN IF NOT EXISTS \`application_url\` VARCHAR(1000) NULL AFTER \`description\`
    `);
    console.log('Job application_url column is ready.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed to add job application_url column:', error.message);
  process.exit(1);
});
