const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const backendDir = path.resolve(__dirname, '..');
const envFile = fs.existsSync(path.join(backendDir, '.env')) ? '.env' : '.env.development';
dotenv.config({ path: path.join(backendDir, envFile) });

const prisma = require('../src/config/prisma');

const TARGET_BATCHES = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2016];
const MIN_ALUMNI_PER_PROGRAM_BATCH = 5;

const PROGRAMS = [
  // Integrated School (3)
  {
    level: 'INTEGRATED_SCHOOL',
    course: 'Integrated School - Elementary',
    slug: 'is-elem',
    relatedJobs: [
      { title: 'Junior Graphic Designer', company: 'Negros Creative Studio' },
      { title: 'Administrative Assistant', company: 'Bacolod City Hall' },
    ],
  },
  {
    level: 'INTEGRATED_SCHOOL',
    course: 'Integrated School - Junior High',
    slug: 'is-jhs',
    relatedJobs: [
      { title: 'Customer Support Specialist', company: 'Teleperformance Bacolod' },
      { title: 'Operations Coordinator', company: 'Visayas Logistics Corp.' },
    ],
  },
  {
    level: 'INTEGRATED_SCHOOL',
    course: 'Night High',
    slug: 'is-night',
    relatedJobs: [
      { title: 'Store Supervisor', company: 'Robinsons Retail Bacolod' },
      { title: 'Logistics Associate', company: 'LBC Express Negros' },
    ],
  },
  // Senior High School (1)
  {
    level: 'SENIOR_HIGH',
    course: 'Senior High School',
    slug: 'shs',
    relatedJobs: [
      { title: 'Junior Accounting Clerk', company: 'Metrobank Bacolod' },
      { title: 'IT Support Technician', company: 'Panasiatic Solutions' },
    ],
  },
  // College (4)
  {
    level: 'COLLEGE',
    course: 'SARFAID',
    slug: 'sarfaid',
    relatedJobs: [
      { title: 'Junior Architect', company: 'Aidea Architecture Philippines' },
      { title: 'Interior Designer', company: 'Studio Espacio Bacolod' },
    ],
  },
  {
    level: 'COLLEGE',
    course: 'SHTM',
    slug: 'shtm',
    relatedJobs: [
      { title: 'Front Office Supervisor', company: 'L Fisher Hotel Bacolod' },
      { title: 'Events & Banquet Coordinator', company: 'Seda Capitol Central' },
    ],
  },
  {
    level: 'COLLEGE',
    course: 'BSIT',
    slug: 'bsit',
    relatedJobs: [
      { title: 'Full Stack Developer', company: 'Accenture Philippines' },
      { title: 'Systems Engineer', company: 'Globe Telecom' },
    ],
  },
  {
    level: 'COLLEGE',
    course: 'SSLATE',
    slug: 'sslate',
    relatedJobs: [
      { title: 'Licensed Professional Teacher', company: 'DepEd Division of Bacolod' },
      { title: 'Corporate Communications Officer', company: 'Negros Occidental Press' },
    ],
  },
  // ETEEAP (3)
  {
    level: 'ETEEAP',
    course: 'B.A. in English Language Studies',
    slug: 'eteeap-abels',
    relatedJobs: [
      { title: 'Technical Writer', company: 'Concentrix Philippines' },
      { title: 'ESL Academic Coordinator', company: 'Bacolod Language Academy' },
    ],
  },
  {
    level: 'ETEEAP',
    course: 'B.S. in Business Administration',
    slug: 'eteeap-bsba',
    relatedJobs: [
      { title: 'Branch Operations Manager', company: 'BDO Unibank' },
      { title: 'Business Development Officer', company: 'San Miguel Corporation' },
    ],
  },
  {
    level: 'ETEEAP',
    course: 'B.S. in Hospitality Management',
    slug: 'eteeap-bshm',
    relatedJobs: [
      { title: 'Food & Beverage Manager', company: 'Acacia Hotel Bacolod' },
      { title: 'Resort Operations Lead', company: 'Campuestohan Highland Resort' },
    ],
  },
  // Graduate School (13)
  {
    level: 'GRAD_SCHOOL',
    course: 'Doctor in Business Administration',
    slug: 'grad-dba',
    relatedJobs: [
      { title: 'Chief Operating Officer', company: 'Negros Trade Holdings' },
      { title: 'Senior Management Consultant', company: 'SGV & Co.' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Science in Architecture',
    slug: 'grad-msarch',
    relatedJobs: [
      { title: 'Principal Architect', company: 'Visayas Urban Design Group' },
      { title: 'Senior Urban Planner', company: 'Bacolod Heritage Development' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Science in Hospitality Management',
    slug: 'grad-mshm',
    relatedJobs: [
      { title: 'Hotel General Manager', company: 'Park Inn by Radisson Bacolod' },
      { title: 'Hospitality Director', company: 'Megaworld Hotels & Resorts' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master in Business Administration',
    slug: 'grad-mba',
    relatedJobs: [
      { title: 'Regional Sales Director', company: 'Ayala Land Visayas' },
      { title: 'Finance Controller', company: 'Victorias Milling Company' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master in Business Administration - Human Resource Management',
    slug: 'grad-mba-hrm',
    relatedJobs: [
      { title: 'HR Business Partner', company: 'SM Investments Corporation' },
      { title: 'People & Culture Manager', company: 'Transcom Bacolod' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Counseling',
    slug: 'grad-mac',
    relatedJobs: [
      { title: 'Registered Guidance Counselor', company: 'La Consolacion College Bacolod' },
      { title: 'Student Wellness Specialist', company: 'Negros Occidental High School' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Educational Management',
    slug: 'grad-maem',
    relatedJobs: [
      { title: 'School Principal', company: 'St. Scholastica Academy' },
      { title: 'Academic Program Director', company: 'DepEd Western Visayas' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Education - English/Literature',
    slug: 'grad-maed-eng',
    relatedJobs: [
      { title: 'Senior English Professor', company: 'University of St. La Salle' },
      { title: 'Curriculum Developer - English', company: 'Rex Book Store Publishing' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Education - Filipino',
    slug: 'grad-maed-fil',
    relatedJobs: [
      { title: 'Filipino Department Chair', company: 'Bacolod City National High School' },
      { title: 'Filipino Language Educator', company: 'CHMSU Talisay' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Education - General Science',
    slug: 'grad-maed-sci',
    relatedJobs: [
      { title: 'Science Coordinator', company: 'Philippine Science High School WV' },
      { title: 'Master Teacher - Science', company: 'DepEd Region VI' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Education - Instructional Technology',
    slug: 'grad-maed-it',
    relatedJobs: [
      { title: 'Instructional Designer', company: 'Cengage Learning Asia' },
      { title: 'EdTech Coordinator', company: 'La Consolacion College Bacolod' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Education - Mathematics',
    slug: 'grad-maed-math',
    relatedJobs: [
      { title: 'Mathematics Department Head', company: 'Trinity Christian School' },
      { title: 'College Mathematics Instructor', company: 'University of Negros Occidental' },
    ],
  },
  {
    level: 'GRAD_SCHOOL',
    course: 'Master of Arts in Education - Religious Studies',
    slug: 'grad-maed-rel',
    relatedJobs: [
      { title: 'Campus Ministry Director', company: 'La Consolacion College Bacolod' },
      { title: 'Values & Religious Education Head', company: 'Diocese of Bacolod Schools' },
    ],
  },
];

const UNRELATED_JOBS = [
  { title: 'Real Estate Sales Agent', company: 'Camella Homes Bacolod' },
  { title: 'Coffee Shop Owner', company: 'Artisan Brew Cafe' },
  { title: 'E-Commerce Seller', company: 'Self-Employed' },
  { title: 'Insurance Financial Advisor', company: 'Sun Life Philippines' },
  { title: 'Freelance Photographer', company: 'Lens & Light Studio' },
];

const FIRST_NAMES = [
  'Gabriel', 'Camille', 'Rafael', 'Clarissa', 'Lorenzo',
  'Bianca', 'Miguel', 'Patricia', 'Paolo', 'Andrea',
  'Jerome', 'Katrina', 'Nathaniel', 'Samantha', 'Adrian',
  'Mikaela', 'Christian', 'Therese', 'Vincent', 'Danica',
  'Francis', 'Beatrice', 'Dominic', 'Kirsten', 'Kenneth',
  'Isabelle', 'Joshua', 'Pauline', 'Carlo', 'Nicole',
  'Marco', 'Elaine', 'Daniel', 'Celine', 'Patrick',
  'Hannah', 'Anthony', 'Sophia', 'Martin', 'Angela',
];

const LAST_NAMES = [
  'Villanueva', 'Mendoza', 'Castillo', 'Ramos', 'Soriano',
  'Alvarez', 'Navarro', 'Bautista', 'Ocampo', 'Delgado',
  'Salazar', 'Guerrero', 'Pascual', 'Aquino', 'Herrera',
  'Mercado', 'Jimenez', 'Valdez', 'Miranda', 'Cortez',
  'Santiago', 'Estrada', 'Aguilar', 'Morales', 'Tiongco',
  'Lacson', 'Montelibano', 'Gamboa', 'Lizares', 'Yulo',
  'Gonzales', 'Fernandez', 'Torres', 'Flores', 'Rivera',
  'Reyes', 'Cruz', 'Santos', 'Garcia', 'Lopez',
];

const LOCATIONS = [
  'Bacolod City, Negros Occidental',
  'Cebu City, Philippines',
  'Makati City, Metro Manila',
  'Iloilo City, Philippines',
  'Talisay City, Negros Occidental',
  'Silay City, Negros Occidental',
  'Taguig City, Metro Manila',
];

const ALIGNMENT_PATTERN = ['ALIGNED', 'ALIGNED', 'NOT_ALIGNED', 'NEEDS_REVIEW', 'NEEDS_REVIEW'];

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

async function main() {
  // 1. Update any alumni with batch 2027 (or graduation_year 2027) -> 2017
  const updatedBatch2027 = await prisma.alumni.updateMany({
    where: { batch: 2027 },
    data: { batch: 2017 },
  });
  const updatedGrad2027 = await prisma.alumni.updateMany({
    where: { graduation_year: 2027 },
    data: { graduation_year: 2017 },
  });
  let updatedEdu2027 = 0;
  try {
    updatedEdu2027 = await prisma.$executeRawUnsafe(
      `UPDATE alumni_education_history
       SET batch = CASE WHEN batch = 2027 THEN 2017 ELSE batch END,
           graduation_year = CASE WHEN graduation_year = 2027 THEN 2017 ELSE graduation_year END
       WHERE batch = 2027 OR graduation_year = 2027`
    );
  } catch {
    // Ignore if table doesn't exist
  }
  console.log(
    `Updated batch 2027 -> 2017: alumni.batch=${updatedBatch2027.count}, alumni.graduation_year=${updatedGrad2027.count}, education_history=${updatedEdu2027}`
  );

  // 2. Count existing alumni per (course, batch)
  const existingAlumni = await prisma.alumni.findMany({
    select: { course: true, batch: true },
  });
  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase())
  );

  const countMap = new Map();
  for (const row of existingAlumni) {
    if (!row.course || !row.batch) continue;
    const key = `${row.course.trim().toLowerCase()}::${Number(row.batch)}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // 3. Build list of alumni to insert so EVERY (program, targetBatch) has at least 5 alumni
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const toCreate = [];
  let seq = 1;

  for (let pIdx = 0; pIdx < PROGRAMS.length; pIdx++) {
    const prog = PROGRAMS[pIdx];
    for (let bIdx = 0; bIdx < TARGET_BATCHES.length; bIdx++) {
      const batch = TARGET_BATCHES[bIdx];
      const key = `${prog.course.trim().toLowerCase()}::${batch}`;
      const existingCount = countMap.get(key) || 0;
      const needed = Math.max(0, MIN_ALUMNI_PER_PROGRAM_BATCH - existingCount);

      for (let slot = 0; slot < needed; slot++) {
        let suffix = existingCount + slot + 1;
        let email = `gen.${prog.slug}.b${batch}.${suffix}@alumni.lccb.edu.ph`;
        while (existingEmails.has(email.toLowerCase())) {
          suffix++;
          email = `gen.${prog.slug}.b${batch}.${suffix}@alumni.lccb.edu.ph`;
        }
        existingEmails.add(email.toLowerCase());

        const globalIdx = seq++;
        const firstName = FIRST_NAMES[(globalIdx * 7 + bIdx * 3 + slot) % FIRST_NAMES.length];
        const lastName = LAST_NAMES[(globalIdx * 11 + pIdx * 5 + slot) % LAST_NAMES.length];
        const username = `gen_${prog.slug.replace(/-/g, '_')}_${batch}_${suffix}`;
        const studentId = `GB${batch}-${String(pIdx + 1).padStart(2, '0')}-${String(suffix).padStart(2, '0')}`;
        const location = LOCATIONS[globalIdx % LOCATIONS.length];
        const alignment = ALIGNMENT_PATTERN[(existingCount + slot) % ALIGNMENT_PATTERN.length];

        const jobInfo =
          alignment === 'ALIGNED'
            ? prog.relatedJobs[(slot + bIdx) % prog.relatedJobs.length]
            : alignment === 'NOT_ALIGNED'
            ? UNRELATED_JOBS[(pIdx + bIdx + slot) % UNRELATED_JOBS.length]
            : slot % 2 === 0
            ? prog.relatedJobs[0]
            : UNRELATED_JOBS[(pIdx + slot) % UNRELATED_JOBS.length];

        toCreate.push({
          email,
          username,
          studentId,
          firstName,
          lastName,
          level: prog.level,
          course: prog.course,
          batch,
          location,
          alignment,
          jobInfo,
        });
      }
    }
  }

  console.log(`Prepared ${toCreate.length} new alumni to ensure >= ${MIN_ALUMNI_PER_PROGRAM_BATCH} per program per batch (${PROGRAMS.length} programs x ${TARGET_BATCHES.length} batches).`);

  if (toCreate.length === 0) {
    console.log('Nothing to insert — all program/batch combinations already have at least 5 alumni.');
    return;
  }

  // 4. Bulk insert users in chunks
  for (const chunk of chunkArray(toCreate, 100)) {
    await prisma.user.createMany({
      data: chunk.map((item) => ({
        email: item.email,
        username: item.username,
        password: hashedPassword,
        role: 'ALUMNI',
        approval_status: 'APPROVED',
        is_active: true,
        is_blocked: false,
        consent_core: true,
        consent_timestamp: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  // Fetch inserted user IDs by email
  const createdUsers = await prisma.user.findMany({
    where: { email: { in: toCreate.map((i) => i.email) } },
    select: { id: true, email: true },
  });
  const userIdByEmail = new Map(createdUsers.map((u) => [u.email.toLowerCase(), u.id]));

  // 5. Bulk insert alumni in chunks
  for (const chunk of chunkArray(toCreate, 100)) {
    const alumniRows = chunk
      .map((item) => {
        const userId = userIdByEmail.get(item.email.toLowerCase());
        if (!userId) return null;
        return {
          user_id: userId,
          student_id: item.studentId,
          first_name: item.firstName,
          last_name: item.lastName,
          email: item.email,
          level: item.level,
          batch: item.batch,
          graduation_year: item.batch,
          course: item.course,
          current_position: item.jobInfo.title,
          company: item.jobInfo.company,
          location: item.location,
          skills: 'Communication, Leadership, Problem Solving',
          is_public: true,
          is_student_id_public: false,
          is_date_of_birth_public: false,
          is_course_public: false,
          is_graduation_year_public: false,
          is_education_history_public: false,
          is_email_public: false,
          is_phone_public: false,
          is_position_public: false,
          is_company_public: false,
          is_employment_public: false,
          is_location_public: false,
          is_social_links_public: false,
          is_skills_public: false,
          is_verified: true,
          status: 'LIVING',
        };
      })
      .filter(Boolean);

    if (alumniRows.length > 0) {
      await prisma.alumni.createMany({
        data: alumniRows,
        skipDuplicates: true,
      });
    }
  }

  // Fetch inserted alumni IDs by email
  const createdAlumni = await prisma.alumni.findMany({
    where: { email: { in: toCreate.map((i) => i.email) } },
    select: { id: true, email: true },
  });
  const alumniIdByEmail = new Map(createdAlumni.map((a) => [a.email.toLowerCase(), a.id]));

  // 6. Bulk insert career_entry records in chunks
  for (const chunk of chunkArray(toCreate, 100)) {
    const careerRows = chunk
      .map((item) => {
        const alumniId = alumniIdByEmail.get(item.email.toLowerCase());
        if (!alumniId) return null;
        return {
          alumni_id: alumniId,
          job_title: item.jobInfo.title,
          company: item.jobInfo.company,
          start_date: new Date(`${Math.min(item.batch + 1, 2025)}-06-01`),
          is_current: true,
          program_alignment: item.alignment,
          alignment_notes:
            item.alignment === 'ALIGNED'
              ? 'Alumni marked this job as related to their program.'
              : item.alignment === 'NOT_ALIGNED'
              ? 'Alumni marked this job as not related to their program.'
              : null,
          description: `Working as ${item.jobInfo.title} at ${item.jobInfo.company}.`,
        };
      })
      .filter(Boolean);

    if (careerRows.length > 0) {
      await prisma.career_entry.createMany({
        data: careerRows,
        skipDuplicates: true,
      });
    }
  }

  // 7. Bulk insert alumni_education_history rows in chunks (if table exists)
  try {
    for (const chunk of chunkArray(toCreate, 100)) {
      const values = [];
      const params = [];
      let p = 1;
      for (const item of chunk) {
        const alumniId = alumniIdByEmail.get(item.email.toLowerCase());
        if (!alumniId) continue;
        values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(alumniId, item.level, item.batch, item.batch);
      }
      if (values.length > 0) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO alumni_education_history (alumni_id, level, batch, graduation_year)
           VALUES ${values.join(', ')}
           ON CONFLICT DO NOTHING`,
          ...params
        );
      }
    }
  } catch (err) {
    console.warn('Skipped alumni_education_history bulk insert:', err?.message || err);
  }

  console.log(`Done! Created ${createdAlumni.length} new alumni across ${PROGRAMS.length} programs x ${TARGET_BATCHES.length} batches.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
