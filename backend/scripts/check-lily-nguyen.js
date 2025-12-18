const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLily() {
  console.log('🔍 Searching for Lily Nguyen...\n');
  
  // Check user table
  const user = await prisma.user.findUnique({
    where: { email: 'lily@gmail.com' },
    include: { alumni: true }
  });
  
  // Check alumni table
  const alumni = await prisma.alumni.findFirst({
    where: {
      OR: [
        { email: 'lily@gmail.com' },
        { first_name: 'Lily', last_name: 'Nguyen' }
      ]
    },
    include: { user: true }
  });
  
  console.log('📧 Checking email: lily@gmail.com');
  console.log('─'.repeat(70));
  
  if (user) {
    console.log('✅ USER FOUND:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.approval_status}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Has Alumni Profile: ${user.alumni ? 'YES' : 'NO'}`);
  } else {
    console.log('❌ USER NOT FOUND');
  }
  
  console.log('');
  
  if (alumni) {
    console.log('✅ ALUMNI FOUND:');
    console.log(`   ID: ${alumni.id}`);
    console.log(`   Name: ${alumni.first_name} ${alumni.last_name}`);
    console.log(`   Email: ${alumni.email}`);
    console.log(`   Batch: ${alumni.batch}`);
    console.log(`   Level: ${alumni.level}`);
    console.log(`   Course: ${alumni.course}`);
    console.log(`   User ID: ${alumni.user_id}`);
    console.log(`   Has User Account: ${alumni.user ? 'YES' : 'NO'}`);
  } else {
    console.log('❌ ALUMNI NOT FOUND');
  }
  
  console.log('\n' + '═'.repeat(70));
  
  if (!user && !alumni) {
    console.log('❌ Lily Nguyen is MISSING from both tables!');
    console.log('💡 Will create account now...');
    await createLilyNguyen();
  } else if (!user && alumni) {
    console.log('⚠️  Alumni exists but USER is missing!');
    console.log('💡 Will create user account...');
    await createUserForAlumni(alumni);
  } else if (user && !alumni) {
    console.log('⚠️  User exists but ALUMNI PROFILE is missing!');
    console.log('💡 Will create alumni profile...');
    await createAlumniForUser(user);
  } else {
    console.log('✅ Lily Nguyen is complete in both tables!');
  }
  
  await prisma.$disconnect();
}

async function createLilyNguyen() {
  const bcrypt = require('bcryptjs');
  
  console.log('\n🔧 Creating Lily Nguyen...');
  
  const password = 'lily12345*';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email: 'lily@gmail.com',
      password: hashedPassword,
      username: 'lily.nguyen',
      role: 'ALUMNI',
      approval_status: 'APPROVED',
      is_active: true,
      is_blocked: false,
      notification_enabled: true
    }
  });
  
  console.log(`✅ User created (ID: ${user.id})`);
  
  // Create alumni profile
  const alumni = await prisma.alumni.create({
    data: {
      user_id: user.id,
      first_name: 'Lily',
      last_name: 'Nguyen',
      email: 'lily@gmail.com',
      level: 'SENIOR_HIGH_SCHOOL',
      batch: 2023,
      graduation_year: 2023,
      course: 'STEM',
      current_position: 'Junior Developer',
      company: 'TechVision Philippines Inc.',
      location: 'Makati City',
      is_public: true,
      is_verified: true,
      skills: 'Critical Thinking, Scientific Research, Data Analysis, Problem Solving, Laboratory Skills',
      bio: 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with STEM. Currently working as Junior Developer at TechVision Philippines Inc.',
      contact_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`
    }
  });
  
  console.log(`✅ Alumni profile created (ID: ${alumni.id})`);
  console.log(`✅ Login: lily@gmail.com / lily12345*`);
}

async function createUserForAlumni(alumni) {
  const bcrypt = require('bcryptjs');
  
  console.log('\n🔧 Creating user for existing alumni...');
  
  const password = 'lily12345*';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email: alumni.email,
      password: hashedPassword,
      username: 'lily.nguyen',
      role: 'ALUMNI',
      approval_status: 'APPROVED',
      is_active: true,
      is_blocked: false,
      notification_enabled: true
    }
  });
  
  // Link alumni to user
  await prisma.alumni.update({
    where: { id: alumni.id },
    data: { user_id: user.id }
  });
  
  console.log(`✅ User created and linked (ID: ${user.id})`);
  console.log(`✅ Login: lily@gmail.com / lily12345*`);
}

async function createAlumniForUser(user) {
  console.log('\n🔧 Creating alumni profile for existing user...');
  
  const alumni = await prisma.alumni.create({
    data: {
      user_id: user.id,
      first_name: 'Lily',
      last_name: 'Nguyen',
      email: 'lily@gmail.com',
      level: 'SENIOR_HIGH_SCHOOL',
      batch: 2023,
      graduation_year: 2023,
      course: 'STEM',
      current_position: 'Junior Developer',
      company: 'TechVision Philippines Inc.',
      location: 'Makati City',
      is_public: true,
      is_verified: true,
      skills: 'Critical Thinking, Scientific Research, Data Analysis, Problem Solving, Laboratory Skills',
      bio: 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with STEM.',
      contact_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`
    }
  });
  
  console.log(`✅ Alumni profile created (ID: ${alumni.id})`);
}

findLily();
