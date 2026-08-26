const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🗑️ Removing previously added Tokyo alumni...');

    const tokyoAlumni = await prisma.alumni.findMany({
      where: {
        email: {
          in: ['yukitanaka@gmail.com', 'kenjiyamamoto@gmail.com', 'sakurasuzuki@gmail.com']
        }
      },
      select: { id: true, first_name: true, last_name: true, email: true }
    });

    for (const alumnus of tokyoAlumni) {
      await prisma.alumni.delete({ where: { id: alumnus.id } });
      console.log(`- Deleted: ${alumnus.first_name} ${alumnus.last_name} (${alumnus.email})`);
    }

    console.log(`\n✅ Done. Removed ${tokyoAlumni.length} alumni.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
