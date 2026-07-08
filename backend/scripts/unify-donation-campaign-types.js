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
      ALTER TABLE \`donation\`
        ADD COLUMN IF NOT EXISTS \`accepts_money\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`donation_type\`,
        ADD COLUMN IF NOT EXISTS \`accepts_items\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`accepts_money\`
    `);

    await connection.execute(`
      ALTER TABLE \`donation\`
        ALTER COLUMN \`donation_type\` SET DEFAULT 'both'
    `);

    await connection.execute(`
      UPDATE \`donation\`
      SET
        \`donation_type\` = 'both',
        \`accepts_money\` = 1,
        \`accepts_items\` = 1
    `);

    console.log('Donation campaigns now accept both money and items by default.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed to unify donation campaign types:', error.message);
  process.exit(1);
});
