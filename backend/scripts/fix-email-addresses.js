const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📧 Fixing email addresses (removing middle dots only)...');

    const allAlumni = await prisma.alumni.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true, first_name: true, last_name: true }
    });

    let updated = 0;

    for (const alumnus of allAlumni) {
      if (!alumnus.email) continue;

      // Only process emails with gmail and fix format
      // Pattern: firstname.lastname@gmail.com -> firstnamelastname@gmail.com
      const match = alumnus.email.match(/^([^@]+)@gmail\.com$/);
      if (!match) continue;

      const localPart = match[1];
      
      // If there's a dot in the local part, remove it
      if (localPart.includes('.')) {
        const newLocalPart = localPart.replace(/\./g, '');
        const newEmail = `${newLocalPart}@gmail.com`;

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
    }

    console.log(`\n✅ Done. Fixed ${updated} email addresses.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
