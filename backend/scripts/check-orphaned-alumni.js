const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrphanedAlumni() {
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM alumni 
      WHERE user_id IS NOT NULL 
      AND user_id NOT IN (SELECT id FROM user)
    `;
    console.log('Alumni with invalid user_id:', result);
    
    const orphaned = await prisma.$queryRaw`
      SELECT id, user_id, first_name, last_name, email 
      FROM alumni 
      WHERE user_id IS NOT NULL 
      AND user_id NOT IN (SELECT id FROM user)
    `;
    console.log('\nOrphaned records:', orphaned);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphanedAlumni();
