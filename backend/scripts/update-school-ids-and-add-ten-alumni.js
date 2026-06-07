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
    console.log('🛠️ Updating School IDs and adding 10 alumni...');

    const existingAlumni = await prisma.alumni.findMany({
      where: { student_id: { not: null } },
      select: { student_id: true, email: true }
    });

    const usedIds = new Set(existingAlumni.map((a) => a.student_id).filter(Boolean));
    const usedEmails = new Set(existingAlumni.map((a) => a.email).filter(Boolean));

    const oldSeedIds = [
      'TS-F001-2018',
      'TS-F002-2018',
      'TS-F003-2019',
      'TS-F004-2020',
      'TS-F005-2020'
    ];

    const toMigrate = await prisma.alumni.findMany({
      where: { student_id: { in: oldSeedIds } },
      select: { id: true, first_name: true, last_name: true, student_id: true }
    });

    for (const alumnus of toMigrate) {
      if (alumnus.student_id) {
        usedIds.delete(alumnus.student_id);
      }

      const newSchoolId = await generateUniqueSchoolId(usedIds);
      await prisma.alumni.update({
        where: { id: alumnus.id },
        data: { student_id: newSchoolId }
      });

      console.log(
        `+ School ID updated: ${alumnus.first_name} ${alumnus.last_name} (${alumnus.student_id} -> ${newSchoolId})`
      );
    }

    const samples = [
      {
        first_name: 'Paolo',
        last_name: 'Mendoza',
        contact_number: '09170111223',
        level: 'INTEGRATED_SCHOOL',
        course: 'Integrated School - Elementary',
        batch: 2018,
        graduation_year: 2018,
        current_position: 'Admin Assistant',
        company: 'City Hall Office'
      },
      {
        first_name: 'Bianca',
        last_name: 'Santos',
        contact_number: '09170111224',
        level: 'NIGHT_HIGH',
        course: 'Night High',
        batch: 2019,
        graduation_year: 2019,
        current_position: 'Customer Support Specialist',
        company: 'Metro Services'
      },
      {
        first_name: 'Kevin',
        last_name: 'Ramos',
        contact_number: '09170111225',
        level: 'SENIOR_HIGH',
        course: 'Senior High School',
        batch: 2020,
        graduation_year: 2020,
        current_position: 'Junior QA Analyst',
        company: 'Quality First Inc.'
      },
      {
        first_name: 'Nicole',
        last_name: 'Villanueva',
        contact_number: '09170111226',
        level: 'COLLEGE',
        course: 'SARFAID',
        batch: 2020,
        graduation_year: 2024,
        current_position: 'Frontend Developer',
        company: 'Blue Pixel Studio'
      },
      {
        first_name: 'Adrian',
        last_name: 'Flores',
        contact_number: '09170111227',
        level: 'ETEEAP',
        course: 'B.S. in Business Administration',
        batch: 2021,
        graduation_year: 2023,
        current_position: 'Operations Supervisor',
        company: 'Prime Manufacturing'
      },
      {
        first_name: 'Jasmine',
        last_name: 'Navarro',
        contact_number: '09170111228',
        level: 'GRAD_SCHOOL',
        course: 'Master in Business Administration - Human Resource Management',
        batch: 2021,
        graduation_year: 2025,
        current_position: 'Project Coordinator',
        company: 'Synergy Consulting'
      },
      {
        first_name: 'Ethan',
        last_name: 'Dela Cruz',
        contact_number: '09170111229',
        level: 'COLLEGE',
        course: 'SBIT',
        batch: 2022,
        graduation_year: 2026,
        current_position: 'Backend Developer',
        company: 'Cloud Core Labs'
      },
      {
        first_name: 'Camille',
        last_name: 'Agustin',
        contact_number: '09170111230',
        level: 'SENIOR_HIGH',
        course: 'Senior High School',
        batch: 2022,
        graduation_year: 2022,
        current_position: 'Accounting Clerk',
        company: 'FinEdge Corp'
      },
      {
        first_name: 'Bryan',
        last_name: 'Lim',
        contact_number: '09170111231',
        level: 'NIGHT_HIGH',
        course: 'Night High',
        batch: 2019,
        graduation_year: 2020,
        current_position: 'Field Technician',
        company: 'North Grid Utilities'
      },
      {
        first_name: 'Angela',
        last_name: 'Pascual',
        contact_number: '09170111232',
        level: 'INTEGRATED_SCHOOL',
        course: 'Integrated School - Junior High',
        batch: 2018,
        graduation_year: 2018,
        current_position: 'Multimedia Designer',
        company: 'Studio One Creative'
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

    console.log('\n✅ Done. School IDs updated and 10 new alumni records added.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
