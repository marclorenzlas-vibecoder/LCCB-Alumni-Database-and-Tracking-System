const mysql = require('mysql2/promise');
require('dotenv').config();

// Update existing alumni to have varied education levels
const levelUpdates = [
  // College graduates
  { student_id: '21-0087-958', level: 'COLLEGE', course: 'BS Computer Science' },
  { student_id: '21-0088-123', level: 'COLLEGE', course: 'BS Nursing' },
  { student_id: '22-0091-234', level: 'COLLEGE', course: 'BS Business Administration' },
  { student_id: '22-0092-567', level: 'COLLEGE', course: 'BS Information Technology' },
  { student_id: '23-0094-345', level: 'COLLEGE', course: 'BS Psychology' },
  { student_id: '22-0099-890', level: 'COLLEGE', course: 'BS Accountancy' },
  { student_id: '23-0103-012', level: 'COLLEGE', course: 'AB Communication' },
  
  // High School graduates
  { student_id: '21-0089-456', level: 'HIGH_SCHOOL', course: 'General Education' },
  { student_id: '21-0090-789', level: 'HIGH_SCHOOL', course: 'General Education' },
  { student_id: '22-0093-890', level: 'HIGH_SCHOOL', course: 'General Education' },
  { student_id: '23-0095-678', level: 'HIGH_SCHOOL', course: 'General Education' },
  
  // Senior High School graduates (keep some with their strand courses)
  { student_id: '23-0096-901', level: 'SENIOR_HIGH_SCHOOL', course: 'STEM' },
  { student_id: '21-0097-234', level: 'SENIOR_HIGH_SCHOOL', course: 'ABM' },
  { student_id: '21-0098-567', level: 'SENIOR_HIGH_SCHOOL', course: 'STEM' },
  { student_id: '22-0100-123', level: 'SENIOR_HIGH_SCHOOL', course: 'GAS' },
  { student_id: '22-0101-456', level: 'SENIOR_HIGH_SCHOOL', course: 'STEM' },
  { student_id: '22-0102-789', level: 'SENIOR_HIGH_SCHOOL', course: 'ABM' },
  { student_id: '23-0104-345', level: 'SENIOR_HIGH_SCHOOL', course: 'GAS' },
  { student_id: '23-0105-678', level: 'SENIOR_HIGH_SCHOOL', course: 'STEM' },
  { student_id: '23-0106-901', level: 'SENIOR_HIGH_SCHOOL', course: 'ABM' }
];

async function updateAlumniLevels() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni'
  });

  try {
    console.log('🔄 Updating alumni education levels to add variety...\n');

    let updateCount = 0;
    const levelCounts = {
      COLLEGE: 0,
      HIGH_SCHOOL: 0,
      SENIOR_HIGH_SCHOOL: 0
    };

    for (const update of levelUpdates) {
      try {
        const [result] = await connection.execute(`
          UPDATE alumni_list 
          SET level = ?, course = ?
          WHERE student_id = ?
        `, [update.level, update.course, update.student_id]);

        if (result.affectedRows > 0) {
          console.log(`✅ Updated: ${update.student_id} → ${update.level} (${update.course})`);
          updateCount++;
          levelCounts[update.level]++;
        } else {
          console.log(`⚠️  Not found: ${update.student_id}`);
        }
      } catch (err) {
        console.error(`❌ Error updating ${update.student_id}:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully updated: ${updateCount} alumni records`);
    console.log('\n📊 Distribution by Level:');
    console.log(`   🎓 College: ${levelCounts.COLLEGE} alumni`);
    console.log(`   🏫 High School: ${levelCounts.HIGH_SCHOOL} alumni`);
    console.log(`   📚 Senior High School: ${levelCounts.SENIOR_HIGH_SCHOOL} alumni`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateAlumniLevels();
