const prisma = require('../src/config/prisma');

async function fixSequences() {
  console.log('Synchronizing PostgreSQL sequences with table max IDs...');

  const tables = [
    'user',
    'alumni',
    'alumni_list',
    'alumni_education_history',
    'achievement',
    'career_entry',
    'batch_officer',
    'social_link',
    'deceased_report',
    'job_posting',
    'job_application',
    'event',
    'event_attendance',
    'event_gallery',
    'activity_log',
    'notification',
    'donation',
    'donation_image',
    'receipt_submission',
    'pending_registration',
    'google_accounts'
  ];

  for (const table of tables) {
    try {
      const maxRes = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${table}";`);
      const maxId = Number(maxRes[0]?.max_id || 0);

      // Find sequence name
      const seqRes = await prisma.$queryRawUnsafe(`SELECT pg_get_serial_sequence('"${table}"', 'id') as seq;`);
      const seqName = seqRes[0]?.seq;

      if (seqName) {
        const nextVal = Math.max(maxId, 1);
        await prisma.$queryRawUnsafe(`SELECT setval('${seqName}', ${nextVal}, true);`);
        console.log(`✅ Table "${table}": sequence "${seqName}" updated to ${nextVal} (max id: ${maxId})`);
      } else {
        // Fallback try standard convention table_id_seq
        try {
          const fallbackSeq = `"${table}_id_seq"`;
          const nextVal = Math.max(maxId, 1);
          await prisma.$queryRawUnsafe(`SELECT setval('${table}_id_seq', ${nextVal}, true);`);
          console.log(`✅ Table "${table}": sequence ${fallbackSeq} updated to ${nextVal} (max id: ${maxId})`);
        } catch (seqErr) {
          console.log(`ℹ️ Table "${table}" has no id sequence: ${seqErr.message}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not sync table "${table}":`, err.message);
    }
  }

  console.log('Sequence synchronization completed.');
}

fixSequences()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
