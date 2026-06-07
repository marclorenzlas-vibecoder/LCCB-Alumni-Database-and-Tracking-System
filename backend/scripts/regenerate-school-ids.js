const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomDigits(length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

function generateSchoolId() {
  // Format: 21-NNNN-NNN (fixed 21, then 4 random digits, then 3 random digits)
  return `21-${randomDigits(4)}-${randomDigits(3)}`;
}

async function generateUniqueSchoolId(usedIds) {
  let attempts = 0;
  while (attempts < 1000) {
    const candidate = generateSchoolId();
    if (!usedIds.has(candidate)) {
      const existing = await prisma.alumni.findUnique({ where: { student_id: candidate } });
      if (!existing) {
        usedIds.add(candidate);
        return candidate;
      }
    }
    attempts += 1;
  }
  throw new Error('Unable to generate a unique School ID after many attempts.');
}

async function main() {
  try {
    console.log('🔄 Regenerating all school IDs to format 21-NNNN-NNN...');

    const allAlumni = await prisma.alumni.findMany({
      where: { student_id: { not: null } },
      select: { id: true, first_name: true, last_name: true, student_id: true }
    });

    const usedIds = new Set();
    let updated = 0;

    for (const alumnus of allAlumni) {
      const newSchoolId = await generateUniqueSchoolId(usedIds);
      
      await prisma.alumni.update({
        where: { id: alumnus.id },
        data: { student_id: newSchoolId }
      });

      console.log(
        `+ ${alumnus.first_name} ${alumnus.last_name}: ${alumnus.student_id} -> ${newSchoolId}`
      );
      updated += 1;
    }

    console.log(`\n✅ Done. Updated ${updated} school IDs to format 21-NNNN-NNN.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
