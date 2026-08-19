const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function migrateData() {
  console.log('Starting migration from MySQL to Supabase PostgreSQL...');

  const connection = await mysql.createConnection(process.env.LOCAL_MYSQL_URL);
  
  try {
    const tablesToMigrate = [
      { mysqlTable: 'pending_registration', prismaModel: 'pending_registration' },
      { mysqlTable: 'user', prismaModel: 'user' },
      { mysqlTable: 'google_accounts', prismaModel: 'GoogleAccount' },
      { mysqlTable: 'teacher', prismaModel: 'teacher' },
      { mysqlTable: 'alumni', prismaModel: 'alumni' },
      { mysqlTable: 'alumni_list', prismaModel: 'alumni_list' },
      { mysqlTable: 'alumni_education_history', prismaModel: 'alumni_education_history' },
      { mysqlTable: 'achievement', prismaModel: 'achievement' },
      { mysqlTable: 'career_entry', prismaModel: 'career_entry' },
      { mysqlTable: 'batch_officer', prismaModel: 'batch_officer' },
      { mysqlTable: 'social_link', prismaModel: 'social_link' },
      { mysqlTable: 'deceased_report', prismaModel: 'deceased_report' },
      { mysqlTable: 'job_posting', prismaModel: 'job_posting' },
      { mysqlTable: 'job_application', prismaModel: 'job_application' },
      { mysqlTable: 'event', prismaModel: 'event' },
      { mysqlTable: 'event_attendance', prismaModel: 'event_attendance' },
      { mysqlTable: 'event_gallery', prismaModel: 'event_gallery' },
      { mysqlTable: 'activity_log', prismaModel: 'activity_log' },
      { mysqlTable: 'notification', prismaModel: 'notification' },
      { mysqlTable: 'donation', prismaModel: 'donation' },
      { mysqlTable: 'donation_image', prismaModel: 'donation_image' },
      { mysqlTable: 'receipt_submission', prismaModel: 'receipt_submission' }
    ];

    for (const table of tablesToMigrate) {
      console.log(`Migrating table: ${table.mysqlTable}...`);
      let rows = [];
      try {
        const [result] = await connection.query(`SELECT * FROM \`${table.mysqlTable}\``);
        rows = result;
      } catch (e) {
        console.log(`Skipping ${table.mysqlTable}: Table does not exist in MySQL.`);
        continue;
      }
      
      if (rows.length === 0) {
        console.log(`Skipping ${table.mysqlTable}: 0 rows.`);
        continue;
      }

      // Convert MySQL TinyInt (0/1) to Booleans for Postgres where necessary
      const booleanFields = [
        'is_public', 'is_student_id_public', 'is_date_of_birth_public', 'is_course_public', 
        'is_graduation_year_public', 'is_education_history_public', 'is_email_public', 'is_phone_public', 
        'is_position_public', 'is_company_public', 'is_employment_public', 'is_location_public', 
        'is_social_links_public', 'is_skills_public', 'is_verified', 'is_current', 'accepts_money', 
        'accepts_items', 'send_notification', 'notified_current', 'attended', 'is_active', 'is_blocked', 
        'notification_enabled', 'notification_prompt_shown', 'notify_events', 'notify_achievements', 
        'notify_donations', 'notify_jobs', 'show_donation_toasts', 'notify_pending_registrations', 
        'notify_job_applications', 'consent_core', 'is_read'
      ];

      const mappedRows = rows.map(row => {
        const newRow = { ...row };
        for (const key of Object.keys(newRow)) {
          // Convert TinyInt to Boolean
          if (booleanFields.includes(key) && newRow[key] !== null) {
            newRow[key] = newRow[key] === 1;
          }
          // PostgreSQL Prisma doesn't accept Date strings for Date fields if they are invalid, but MySQL might have '0000-00-00'
          if (newRow[key] instanceof Date) {
            if (isNaN(newRow[key].getTime())) {
               newRow[key] = null;
            }
          }
        }
        if (table.prismaModel === 'GoogleAccount') {
          return {
            id: newRow.id,
            userId: newRow.user_id,
            googleId: newRow.google_id,
            email: newRow.email,
            name: newRow.name,
            picture: newRow.picture,
            accessToken: newRow.access_token,
            refreshToken: newRow.refresh_token,
            role: newRow.role,
            createdAt: newRow.created_at,
            updatedAt: newRow.updated_at
          };
        }
        return newRow;
      });

      // Insert into Postgres via Prisma
      try {
        if (table.mysqlTable === 'alumni_education_history') {
          for (const mappedRow of mappedRows) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO alumni_education_history (id, alumni_id, level, batch, graduation_year, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO NOTHING
            `, mappedRow.id, mappedRow.alumni_id, mappedRow.level, mappedRow.batch, mappedRow.graduation_year, mappedRow.created_at, mappedRow.updated_at);
          }
          console.log(`Successfully migrated ${rows.length} rows for ${table.mysqlTable}.`);
        } else {
          await prisma[table.prismaModel].createMany({
            data: mappedRows,
            skipDuplicates: true
          });
          console.log(`Successfully migrated ${rows.length} rows for ${table.mysqlTable}.`);
        }
      } catch (err) {
        console.error(`Error inserting into ${table.mysqlTable}:`, err.message);
      }
    }

    console.log('Migration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
    await prisma.$disconnect();
  }
}

migrateData();
