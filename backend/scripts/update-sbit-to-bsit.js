const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🎓 Updating all SBIT courses to BSIT...');

    const updated = await prisma.alumni.updateMany({
      where: { course: 'SBIT' },
      data: { course: 'BSIT' }
    });

    console.log(`+ Updated ${updated.count} alumni from SBIT to BSIT`);
    console.log('\n✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
