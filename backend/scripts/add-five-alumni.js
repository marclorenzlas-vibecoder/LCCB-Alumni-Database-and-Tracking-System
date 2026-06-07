const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFiveAlumni() {
  try {
    console.log('🟦 Adding 5 sample alumni...');

    const samples = [
      {
        student_id: 'TS-F001-2018',
        first_name: 'Maria',
        last_name: 'Reyes',
        email: 'maria.reyes@example.com',
        contact_number: '09171234567',
        level: 'INTEGRATED_SCHOOL',
        course: 'General Academic Strand',
        batch: 2018,
        graduation_year: 2018,
        is_verified: false
      },
      {
        student_id: 'TS-F002-2018',
        first_name: 'Jose',
        last_name: 'Cruz',
        email: 'jose.cruz@example.com',
        contact_number: '09172223333',
        level: 'NIGHT_HIGH',
        course: 'Vocational Education',
        batch: 2018,
        graduation_year: 2019,
        is_verified: false
      },
      {
        student_id: 'TS-F003-2019',
        first_name: 'Ana',
        last_name: 'Lopez',
        email: 'ana.lopez@example.com',
        contact_number: '09173334444',
        level: 'SENIOR_HIGH',
        course: 'STEM',
        batch: 2019,
        graduation_year: 2019,
        is_verified: false
      },
      {
        student_id: 'TS-F004-2020',
        first_name: 'David',
        last_name: 'Tan',
        email: 'david.tan@example.com',
        contact_number: '09174445555',
        level: 'COLLEGE',
        course: 'Computer Science',
        batch: 2020,
        graduation_year: 2022,
        is_verified: false
      },
      {
        student_id: 'TS-F005-2020',
        first_name: 'Liza',
        last_name: 'Garcia',
        email: 'liza.garcia@example.com',
        contact_number: '09175556666',
        level: 'GRAD_SCHOOL',
        course: 'Business Analytics',
        batch: 2020,
        graduation_year: 2024,
        is_verified: false
      }
    ];

    for (const a of samples) {
      const exists = await prisma.alumni.findFirst({ where: { OR: [{ student_id: a.student_id }, { email: a.email }] } });
      if (exists) {
        console.log(`- Skipping existing: ${a.first_name} ${a.last_name} (${a.email || a.student_id})`);
        continue;
      }

      const created = await prisma.alumni.create({ data: a });
      console.log(`+ Created: ${created.first_name} ${created.last_name} (id=${created.id})`);
    }

    console.log('\n✅ Done. Run the app or refresh the alumni directory to see the new entries.');
  } catch (err) {
    console.error('Error adding alumni:', err);
  } finally {
    await prisma.$disconnect();
  }
}

addFiveAlumni();
