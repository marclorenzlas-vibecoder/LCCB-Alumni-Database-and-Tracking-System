const mysql = require('mysql2/promise');
require('dotenv').config();

async function addVerificationFields() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'alumni'
  });

  try {
    console.log('Adding verification fields to pending_registration table...');

    // Add verification columns
    const columns = [
      { name: 'first_name', type: 'VARCHAR(100)', after: 'username' },
      { name: 'last_name', type: 'VARCHAR(100)', after: 'first_name' },
      { name: 'student_id', type: 'VARCHAR(50)', after: 'last_name' },
      { name: 'contact_number', type: 'VARCHAR(50)', after: 'student_id' },
      { name: 'verification_document', type: 'VARCHAR(255)', after: 'profile_image' },
      { name: 'additional_info', type: 'TEXT', after: 'verification_document' }
    ];

    for (const col of columns) {
      try {
        await connection.execute(
          `ALTER TABLE \`pending_registration\` 
           ADD COLUMN \`${col.name}\` ${col.type} NULL AFTER \`${col.after}\``
        );
        console.log(`✓ Added column: ${col.name}`);
      } catch (err) {
        if (err.message.includes('Duplicate column')) {
          console.log(`  Column '${col.name}' already exists, skipping...`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Successfully added verification fields!');
    console.log('\nThese fields help admins verify alumni identity:');
    console.log('- first_name: Alumni\'s first name');
    console.log('- last_name: Alumni\'s last name');
    console.log('- student_id: Student/Alumni ID number');
    console.log('- contact_number: Phone number for verification');
    console.log('- verification_document: Path to uploaded ID/diploma/certificate');
    console.log('- additional_info: Any additional verification details');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addVerificationFields();
