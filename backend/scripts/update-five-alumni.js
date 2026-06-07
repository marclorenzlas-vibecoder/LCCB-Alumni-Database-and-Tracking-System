const { PrismaClient } = require('@prisma/client');
const { replaceEducationHistory } = require('../src/utils/educationHistory');
const prisma = new PrismaClient();

async function updateAlumni() {
  try {
    console.log('🔧 Updating sample alumni records...');

    const updates = [
      {
        student_id: 'TS-F001-2018',
        email: 'maria.reyes@gmail.com',
        current_position: 'Class Adviser',
        company: 'LCCB Integrated School',
        educationHistory: [
          { level: 'INTEGRATED_SCHOOL', batch: 2018, graduationYear: 2018 }
        ]
      },
      {
        student_id: 'TS-F002-2018',
        email: 'jose.cruz@gmail.com',
        current_position: 'Operations Manager',
        company: 'Night High Center',
        educationHistory: [
          { level: 'NIGHT_HIGH', batch: 2018, graduationYear: 2018 },
          { level: 'SENIOR_HIGH', batch: 2019, graduationYear: 2019 }
        ]
      },
      {
        student_id: 'TS-F003-2019',
        email: 'ana.lopez@gmail.com',
        current_position: 'Research Assistant',
        company: 'University Lab',
        educationHistory: [
          { level: 'SENIOR_HIGH', batch: 2017, graduationYear: 2019 },
          { level: 'COLLEGE', batch: 2019, graduationYear: 2023 }
        ]
      },
      {
        student_id: 'TS-F004-2020',
        email: 'david.tan@gmail.com',
        current_position: 'Software Developer',
        company: 'Tech Solutions Inc.',
        educationHistory: [
          { level: 'COLLEGE', batch: 2018, graduationYear: 2022 },
          { level: 'ETEEAP', batch: 2019, graduationYear: 2023 },
          { level: 'GRAD_SCHOOL', batch: 2020, graduationYear: 2025 }
        ]
      },
      {
        student_id: 'TS-F005-2020',
        email: 'lizagarcia@gmail.com',
        current_position: 'Business Analyst',
        company: 'Analytics Corp',
        educationHistory: [
          { level: 'COLLEGE', batch: 2020, graduationYear: 2024 }
        ]
      }
    ];

    for (const u of updates) {
      const alumnus = await prisma.alumni.findFirst({ where: { student_id: u.student_id } });
      if (!alumnus) {
        console.log(`- Alumni with student_id ${u.student_id} not found, skipping`);
        continue;
      }

      // Update core fields
      const updateData = {};
      if (u.email) updateData.email = u.email;
      if (u.current_position) updateData.current_position = u.current_position;
      if (u.company) updateData.company = u.company;

      await prisma.alumni.update({ where: { id: alumnus.id }, data: updateData });
      console.log(`+ Updated ${alumnus.first_name} ${alumnus.last_name} (id=${alumnus.id})`);

      // Replace education history entries
      if (Array.isArray(u.educationHistory) && u.educationHistory.length > 0) {
        await replaceEducationHistory(prisma, alumnus.id, u.educationHistory);
        console.log(`  • Education history set (${u.educationHistory.length} entries)`);
      }
    }

    console.log('\n✅ Update complete. Refresh the alumni directory to see changes.');
  } catch (err) {
    console.error('Error updating alumni:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateAlumni();
