const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const backendDir = path.resolve(__dirname, '..');
const envFile = fs.existsSync(path.join(backendDir, '.env')) ? '.env' : '.env.development';
dotenv.config({ path: path.join(backendDir, envFile) });

const prisma = require('../src/config/prisma');

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
];

const LAST_NAMES = [
  'Villanueva', 'Mendoza', 'Castillo', 'Ramos', 'Soriano',
  'Alvarez', 'Navarro', 'Bautista', 'Ocampo', 'Delgado',
  'Salazar', 'Guerrero', 'Pascual', 'Aquino', 'Herrera',
  'Mercado', 'Jimenez', 'Valdez', 'Miranda', 'Cortez',
  'Santiago', 'Estrada', 'Aguilar', 'Morales', 'Tiongco',
  'Lacson', 'Montelibano', 'Gamboa', 'Lizares', 'Yulo',
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

const BATCH_YEARS = [2019, 2020, 2021, 2022, 2023];

// Distribution for 5 alumni per program: 2 Related, 1 Not Related, 2 Not Specified
const ALIGNMENT_PATTERN = ['ALIGNED', 'ALIGNED', 'NOT_ALIGNED', 'NEEDS_REVIEW', 'NEEDS_REVIEW'];

const ALUMNI_PER_PROGRAM = 15; // 5 original + 10 additional per program

async function main() {
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  let createdCount = 0;
  let skippedCount = 0;

  for (let pIdx = 0; pIdx < PROGRAMS.length; pIdx++) {
    const prog = PROGRAMS[pIdx];

    for (let i = 0; i < ALUMNI_PER_PROGRAM; i++) {
      const globalIdx = pIdx * ALUMNI_PER_PROGRAM + i;
      const firstName = FIRST_NAMES[(globalIdx * 7 + i * 3) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(globalIdx * 5 + pIdx * 2 + i) % LAST_NAMES.length];
      const email = `gen.${prog.slug}.${i + 1}@alumni.lccb.edu.ph`;
      const username = `gen_${prog.slug.replace(/-/g, '_')}_${i + 1}`;
      const studentId = `GEN-${String(pIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      const batch = BATCH_YEARS[(pIdx + i) % BATCH_YEARS.length];
      const location = LOCATIONS[globalIdx % LOCATIONS.length];
      const alignment = ALIGNMENT_PATTERN[i % ALIGNMENT_PATTERN.length];

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        skippedCount++;
        continue;
      }

      const jobInfo =
        alignment === 'ALIGNED'
          ? prog.relatedJobs[i % prog.relatedJobs.length]
          : alignment === 'NOT_ALIGNED'
          ? UNRELATED_JOBS[(pIdx + i) % UNRELATED_JOBS.length]
          : i === 3
          ? prog.relatedJobs[0]
          : UNRELATED_JOBS[pIdx % UNRELATED_JOBS.length];

      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          role: 'ALUMNI',
          approval_status: 'APPROVED',
          is_active: true,
          is_blocked: false,
          consent_core: true,
          consent_timestamp: new Date(),
        },
      });

      const alumni = await prisma.alumni.create({
        data: {
          user_id: user.id,
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          email,
          level: prog.level,
          batch,
          graduation_year: batch,
          course: prog.course,
          current_position: jobInfo.title,
          company: jobInfo.company,
          location,
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
        },
      });

      await prisma.career_entry.create({
        data: {
          alumni_id: alumni.id,
          job_title: jobInfo.title,
          company: jobInfo.company,
          start_date: new Date(`${Math.min(batch + 1, 2025)}-06-01`),
          is_current: true,
          program_alignment: alignment,
          alignment_notes:
            alignment === 'ALIGNED'
              ? 'Alumni marked this job as related to their program.'
              : alignment === 'NOT_ALIGNED'
              ? 'Alumni marked this job as not related to their program.'
              : null,
          description: `Working as ${jobInfo.title} at ${jobInfo.company}.`,
        },
      });

      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO alumni_education_history (alumni_id, level, batch, graduation_year)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          alumni.id,
          prog.level,
          batch,
          batch
        );
      } catch {
        // Table may not exist in all environments; ignore safely
      }

      createdCount++;
    }
  }

  console.log(`Done! Created ${createdCount} generated alumni across ${PROGRAMS.length} programs (skipped ${skippedCount} existing).`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
