const mysql = require('mysql2/promise');
require('dotenv').config();

const newAlumni = [
  // 2023 Graduates
  { student_id: '21-0097-234', first_name: 'Ricardo', last_name: 'Ramos', middle_name: 'Castro', course: 'ABM', level: 'Senior_High_school', batch: 2020, graduation_year: 2023 },
  { student_id: '21-0098-567', first_name: 'Patricia', last_name: 'Villarreal', middle_name: 'Solis', course: 'STEM', level: 'Senior_High_school', batch: 2020, graduation_year: 2023 },
  
  // 2024 Graduates
  { student_id: '22-0099-890', first_name: 'Fernando', last_name: 'Castillo', middle_name: 'Perez', course: 'HUMSS', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  { student_id: '22-0100-123', first_name: 'Gabriela', last_name: 'Navarro', middle_name: 'Herrera', course: 'GAS', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  { student_id: '22-0101-456', first_name: 'Luis', last_name: 'Ortega', middle_name: 'Silva', course: 'STEM', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  { student_id: '22-0102-789', first_name: 'Carmen', last_name: 'Delgado', middle_name: 'Ruiz', course: 'ABM', level: 'Senior_High_school', batch: 2021, graduation_year: 2024 },
  
  // 2025 Graduates
  { student_id: '23-0103-012', first_name: 'Rafael', last_name: 'Vargas', middle_name: 'Medina', course: 'HUMSS', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 },
  { student_id: '23-0104-345', first_name: 'Valentina', last_name: 'Moreno', middle_name: 'Campos', course: 'GAS', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 },
  { student_id: '23-0105-678', first_name: 'Antonio', last_name: 'Gutierrez', middle_name: 'Salazar', course: 'STEM', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 },
  { student_id: '23-0106-901', first_name: 'Lucia', last_name: 'Romero', middle_name: 'Aguilar', course: 'ABM', level: 'Senior_High_school', batch: 2022, graduation_year: 2025 }
];

async function addMoreAlumni() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni'
  });

  try {
    console.log('📝 Adding 10 more alumni records to alumni_list table...\n');

    let successCount = 0;
    let skipCount = 0;

    for (const alumni of newAlumni) {
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
        successCount++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Skipped: ${alumni.first_name} ${alumni.last_name} (${alumni.student_id}) - Already exists`);
          skipCount++;
        } else {
          console.error(`❌ Error adding ${alumni.first_name} ${alumni.last_name}:`, err.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully added: ${successCount} alumni`);
    if (skipCount > 0) {
      console.log(`⚠️  Skipped (already exists): ${skipCount} alumni`);
    }
    
    // Show total count
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM alumni_list');
    console.log(`📊 Total alumni in database: ${rows[0].count}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addMoreAlumni();
