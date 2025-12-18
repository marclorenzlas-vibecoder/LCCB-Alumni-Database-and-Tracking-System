const mysql = require('mysql2/promise');
require('dotenv').config();

async function addProfileImageColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'alumni'
  });

  try {
    console.log('Adding profile_image and username columns...');

    // Add to user table
    await connection.execute(`
      ALTER TABLE \`user\` 
      ADD COLUMN IF NOT EXISTS \`username\` VARCHAR(100) NULL AFTER \`password\`,
      ADD COLUMN IF NOT EXISTS \`profile_image\` VARCHAR(255) NULL AFTER \`username\`
    `).catch(err => {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('Columns already exist in user table');
    });

    // Add to users table
    await connection.execute(`
      ALTER TABLE \`users\` 
      ADD COLUMN IF NOT EXISTS \`username\` VARCHAR(100) NULL AFTER \`password\`,
      ADD COLUMN IF NOT EXISTS \`profile_image\` VARCHAR(255) NULL AFTER \`username\`
    `).catch(err => {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('Columns already exist in users table');
    });

    // Add to teacher table
    await connection.execute(`
      ALTER TABLE \`teacher\` 
      ADD COLUMN IF NOT EXISTS \`profile_image\` VARCHAR(255) NULL AFTER \`password\`
    `).catch(err => {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('Column already exists in teacher table');
    });

    console.log('✓ Successfully added profile_image columns to all user tables!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

addProfileImageColumns();
