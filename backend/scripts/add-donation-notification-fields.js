const mysql = require('mysql2/promise');
require('dotenv').config();

async function addDonationNotificationFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni'
  });

  try {
    console.log('Updating notification table for donation sender metadata...');

    await connection.execute(`
      ALTER TABLE \`notification\`
        ADD COLUMN IF NOT EXISTS \`sender_name\` VARCHAR(255) NULL AFTER \`link\`,
        ADD COLUMN IF NOT EXISTS \`sender_profile_image\` VARCHAR(255) NULL AFTER \`sender_name\`
    `).catch((error) => {
      if (!String(error.message || '').toLowerCase().includes('duplicate column')) {
        throw error;
      }
      console.log('Sender metadata columns already exist.');
    });

    await connection.execute(`
      ALTER TABLE \`notification\`
      MODIFY COLUMN \`type\` ENUM('EVENT', 'ACHIEVEMENT', 'ANNOUNCEMENT', 'GENERAL', 'JOB_APPLICATION', 'DONATION') NOT NULL DEFAULT 'GENERAL'
    `);

    console.log('✓ Donation notification fields are ready.');
  } catch (error) {
    console.error('Error updating notification table:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

addDonationNotificationFields();