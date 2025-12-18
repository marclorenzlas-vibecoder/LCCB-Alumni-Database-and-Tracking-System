const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample data for creating realistic alumni profiles
const firstNames = [
  'Marcus', 'Sophia', 'Liam', 'Emma', 'Noah', 'Olivia', 'James', 'Ava', 'Lucas', 'Isabella',
  'Mason', 'Mia', 'Ethan', 'Charlotte', 'Alexander', 'Amelia', 'Daniel', 'Harper', 'Matthew', 'Evelyn',
  'Jackson', 'Abigail', 'Sebastian', 'Emily', 'Jack', 'Elizabeth', 'Aiden', 'Sofia', 'Owen', 'Avery',
  'Samuel', 'Ella', 'Henry', 'Scarlett', 'Joseph', 'Grace', 'Michael', 'Chloe', 'David', 'Victoria',
  'Benjamin', 'Riley', 'Wyatt', 'Aria', 'Luke', 'Lily', 'Gabriel', 'Aubrey', 'Anthony', 'Zoey',
  'Isaac', 'Penelope', 'Grayson', 'Lillian', 'Dylan', 'Addison', 'Leo', 'Layla', 'Lincoln', 'Natalie'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes'
];

const courses = [
  'BS Information Technology',
  'BS Computer Science', 
  'BS Information Systems',
  'BS Business Administration',
  'BS Accountancy',
  'BS Civil Engineering',
  'BS Electrical Engineering',
  'BS Mechanical Engineering',
  'BS Psychology',
  'BS Nursing',
  'STEM',
  'ABM',
  'HUMSS',
  'GAS',
  'ICT',
  'HS'
];

// Skills mapping based on La Consolacion College Bacolod courses
const courseSkills = {
  'BS Information Technology': [
    'Web Development', 'Database Management', 'Network Administration', 'Software Testing',
    'System Analysis', 'IT Project Management', 'Technical Support', 'Cloud Computing'
  ],
  'BS Computer Science': [
    'Algorithm Design', 'Data Structures', 'Software Engineering', 'Artificial Intelligence',
    'Machine Learning', 'Mobile App Development', 'Programming (Java, Python, C++)', 'Database Design'
  ],
  'BS Information Systems': [
    'Business Process Analysis', 'Information Management', 'Systems Integration', 'ERP Systems',
    'Data Analytics', 'IT Consulting', 'Business Intelligence', 'Project Management'
  ],
  'BS Business Administration': [
    'Strategic Planning', 'Marketing Management', 'Financial Analysis', 'Human Resource Management',
    'Operations Management', 'Business Communication', 'Leadership', 'Entrepreneurship'
  ],
  'BS Accountancy': [
    'Financial Accounting', 'Cost Accounting', 'Auditing', 'Tax Preparation',
    'Financial Reporting', 'Budget Analysis', 'Bookkeeping', 'Accounting Software (QuickBooks, SAP)'
  ],
  'BS Civil Engineering': [
    'Structural Design', 'Construction Management', 'AutoCAD', 'Project Planning',
    'Surveying', 'Materials Testing', 'Building Codes', 'Site Engineering'
  ],
  'BS Electrical Engineering': [
    'Circuit Design', 'Power Systems', 'Electronics', 'Control Systems',
    'PLC Programming', 'Electrical Troubleshooting', 'MATLAB', 'Instrumentation'
  ],
  'BS Mechanical Engineering': [
    'Mechanical Design', 'CAD/CAM', 'Thermodynamics', 'Manufacturing Processes',
    'Materials Science', 'Quality Control', 'Maintenance Engineering', 'SolidWorks'
  ],
  'BS Psychology': [
    'Counseling', 'Psychological Assessment', 'Behavioral Analysis', 'Research Methods',
    'Mental Health Support', 'Crisis Intervention', 'Child Development', 'Clinical Psychology'
  ],
  'BS Nursing': [
    'Patient Care', 'Clinical Procedures', 'Medical-Surgical Nursing', 'Health Assessment',
    'Medication Administration', 'Emergency Care', 'Patient Education', 'Electronic Health Records'
  ],
  'STEM': [
    'Critical Thinking', 'Scientific Research', 'Data Analysis', 'Problem Solving',
    'Laboratory Skills', 'Mathematics', 'Physics', 'Chemistry'
  ],
  'ABM': [
    'Business Analysis', 'Accounting Basics', 'Marketing Fundamentals', 'Economics',
    'Financial Literacy', 'Business Communication', 'Entrepreneurship', 'Management Principles'
  ],
  'HUMSS': [
    'Social Research', 'Communication Skills', 'Creative Writing', 'Public Speaking',
    'Critical Analysis', 'Psychology Basics', 'Sociology', 'Philosophy'
  ],
  'GAS': [
    'Academic Writing', 'Research', 'Communication', 'Problem Solving',
    'Time Management', 'Presentation Skills', 'Team Collaboration', 'Adaptability'
  ],
  'ICT': [
    'Computer Programming', 'Web Design', 'Network Fundamentals', 'Digital Graphics',
    'Database Basics', 'Technical Support', 'Computer Hardware', 'Software Applications'
  ],
  'HS': [
    'Basic Mathematics', 'Communication Skills', 'Computer Literacy', 'Critical Thinking',
    'Time Management', 'Team Work', 'Problem Solving', 'Study Skills'
  ]
};

function getSkillsForCourse(course) {
  const skills = courseSkills[course] || ['Communication', 'Problem Solving', 'Team Work', 'Leadership'];
  // Randomly select 4-6 skills from the course
  const numSkills = Math.floor(Math.random() * 3) + 4; // 4 to 6 skills
  const shuffled = [...skills].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numSkills).join(', ');
}

const companies = [
  'TechVision Philippines Inc.',
  'Accenture',
  'IBM Philippines',
  'Google',
  'Microsoft',
  'Ayala Corporation',
  'SM Investments',
  'BDO Unibank',
  'Globe Telecom',
  'PLDT',
  'San Miguel Corporation',
  'Jollibee Foods Corporation',
  'Megaworld Corporation',
  'Aboitiz Equity Ventures',
  'Universal Robina Corporation'
];

const positions = [
  'Software Engineer',
  'Senior Developer',
  'IT Consultant',
  'Project Manager',
  'Business Analyst',
  'Data Analyst',
  'System Administrator',
  'Quality Assurance Engineer',
  'DevOps Engineer',
  'Product Manager',
  'Marketing Manager',
  'HR Specialist',
  'Financial Analyst',
  'Sales Executive',
  'Operations Manager'
];

const locations = [
  'Makati City',
  'Taguig City',
  'Quezon City',
  'Manila',
  'Pasig City',
  'Mandaluyong City',
  'Pasay City',
  'Paranaque City',
  'Las Pinas City',
  'Muntinlupa City'
];

// Batches to create alumni for
const batches = [
  { year: 2014, level: 'COLLEGE' },
  { year: 2015, level: 'COLLEGE' },
  { year: 2019, level: 'SENIOR_HIGH_SCHOOL' },
  { year: 2020, level: 'COLLEGE' },
  { year: 2021, level: 'COLLEGE' },
  { year: 2023, level: 'SENIOR_HIGH_SCHOOL' }
];

const alumniPerBatch = 10;

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateEmail(firstName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  return `${cleanFirst}@gmail.com`;
}

function generateUsername(firstName, lastName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  return `${cleanFirst}.${cleanLast}`;
}

function generatePassword(firstName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  return `${cleanFirst}12345*`;
}

async function createAlumniWithUser(batchInfo, index) {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const email = generateEmail(firstName);
  const username = generateUsername(firstName, lastName);
  const password = generatePassword(firstName);
  const course = getRandomElement(courses);
  const company = getRandomElement(companies);
  const position = getRandomElement(positions);
  const location = getRandomElement(locations);
  const skills = getSkillsForCourse(course);

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`⚠️  Skipping ${email} - already exists`);
      return null;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user first
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        role: 'ALUMNI',
        approval_status: 'APPROVED', // Auto-approve
        is_active: true,
        is_blocked: false,
        notification_enabled: true
      }
    });

    // Create alumni profile
    const alumni = await prisma.alumni.create({
      data: {
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        level: batchInfo.level,
        batch: batchInfo.year,
        graduation_year: batchInfo.year,
        course,
        current_position: position,
        company,
        location,
        is_public: true,
        is_verified: true,
        skills,
        bio: `Alumni from La Consolacion College Bacolod batch ${batchInfo.year}. Graduated with ${course}. Currently working as ${position} at ${company}.`,
        contact_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`
      }
    });

    console.log(`✅ Created: ${firstName} ${lastName} (${email}) - Batch ${batchInfo.year}`);
    console.log(`   Password: ${password}`);
    
    return { user, alumni };
  } catch (error) {
    console.error(`❌ Error creating alumni: ${error.message}`);
    return null;
  }
}

async function createBatchAlumni() {
  console.log('🚀 Starting alumni creation process...\n');
  console.log(`📝 Creating ${alumniPerBatch} alumni per batch`);
  console.log(`🔑 Password format: firstname12345* (e.g., emily12345*, harper12345*)\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const batchInfo of batches) {
    console.log(`\n📅 Creating alumni for Batch ${batchInfo.year} (${batchInfo.level})...`);
    console.log('─'.repeat(70));

    for (let i = 0; i < alumniPerBatch; i++) {
      const result = await createAlumniWithUser(batchInfo, i);
      if (result) {
        totalCreated++;
      } else {
        totalSkipped++;
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Total Alumni Created: ${totalCreated}`);
  console.log(`⚠️  Total Skipped (duplicates): ${totalSkipped}`);
  console.log(`📧 Email format: firstname@gmail.com`);
  console.log(`🔑 Password format: firstname12345*`);
  console.log(`🎓 All alumni from La Consolacion College Bacolod`);
  console.log(`💼 Each profile includes course-relevant skills`);
  console.log('\n💡 You can now login with any of these accounts!');
  console.log('═'.repeat(70));
}

async function main() {
  try {
    await createBatchAlumni();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
