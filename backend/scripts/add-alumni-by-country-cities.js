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
    console.log('🌍 Adding alumni grouped by country with diverse cities...');

    const existingAlumni = await prisma.alumni.findMany({
      where: { student_id: { not: null } },
      select: { student_id: true, email: true }
    });

    const usedIds = new Set(existingAlumni.map((a) => a.student_id).filter(Boolean));
    const usedEmails = new Set(existingAlumni.map((a) => a.email).filter(Boolean));

    const samples = [
      // JAPAN - 3 alumni in different cities
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
        location: 'Kyoto, Japan',
        current_position: 'Architect',
        company: 'Heritage Design Studio'
      },
      {
        first_name: 'Sakura',
        last_name: 'Suzuki',
        contact_number: '09170111245',
        level: 'COLLEGE',
        course: 'SHTM',
        batch: 2022,
        graduation_year: 2026,
        location: 'Osaka, Japan',
        current_position: 'Hotel Manager',
        company: 'Osaka Hilton'
      },
      // CHINA - 3 alumni in different cities
      {
        first_name: 'Wei',
        last_name: 'Chen',
        contact_number: '09170111246',
        level: 'COLLEGE',
        course: 'SARFAID',
        batch: 2021,
        graduation_year: 2025,
        location: 'Beijing, China',
        current_position: 'Business Consultant',
        company: 'Beijing Strategy Group'
      },
      {
        first_name: 'Ming',
        last_name: 'Wang',
        contact_number: '09170111247',
        level: 'COLLEGE',
        course: 'SBIT',
        batch: 2020,
        graduation_year: 2024,
        location: 'Shanghai, China',
        current_position: 'Data Analyst',
        company: 'Shanghai Tech Solutions'
      },
      {
        first_name: 'Li',
        last_name: 'Zhang',
        contact_number: '09170111248',
        level: 'GRAD_SCHOOL',
        course: 'Master in Business Administration',
        batch: 2019,
        graduation_year: 2022,
        location: 'Shenzhen, China',
        current_position: 'Investment Manager',
        company: 'Shenzhen Finance Corp'
      },
      // USA - 3 alumni in different cities
      {
        first_name: 'James',
        last_name: 'Anderson',
        contact_number: '09170111249',
        level: 'COLLEGE',
        course: 'SBIT',
        batch: 2022,
        graduation_year: 2026,
        location: 'New York, USA',
        current_position: 'Software Developer',
        company: 'Microsoft New York'
      },
      {
        first_name: 'Sarah',
        last_name: 'Martinez',
        contact_number: '09170111250',
        level: 'COLLEGE',
        course: 'SHTM',
        batch: 2021,
        graduation_year: 2025,
        location: 'Los Angeles, USA',
        current_position: 'Event Coordinator',
        company: 'LA Events Unlimited'
      },
      {
        first_name: 'Michael',
        last_name: 'Johnson',
        contact_number: '09170111251',
        level: 'GRAD_SCHOOL',
        course: 'Master of Business Administration',
        batch: 2019,
        graduation_year: 2022,
        location: 'Chicago, USA',
        current_position: 'Finance Director',
        company: 'Chicago Financial Group'
      },
      // AUSTRALIA - 3 alumni in different cities
      {
        first_name: 'Emma',
        last_name: 'Thompson',
        contact_number: '09170111252',
        level: 'COLLEGE',
        course: 'SBIT',
        batch: 2020,
        graduation_year: 2024,
        location: 'Sydney, Australia',
        current_position: 'Tech Lead',
        company: 'Atlassian Sydney'
      },
      {
        first_name: 'Oliver',
        last_name: 'Wilson',
        contact_number: '09170111253',
        level: 'COLLEGE',
        course: 'SARFAID',
        batch: 2021,
        graduation_year: 2025,
        location: 'Melbourne, Australia',
        current_position: 'Marketing Manager',
        company: 'Melbourne Marketing Plus'
      },
      {
        first_name: 'Charlotte',
        last_name: 'Brown',
        contact_number: '09170111254',
        level: 'GRAD_SCHOOL',
        course: 'Master of Arts in Educational Management',
        batch: 2020,
        graduation_year: 2023,
        location: 'Brisbane, Australia',
        current_position: 'School Administrator',
        company: 'Brisbane International School'
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

    console.log('\n✅ Done. Added 12 alumni grouped by country with diverse cities.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
