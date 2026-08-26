const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normalizeEmail(email) {
  if (!email) return null;

  const raw = String(email).trim().toLowerCase();
  const atIndex = raw.indexOf('@');

  if (atIndex === -1) return null;

  let local = raw.slice(0, atIndex);
  let domain = raw.slice(atIndex + 1);

  // Repair common accidental domain typo first.
  if (domain === 'gmailcom') {
    domain = 'gmail.com';
  }

  if (domain !== 'gmail.com') {
    return null;
  }

  // User requested no dot in the email name part.
  local = local.replace(/\./g, '');

  if (!local) return null;

  return `${local}@gmail.com`;
}

async function buildUniqueEmail(baseEmail, currentId) {
  const [baseLocal] = baseEmail.split('@');
  let candidate = baseEmail;
  let suffix = 1;

  while (true) {
    const exists = await prisma.alumni.findFirst({
      where: {
        email: candidate,
        id: { not: currentId }
      },
      select: { id: true }
    });

    if (!exists) return candidate;

    candidate = `${baseLocal}${suffix}@gmail.com`;
    suffix += 1;
  }
}

async function main() {
  try {
    console.log('📧 Normalizing alumni emails...');

    const rows = await prisma.alumni.findMany({
      where: { email: { not: null } },
      select: { id: true, first_name: true, last_name: true, email: true }
    });

    let updated = 0;

    for (const row of rows) {
      const normalizedBase = normalizeEmail(row.email);
      if (!normalizedBase) continue;

      const uniqueEmail = await buildUniqueEmail(normalizedBase, row.id);

      if (uniqueEmail === row.email) continue;

      await prisma.alumni.update({
        where: { id: row.id },
        data: { email: uniqueEmail }
      });

      console.log(`+ ${row.first_name} ${row.last_name}: ${row.email} -> ${uniqueEmail}`);
      updated += 1;
    }

    console.log(`\n✅ Done. Updated ${updated} alumni emails.`);
  } catch (error) {
    console.error('❌ Failed to normalize emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
