const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomDigits(length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

function generateSchoolId() {
  // Format: 21-NNNN-NNN (fixed 21, then 4 random digits, then 3 random digits)
  return `21-${randomDigits(4)}-${randomDigits(3)}`;
}

async function generateUniqueSchoolId(usedIds) {
  let attempts = 0;
  while (attempts < 1000) {
    const candidate = generateSchoolId();
    if (!usedIds.has(candidate)) {
      const existing = await prisma.alumni.findUnique({ where: { student_id: candidate } });
      if (!existing) {
        usedIds.add(candidate);
        return candidate;
      }
    }
    attempts += 1;
  }
  throw new Error('Unable to generate a unique School ID after many attempts.');
}

async function generateUniqueEmail(baseEmailLocal, usedEmails) {
  let candidate = `${baseEmailLocal}@gmail.com`;
  let suffix = 1;

  while (usedEmails.has(candidate)) {
    candidate = `${baseEmailLocal}${suffix}@gmail.com`;
    suffix += 1;
  }

  const existing = await prisma.alumni.findFirst({ where: { email: candidate } });
  if (existing) {
    while (true) {
      candidate = `${baseEmailLocal}${suffix}@gmail.com`;
      const taken = await prisma.alumni.findFirst({ where: { email: candidate } });
      if (!taken && !usedEmails.has(candidate)) break;
      suffix += 1;
    }
  }

  usedEmails.add(candidate);
  return candidate;
}

async function main() {
  try {
    console.log('🟩 Adding 10 more alumni...');

    const existingAlumni = await prisma.alumni.findMany({
      where: { student_id: { not: null } },
      select: { student_id: true, email: true }
    });

    const usedIds = new Set(existingAlumni.map((a) => a.student_id).filter(Boolean));
    const usedEmails = new Set(existingAlumni.map((a) => a.email).filter(Boolean));

    const samples = [
      {
        first_name: 'Marcus',
        last_name: 'Rivera',
        contact_number: '09170111233',
        level: 'COLLEGE',
        course: 'SHTM',
        batch: 2023,
        graduation_year: 2027,
        current_position: 'Front Desk Manager',
        company: 'Grand Resort Hotels'
      },
      {
        first_name: 'Victoria',
        last_name: 'Gonzales',
        contact_number: '09170111234',
        level: 'COLLEGE',
        course: 'SSLATE',
        batch: 2021,
        graduation_year: 2025,
        current_position: 'Social Worker',
        company: 'Community Services Foundation'
      },
      {
        first_name: 'Raphael',
        last_name: 'Santos',
        contact_number: '09170111235',
        level: 'INTEGRATED_SCHOOL',
        course: 'Integrated School - Elementary',
        batch: 2016,
        graduation_year: 2016,
        current_position: 'Teacher',
        company: 'LCCB Integrated School'
      },
      {
        first_name: 'Sophia',
        last_name: 'Torres',
        contact_number: '09170111236',
        level: 'ETEEAP',
        course: 'B.A. in English Language Studies',
        batch: 2019,
        graduation_year: 2022,
        current_position: 'Content Writer',
        company: 'Digital Media Group'
      },
      {
        first_name: 'Lucas',
        last_name: 'Corpuz',
        contact_number: '09170111237',
        level: 'GRAD_SCHOOL',
        course: 'Master of Science in Hospitality Management',
        batch: 2020,
        graduation_year: 2023,
        current_position: 'Operations Director',
        company: 'Luxury Hotel Chain'
      },
      {
        first_name: 'Aurora',
        last_name: 'Medina',
        contact_number: '09170111238',
        level: 'SENIOR_HIGH',
        course: 'Senior High School',
        batch: 2021,
        graduation_year: 2021,
        current_position: 'Administrative Assistant',
        company: 'Corporate Office'
      },
      {
        first_name: 'Daniel',
        last_name: 'Castillo',
        contact_number: '09170111239',
        level: 'ETEEAP',
        course: 'B.S. in Hospitality Management',
        batch: 2018,
        graduation_year: 2021,
        current_position: 'Banquet Coordinator',
        company: 'Event Management Co.'
      },
      {
        first_name: 'Isabella',
        last_name: 'Valencia',
        contact_number: '09170111240',
        level: 'COLLEGE',
        course: 'SBIT',
        batch: 2022,
        graduation_year: 2026,
        current_position: 'Junior Business Analyst',
        company: 'Strategic Consulting'
      },
      {
        first_name: 'Alexander',
        last_name: 'Robles',
        contact_number: '09170111241',
        level: 'GRAD_SCHOOL',
        course: 'Master of Arts in Educational Management',
        batch: 2021,
        graduation_year: 2024,
        current_position: 'School Principal',
        company: 'Private Educational Institution'
      },
      {
        first_name: 'Evelyn',
        last_name: 'Montoya',
        contact_number: '09170111242',
        level: 'NIGHT_HIGH',
        course: 'Night High',
        batch: 2020,
        graduation_year: 2021,
        current_position: 'Accounting Supervisor',
        company: 'Financial Services Ltd'
      }
    ];

    for (const sample of samples) {
      const baseLocal = `${sample.first_name}${sample.last_name}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const email = await generateUniqueEmail(baseLocal, usedEmails);
      const student_id = await generateUniqueSchoolId(usedIds);

      const created = await prisma.alumni.create({
        data: {
          ...sample,
          email,
          student_id,
          is_verified: false
        }
      });

      console.log(`+ Added: ${created.first_name} ${created.last_name} (${created.student_id})`);
    }

    console.log('\n✅ Done. 10 new alumni records added.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
