const mysql = require('mysql2/promise');
require('dotenv').config();

async function addApprovalSystem() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'alumni'
  });

  try {
    console.log('Adding approval system columns and tables...');

    // Add approval_status enum
    await connection.execute(`
      ALTER TABLE \`user\` 
      ADD COLUMN IF NOT EXISTS \`approval_status\` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING' AFTER \`role\`,
      ADD COLUMN IF NOT EXISTS \`is_active\` BOOLEAN DEFAULT FALSE AFTER \`approval_status\`
    `).catch(err => {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('Columns already exist in user table');
    });

    // Update existing users to be approved and active
    await connection.execute(`
      UPDATE \`user\` 
      SET \`approval_status\` = 'APPROVED', \`is_active\` = TRUE 
      WHERE \`approval_status\` IS NULL OR \`approval_status\` = 'PENDING'
    `);

    // Create notification table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`notification\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`user_id\` (\`user_id\`)
      )
    `);

    console.log('✓ Successfully added approval system!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

addApprovalSystem();
