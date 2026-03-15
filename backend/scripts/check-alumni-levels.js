const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlumniData() {
  try {
    console.log('Checking alumni data...\n');
    
    // Get all alumni with their levels
    const alumni = await prisma.$queryRaw`
      SELECT id, first_name, last_name, level, batch 
      FROM alumni 
      LIMIT 10
    `;
    
    console.log('Sample alumni records:');
    console.table(alumni);
    
    // Check distinct level values
    const levels = await prisma.$queryRaw`
      SELECT DISTINCT level, COUNT(*) as count 
      FROM alumni 
      WHERE level IS NOT NULL
      GROUP BY level
    `;
    
    console.log('\nDistinct level values in database:');
    console.table(levels);
    
    // Check enum definition
    const enumDef = await prisma.$queryRaw`
      SHOW COLUMNS FROM alumni LIKE 'level'
    `;
    
    console.log('\nLevel column definition:');
    console.table(enumDef);
    
  } catch (error) {
    console.error('Error checking alumni data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlumniData();
