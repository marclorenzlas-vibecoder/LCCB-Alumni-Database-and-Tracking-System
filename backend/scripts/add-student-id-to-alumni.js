const mysql = require('mysql2/promise');
require('dotenv').config();

async function addStudentIdToAlumni() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni'
  });

  try {
    console.log('🔍 Checking if student_id column exists in alumni table...');

    // Check if column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'alumni' 
      AND COLUMN_NAME = 'student_id'
    `);

    if (columns.length > 0) {
      console.log('✅ student_id column already exists in alumni table');
      return;
    }

    console.log('➕ Adding student_id column to alumni table...');

    // Add student_id column
    await connection.execute(`
      ALTER TABLE alumni 
      ADD COLUMN student_id VARCHAR(50) UNIQUE AFTER user_id
    `);

    console.log('✅ Successfully added student_id column to alumni table');
    console.log('📋 Column added: student_id VARCHAR(50) UNIQUE');

  } catch (error) {
    console.error('❌ Error adding student_id column:', error);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed');
  }
}

addStudentIdToAlumni();
