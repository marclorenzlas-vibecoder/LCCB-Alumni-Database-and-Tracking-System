const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// All alumni that should exist (60 total: 10 per batch)
const expectedAlumni = {
  2014: [
    { firstName: 'Lucas', lastName: 'McIntyre', email: 'lucas@gmail.com' },
    { firstName: 'Mia', lastName: 'Reyes', email: 'mia@gmail.com' },
    { firstName: 'Joseph', lastName: 'Diaz', email: 'joseph@gmail.com' },
    { firstName: 'Jack', lastName: 'Anderson', email: 'jack@gmail.com' },
    { firstName: 'Ethan', lastName: 'Parker', email: 'ethan@gmail.com' },
    { firstName: 'Isaac', lastName: 'King', email: 'isaac@gmail.com' },
    { firstName: 'Layla', lastName: 'Green', email: 'layla@gmail.com' },
    { firstName: 'Olivia', lastName: 'Baker', email: 'olivia@gmail.com' },
    { firstName: 'Ella', lastName: 'Sanchez', email: 'ella@gmail.com' },
    { firstName: 'Emily', lastName: 'Flores', email: 'emily@gmail.com' }
  ],
  2015: [
    { firstName: 'Brielle', lastName: 'Dawson', email: 'brielle@gmail.com' },
    { firstName: 'Aiden', lastName: 'Phillips', email: 'aiden@gmail.com' },
    { firstName: 'Aubrey', lastName: 'Taylor', email: 'aubrey@gmail.com' },
    { firstName: 'Zoey', lastName: 'Allen', email: 'zoey@gmail.com' },
    { firstName: 'Lincoln', lastName: 'Adams', email: 'lincoln@gmail.com' },
    { firstName: 'Luke', lastName: 'Gonzalez', email: 'luke@gmail.com' },
    { firstName: 'Avery', lastName: 'Hill', email: 'avery@gmail.com' },
    { firstName: 'Grace', lastName: 'Rodriguez', email: 'grace@gmail.com' },
    { firstName: 'Mason', lastName: 'Reyes', email: 'mason@gmail.com' },
    { firstName: 'Sophia', lastName: 'Green', email: 'sophia@gmail.com' }
  ],
  2019: [
    { firstName: 'Kendra', lastName: 'Vaughn', email: 'kendra@gmail.com' },
    { firstName: 'Charlotte', lastName: 'Evans', email: 'charlotte@gmail.com' },
    { firstName: 'David', lastName: 'Baker', email: 'david@gmail.com' },
    { firstName: 'Dylan', lastName: 'Hill', email: 'dylan@gmail.com' },
    { firstName: 'Lillian', lastName: 'Rodriguez', email: 'lillian@gmail.com' },
    { firstName: 'Evelyn', lastName: 'Smith', email: 'evelyn@gmail.com' },
    { firstName: 'Matthew', lastName: 'Davis', email: 'matthew@gmail.com' },
    { firstName: 'Natalie', lastName: 'Jones', email: 'natalie@gmail.com' },
    { firstName: 'Daniel', lastName: 'Evans', email: 'daniel@gmail.com' },
    { firstName: 'Sebastian', lastName: 'Parker', email: 'sebastian@gmail.com' }
  ],
  2020: [
    { firstName: 'Oscar', lastName: 'Hartman', email: 'oscar@gmail.com' },
    { firstName: 'VJ', lastName: 'Javellana', email: 'vj@gmail.com' },
    { firstName: 'Joey', lastName: 'Abunan', email: 'joey@gmail.com' },
    { firstName: 'Jackson', lastName: 'Young', email: 'jackson@gmail.com' },
    { firstName: 'Riley', lastName: 'Wilson', email: 'riley@gmail.com' },
    { firstName: 'Matthew', lastName: 'Gomez', email: 'matthew@gmail.com' },
    { firstName: 'Penelope', lastName: 'Garcia', email: 'penelope@gmail.com' },
    { firstName: 'Scarlett', lastName: 'Nguyen', email: 'scarlett@gmail.com' },
    { firstName: 'Elizabeth', lastName: 'Baker', email: 'elizabeth@gmail.com' },
    { firstName: 'Samuel', lastName: 'Rodriguez', email: 'samuel@gmail.com' }
  ],
  2021: [
    { firstName: 'Alaina', lastName: 'Russo', email: 'alaine@gmail.com' },
    { firstName: 'Sofia', lastName: 'Martinez', email: 'sofia@gmail.com' },
    { firstName: 'Owen', lastName: 'Smith', email: 'owen@gmail.com' },
    { firstName: 'Addison', lastName: 'Scott', email: 'addison@gmail.com' },
    { firstName: 'Gabriel', lastName: 'Adams', email: 'gabriel@gmail.com' },
    { firstName: 'Harper', lastName: 'Carter', email: 'harper@gmail.com' },
    { firstName: 'Chloe', lastName: 'Brown', email: 'chloe@gmail.com' },
    { firstName: 'Leo', lastName: 'Gomez', email: 'leo@gmail.com' },
    { firstName: 'Liam', lastName: 'Miller', email: 'liam@gmail.com' },
    { firstName: 'Amelia', lastName: 'Jackson', email: 'amelia@gmail.com' }
  ],
  2023: [
    { firstName: 'Marc', lastName: 'Lorenz Las', email: 'marc@gmail.com' },
    { firstName: 'Anthony', lastName: 'Collins', email: 'anthony@gmail.com' },
    { firstName: 'Sebastian', lastName: 'Reyes', email: 'sebastian@gmail.com' },
    { firstName: 'Wyatt', lastName: 'Baker', email: 'wyatt@gmail.com' },
    { firstName: 'Lily', lastName: 'Nguyen', email: 'lily@gmail.com' },
    { firstName: 'Alexander', lastName: 'Brown', email: 'alexander@gmail.com' },
    { firstName: 'Avery', lastName: 'Gonzalez', email: 'avery@gmail.com' },
    { firstName: 'Noah', lastName: 'Gomez', email: 'noah@gmail.com' },
    { firstName: 'Ethan', lastName: 'Clark', email: 'ethan@gmail.com' },
    { firstName: 'Harper', lastName: 'Gomez', email: 'harper@gmail.com' }
  ]
};

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
  'PLDT'
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
  'Marketing Manager',
  'HR Specialist'
];

const locations = [
  'Makati City',
  'Taguig City',
  'Quezon City',
  'Manila',
  'Pasig City'
];

const courseSkills = {
  'BS Information Technology': ['Web Development', 'Database Management', 'Network Administration', 'Software Testing', 'System Analysis', 'IT Project Management'],
  'BS Computer Science': ['Algorithm Design', 'Data Structures', 'Software Engineering', 'Artificial Intelligence', 'Machine Learning', 'Mobile App Development'],
  'BS Information Systems': ['Business Process Analysis', 'Information Management', 'Systems Integration', 'Data Analytics', 'IT Consulting', 'Business Intelligence'],
  'BS Business Administration': ['Strategic Planning', 'Marketing Management', 'Financial Analysis', 'Human Resource Management', 'Operations Management', 'Leadership'],
  'BS Accountancy': ['Financial Accounting', 'Cost Accounting', 'Auditing', 'Tax Preparation', 'Financial Reporting', 'Budget Analysis'],
  'BS Civil Engineering': ['Structural Design', 'Construction Management', 'AutoCAD', 'Project Planning', 'Surveying', 'Materials Testing'],
  'BS Electrical Engineering': ['Circuit Design', 'Power Systems', 'Electronics', 'Control Systems', 'PLC Programming', 'MATLAB'],
  'BS Mechanical Engineering': ['Mechanical Design', 'CAD/CAM', 'Thermodynamics', 'Manufacturing Processes', 'Materials Science', 'Quality Control'],
  'BS Psychology': ['Counseling', 'Psychological Assessment', 'Behavioral Analysis', 'Research Methods', 'Mental Health Support', 'Crisis Intervention'],
  'BS Nursing': ['Patient Care', 'Clinical Procedures', 'Medical-Surgical Nursing', 'Health Assessment', 'Medication Administration', 'Emergency Care'],
  'STEM': ['Critical Thinking', 'Scientific Research', 'Data Analysis', 'Problem Solving', 'Laboratory Skills', 'Mathematics'],
  'ABM': ['Business Analysis', 'Accounting Basics', 'Marketing Fundamentals', 'Economics', 'Financial Literacy', 'Business Communication'],
  'HUMSS': ['Social Research', 'Communication Skills', 'Creative Writing', 'Public Speaking', 'Critical Analysis', 'Psychology Basics'],
  'GAS': ['Academic Writing', 'Research', 'Communication', 'Problem Solving', 'Time Management', 'Presentation Skills'],
  'ICT': ['Computer Programming', 'Web Design', 'Network Fundamentals', 'Digital Graphics', 'Database Basics', 'Technical Support'],
  'HS': ['Basic Mathematics', 'Communication Skills', 'Computer Literacy', 'Critical Thinking', 'Time Management', 'Team Work']
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePassword(firstName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  return `${cleanFirst}12345*`;
}

function getSkillsForCourse(course) {
  const skills = courseSkills[course] || ['Communication', 'Problem Solving', 'Team Work', 'Leadership'];
  const numSkills = Math.floor(Math.random() * 3) + 4;
  const shuffled = [...skills].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numSkills).join(', ');
}

async function verifyAndFix() {
  console.log('🔍 Checking for missing alumni and users...\n');
  
  let totalExpected = 0;
  let totalMissing = 0;
  let totalAdded = 0;
  
  for (const [batch, alumniList] of Object.entries(expectedAlumni)) {
    const batchYear = parseInt(batch);
    const level = [2019, 2023].includes(batchYear) ? 'SENIOR_HIGH_SCHOOL' : 'COLLEGE';
    
    console.log(`\n📅 Checking Batch ${batch} (${level})...`);
    console.log('─'.repeat(70));
    
    for (const alumniData of alumniList) {
      totalExpected++;
      const { firstName, lastName, email } = alumniData;
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { alumni: true }
      });
      
      if (!existingUser) {
        console.log(`❌ Missing user: ${firstName} ${lastName} (${email})`);
        totalMissing++;
        
        // Create user
        const password = generatePassword(firstName);
        const hashedPassword = await bcrypt.hash(password, 10);
        const course = getRandomElement(courses);
        const skills = getSkillsForCourse(course);
        
        try {
          const newUser = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
              role: 'ALUMNI',
              approval_status: 'APPROVED',
              is_active: true,
              is_blocked: false,
              notification_enabled: true
            }
          });
          
          // Create alumni profile
          await prisma.alumni.create({
            data: {
              user_id: newUser.id,
              first_name: firstName,
              last_name: lastName,
              email,
              level,
              batch: batchYear,
              graduation_year: batchYear,
              course,
              current_position: getRandomElement(positions),
              company: getRandomElement(companies),
              location: getRandomElement(locations),
              is_public: true,
              is_verified: true,
              skills,
              bio: `Alumni from La Consolacion College Bacolod batch ${batchYear}. Graduated with ${course}. Currently working as ${getRandomElement(positions)} at ${getRandomElement(companies)}.`,
              contact_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`
            }
          });
          
          console.log(`   ✅ Added: ${firstName} ${lastName} with password: ${password}`);
          totalAdded++;
          
        } catch (error) {
          console.log(`   ⚠️  Error adding: ${error.message}`);
        }
        
      } else if (!existingUser.alumni) {
        console.log(`❌ User exists but missing alumni profile: ${firstName} ${lastName} (${email})`);
        totalMissing++;
        
        // Create alumni profile for existing user
        const course = getRandomElement(courses);
        const skills = getSkillsForCourse(course);
        
        try {
          await prisma.alumni.create({
            data: {
              user_id: existingUser.id,
              first_name: firstName,
              last_name: lastName,
              email,
              level,
              batch: batchYear,
              graduation_year: batchYear,
              course,
              current_position: getRandomElement(positions),
              company: getRandomElement(companies),
              location: getRandomElement(locations),
              is_public: true,
              is_verified: true,
              skills,
              bio: `Alumni from La Consolacion College Bacolod batch ${batchYear}. Graduated with ${course}.`,
              contact_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`
            }
          });
          
          console.log(`   ✅ Added alumni profile for: ${firstName} ${lastName}`);
          totalAdded++;
          
        } catch (error) {
          console.log(`   ⚠️  Error adding alumni profile: ${error.message}`);
        }
        
      } else {
        console.log(`   ✓ OK: ${firstName} ${lastName}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`📋 Total Expected: ${totalExpected}`);
  console.log(`❌ Total Missing: ${totalMissing}`);
  console.log(`✅ Total Added: ${totalAdded}`);
  console.log('═'.repeat(70));
}

async function main() {
  try {
    await verifyAndFix();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
