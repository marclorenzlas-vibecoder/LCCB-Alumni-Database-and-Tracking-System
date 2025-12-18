const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUsernames() {
  console.log('🔧 Fixing alumni usernames...\n');
  
  // Get all users with Gmail accounts
  const users = await prisma.user.findMany({
    where: {
      email: { endsWith: '@gmail.com' }
    },
    include: {
      alumni: true
    }
  });
  
  console.log(`Found ${users.length} Gmail users\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const user of users) {
    if (user.alumni) {
      const alumni = user.alumni;
      const newUsername = `${alumni.first_name} ${alumni.last_name}`;
      
      if (user.username !== newUsername) {
        await prisma.user.update({
          where: { id: user.id },
          data: { username: newUsername }
        });
        
        console.log(`✅ Updated: ${user.username} → ${newUsername}`);
        updated++;
      } else {
        console.log(`✓ Already correct: ${user.username}`);
        skipped++;
      }
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Updated: ${updated}`);
  console.log(`✓ Already correct: ${skipped}`);
  console.log(`📋 Total processed: ${users.length}`);
  console.log('═'.repeat(70));
  
  await prisma.$disconnect();
}

fixUsernames();
