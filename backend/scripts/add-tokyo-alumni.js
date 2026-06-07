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
    console.log('🌏 Adding 3 alumni based in Tokyo, Japan...');

    const existingAlumni = await prisma.alumni.findMany({
      where: { student_id: { not: null } },
      select: { student_id: true, email: true }
    });

    const usedIds = new Set(existingAlumni.map((a) => a.student_id).filter(Boolean));
    const usedEmails = new Set(existingAlumni.map((a) => a.email).filter(Boolean));

    const samples = [
      {
        first_name: 'Yuki',
        last_name: 'Tanaka',
        contact_number: '09170111243',
        level: 'COLLEGE',
        course: 'SBIT',
        batch: 2021,
        graduation_year: 2025,
        location: 'Tokyo, Japan',
        current_position: 'Software Engineer',
        company: 'Sony Corporation'
      },
      {
        first_name: 'Kenji',
        last_name: 'Yamamoto',
        contact_number: '09170111244',
        level: 'GRAD_SCHOOL',
        course: 'Master of Science in Architecture',
        batch: 2020,
        graduation_year: 2023,
        location: 'Tokyo, Japan',
        current_position: 'Architect',
        company: 'Mitsubishi Estate'
      },
      {
        first_name: 'Sakura',
        last_name: 'Suzuki',
        contact_number: '09170111245',
        level: 'COLLEGE',
        course: 'SHTM',
        batch: 2022,
        graduation_year: 2026,
        location: 'Tokyo, Japan',
        current_position: 'Hotel Manager',
        company: 'Tokyo Ritz Carlton'
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

      console.log(`+ Added: ${created.first_name} ${created.last_name} (${created.student_id}) - ${created.location}`);
    }

    console.log('\n✅ Done. Added 3 alumni based in Tokyo, Japan.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
