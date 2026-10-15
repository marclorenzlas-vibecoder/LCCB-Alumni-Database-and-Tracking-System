const prisma = require('../config/prisma');

let syncPromise = null;

/**
 * Resets a PostgreSQL sequence to the maximum existing value in the table
 * so that auto-increment / serial IDs do not throw unique constraint violations.
 */
const syncTableSequence = async (tableName, idColumn = 'id') => {
  try {
    const maxRes = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(${idColumn}), 0) as max_id FROM "${tableName}";`);
    const maxId = Number(maxRes[0]?.max_id || 0);

    const seqRes = await prisma.$queryRawUnsafe(`SELECT pg_get_serial_sequence('"${tableName}"', '${idColumn}') as seq;`);
    const seqName = seqRes[0]?.seq;

    if (seqName) {
      await prisma.$queryRawUnsafe(`SELECT setval('${seqName}', ${Math.max(maxId, 1)}, true);`);
    } else {
      try {
        await prisma.$queryRawUnsafe(`SELECT setval('${tableName}_${idColumn}_seq', ${Math.max(maxId, 1)}, true);`);
      } catch {
        // Table may not have a serial sequence
      }
    }
  } catch (err) {
    console.warn(`Could not sync sequence for table "${tableName}":`, err.message);
  }
};

const syncAllSequences = async () => {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
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
      await syncTableSequence(table);
    }
    console.log('✅ Database sequences synchronized with table MAX(id)');
  })().catch((err) => {
    console.error('Error synchronizing database sequences:', err.message);
  });
  return syncPromise;
};

module.exports = {
  syncTableSequence,
  syncAllSequences
};
