const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  // Count users with Gmail
  const users = await prisma.user.count({
    where: {
      email: {
        endsWith: '@gmail.com'
      }
    }
  });
  
  // Count alumni with Gmail
  const alumni = await prisma.alumni.count({
    where: {
      email: {
        endsWith: '@gmail.com'
      }
    }
  });
  
  // Find users without alumni profile
  const usersWithoutAlumni = await prisma.user.findMany({
    where: {
      email: { endsWith: '@gmail.com' },
      alumni: null
    },
    select: {
      id: true,
      email: true,
      username: true
    }
  });
  
  // Find alumni without user
  const alumniWithoutUser = await prisma.alumni.findMany({
    where: {
      email: { endsWith: '@gmail.com' },
      user: null
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true
    }
  });
  
  console.log('═'.repeat(70));
  console.log('📊 DATABASE STATUS');
  console.log('═'.repeat(70));
  console.log(`👤 Total Gmail Users: ${users}`);
  console.log(`🎓 Total Gmail Alumni: ${alumni}`);
  console.log('');
  
  if (usersWithoutAlumni.length > 0) {
    console.log(`❌ Users without alumni profile: ${usersWithoutAlumni.length}`);
    usersWithoutAlumni.forEach(u => {
      console.log(`   - ${u.email} (User ID: ${u.id})`);
    });
  } else {
    console.log('✅ All users have alumni profiles');
  }
  
  console.log('');
  
  if (alumniWithoutUser.length > 0) {
    console.log(`❌ Alumni without user account: ${alumniWithoutUser.length}`);
    alumniWithoutUser.forEach(a => {
      console.log(`   - ${a.first_name} ${a.last_name} (${a.email})`);
    });
  } else {
    console.log('✅ All alumni have user accounts');
  }
  
  console.log('═'.repeat(70));
  
  await prisma.$disconnect();
}

checkTables();
