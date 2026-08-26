const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📧 Removing dots from all alumni emails...');

    const allAlumni = await prisma.alumni.findMany({
      where: { email: { contains: '.' } },
      select: { id: true, email: true, first_name: true, last_name: true }
    });

    let updated = 0;

    for (const alumnus of allAlumni) {
      if (!alumnus.email || !alumnus.email.includes('@gmail.com')) continue;

      // Remove the dot before @gmail.com
      const newEmail = alumnus.email.replace('.', '') === alumnus.email 
        ? alumnus.email 
        : alumnus.email.replace('.', '');

      if (newEmail === alumnus.email) continue;

      // Check if new email already exists
      const exists = await prisma.alumni.findFirst({
        where: { email: newEmail, id: { not: alumnus.id } }
      });

      if (exists) {
        console.log(`- Skipped ${alumnus.first_name} ${alumnus.last_name}: ${newEmail} already exists`);
        continue;
      }

      await prisma.alumni.update({
        where: { id: alumnus.id },
        data: { email: newEmail }
      });

      console.log(`+ Updated ${alumnus.first_name} ${alumnus.last_name}: ${alumnus.email} -> ${newEmail}`);
      updated += 1;
    }

    console.log(`\n✅ Done. Updated ${updated} email addresses.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
