const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEmptyLevels() {
  try {
    console.log('Fixing empty level values...');
    
    // Update empty strings to NULL
    const result = await prisma.$executeRaw`
      UPDATE alumni 
      SET level = NULL 
      WHERE level = ''
    `;
    
    console.log(`Updated ${result} alumni records with empty level to NULL`);
    
    // Also fix pending_registration if needed
    const result2 = await prisma.$executeRaw`
      UPDATE pending_registration 
      SET level = NULL 
      WHERE level = ''
    `;
    
    console.log(`Updated ${result2} pending registration records with empty level to NULL`);
    
    console.log('\nDone! The API should now work correctly.');
    
  } catch (error) {
    console.error('Error fixing empty levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmptyLevels();
