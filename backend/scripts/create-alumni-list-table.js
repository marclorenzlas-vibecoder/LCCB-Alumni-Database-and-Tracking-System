const mysql = require('mysql2/promise');
require('dotenv').config();

const sampleAlumni = [
  // 2023 Graduates
  { student_id: '21-0087-958', first_name: 'John', last_name: 'Doe', middle_name: 'Smith', course: 'GAS', level: 'Senior_High_school', batch: 2020, graduation_year: 2023 },
  { student_id: '21-0088-123', first_name: 'Maria', last_name: 'Santos', middle_name: 'Cruz', course: 'STEM', level: 'Senior_High_school', batch: 2020, graduation_year: 2023 },
  { student_id: '21-0089-456', first_name: 'Jose', last_name: 'Garcia', middle_name: 'Lopez', course: 'ABM', level: 'Senior_High_school', batch: 2020, graduation_year: 2023 },
  { student_id: '21-0090-789', first_name: 'Ana', last_name: 'Rodriguez', middle_name: 'Martinez', course: 'HUMSS', level: 'Senior_High_school', batch: 2020, graduation_year: 2023 },
  
  // 2024 Graduates
  { student_id: '22-0091-234', first_name: 'Carlos', last_name: 'Reyes', middle_name: 'Fernandez', course: 'GAS', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  { student_id: '22-0092-567', first_name: 'Isabella', last_name: 'Torres', middle_name: 'Rivera', course: 'STEM', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  { student_id: '22-0093-890', first_name: 'Miguel', last_name: 'Flores', middle_name: 'Gomez', course: 'ABM', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  
  // 2025 Graduates
  { student_id: '23-0094-345', first_name: 'Sofia', last_name: 'Mendoza', middle_name: 'Diaz', course: 'HUMSS', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 },
  { student_id: '23-0095-678', first_name: 'Daniel', last_name: 'Cruz', middle_name: 'Velasco', course: 'GAS', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 },
  { student_id: '23-0096-901', first_name: 'Elena', last_name: 'Jimenez', middle_name: 'Morales', course: 'STEM', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 }
];

async function createAlumniListTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni'
  });

  try {
    console.log('📋 Creating alumni_list table...\n');

    // Check if table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'alumni_list'
    `);

    if (tables.length > 0) {
      console.log('⚠️  Table alumni_list already exists');
      
      // Check if table has data
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM alumni_list');
      const count = rows[0].count;
      
      if (count > 0) {
        console.log(`✅ Table already has ${count} records. Skipping data insertion.`);
        return;
      }
      
      console.log('📝 Table is empty. Adding sample data...\n');
    } else {
      // Create table
      await connection.execute(`
        CREATE TABLE alumni_list (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id VARCHAR(50) NOT NULL UNIQUE,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          middle_name VARCHAR(100),
          course VARCHAR(100),
          level VARCHAR(50),
          batch INT,
          graduation_year INT,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_student_id (student_id),
          INDEX idx_alumni_batch (batch),
          INDEX idx_graduation_year (graduation_year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Table alumni_list created successfully\n');
    }

    // Insert sample data
    console.log('📝 Inserting sample alumni records...\n');
    
    for (const alumni of sampleAlumni) {
      try {
        await connection.execute(`
          INSERT INTO alumni_list 
          (student_id, first_name, last_name, middle_name, course, level, batch, graduation_year, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'GRADUATED')
        `, [
          alumni.student_id,
          alumni.first_name,
          alumni.last_name,
          alumni.middle_name,
          alumni.course,
          alumni.level,
          alumni.batch,
          alumni.graduation_year
        ]);
        
        console.log(`✅ Added: ${alumni.first_name} ${alumni.last_name} (${alumni.student_id}) - Class of ${alumni.graduation_year}`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Skipped: ${alumni.student_id} (already exists)`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Alumni list table setup completed!');
    console.log(`\n📊 Summary:`);
    const [result] = await connection.execute('SELECT COUNT(*) as total FROM alumni_list');
    console.log(`   Total records: ${result[0].total}`);
    
    const [byYear] = await connection.execute(`
      SELECT graduation_year, COUNT(*) as count 
      FROM alumni_list 
      GROUP BY graduation_year 
      ORDER BY graduation_year
    `);
    console.log(`\n   By Graduation Year:`);
    byYear.forEach(row => {
      console.log(`   - ${row.graduation_year}: ${row.count} alumni`);
    });

  } catch (error) {
    console.error('❌ Error creating alumni_list table:', error);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

createAlumniListTable();
