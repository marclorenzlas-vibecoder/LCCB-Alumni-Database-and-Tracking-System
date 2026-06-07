const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🎯 Fixing sample alumni courses to match All Groups options...');

    const updates = [
      { email: 'maria.reyes@gmail.com', course: 'Integrated School - Junior High' },
      { email: 'jose.cruz@gmail.com', course: 'Night High' },
      { email: 'ana.lopez@gmail.com', course: 'Senior High School' },
      { email: 'david.tan@gmail.com', course: 'SBIT' },
      { email: 'lizagarcia@gmail.com', course: 'Master in Business Administration' },
      { email: 'paolo.mendoza@gmail.com', course: 'Integrated School - Elementary' },
      { email: 'bianca.santos@gmail.com', course: 'Night High' },
      { email: 'kevin.ramos@gmail.com', course: 'Senior High School' },
      { email: 'nicole.villanueva@gmail.com', course: 'SARFAID' },
      { email: 'adrian.flores@gmail.com', course: 'B.S. in Business Administration' },
      { email: 'jasmine.navarro@gmail.com', course: 'Master in Business Administration - Human Resource Management' },
      { email: 'ethan.delacruz@gmail.com', course: 'SBIT' },
      { email: 'camille.agustin@gmail.com', course: 'Senior High School' },
      { email: 'bryan.lim@gmail.com', course: 'Night High' },
      { email: 'angela.pascual@gmail.com', course: 'Integrated School - Junior High' }
    ];

    for (const item of updates) {
      const found = await prisma.alumni.findFirst({
        where: { email: item.email },
        select: { id: true, first_name: true, last_name: true, course: true }
      });

      if (!found) {
        console.log(`- Not found: ${item.email}`);
        continue;
      }

      await prisma.alumni.update({
        where: { id: found.id },
        data: { course: item.course }
      });

      console.log(
        `+ Updated ${found.first_name} ${found.last_name}: ${found.course || 'N/A'} -> ${item.course}`
      );
    }

    console.log('\n✅ Course normalization complete.');
  } catch (error) {
    console.error('❌ Error fixing courses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
