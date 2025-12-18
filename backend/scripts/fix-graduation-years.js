const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGraduationYears() {
  try {
    // Find alumni where graduation_year equals batch (meaning it was auto-filled)
    // and update to a reasonable graduation year
    const alumni = await prisma.alumni.findMany({
      where: {
        AND: [
          { batch: { not: null } },
          { graduation_year: { not: null } }
        ]
      }
    });
    
    console.log(`Found ${alumni.length} alumni records to check`);
    
    for (const a of alumni) {
      if (a.graduation_year === a.batch) {
        console.log(`\nFound mismatch: ${a.first_name} ${a.last_name}`);
        console.log(`  Batch: ${a.batch}, Grad Year: ${a.graduation_year}`);
        console.log(`  This looks like graduation_year was auto-filled from batch`);
        
        // You can uncomment this to auto-fix with a reasonable graduation year
        // For example, add 4 years to batch for college, or adjust based on level
        // const newGradYear = a.batch + 4;
        // await prisma.alumni.update({
        //   where: { id: a.id },
        //   data: { graduation_year: newGradYear }
        // });
        // console.log(`  Updated grad year to: ${newGradYear}`);
      }
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGraduationYears();
