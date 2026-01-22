const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAcceptedApplicationsToCareer() {
  try {
    await prisma.$connect();
    console.log('🔄 Starting sync of accepted applications to employment history...');

    // Get all accepted job applications
    const acceptedApplications = await prisma.job_application.findMany({
      where: {
        status: 'ACCEPTED'
      },
      include: {
        applicant: true,
        job_posting: {
          select: {
            id: true,
            job_title: true,
            company: true,
            location: true
          }
        }
      }
    });

    console.log(`📊 Found ${acceptedApplications.length} accepted applications`);

    let created = 0;
    let skipped = 0;

    for (const application of acceptedApplications) {
      try {
        // Check if career record already exists
        const existingCareer = await prisma.career_entry.findFirst({
          where: {
            alumni_id: application.applicant.id,
            job_title: application.job_posting.job_title,
            company: application.job_posting.company
          }
        });

        if (existingCareer) {
          console.log(`⏭️  Skipping: ${application.job_posting.job_title} at ${application.job_posting.company} (already exists)`);
          skipped++;
          continue;
        }

        // Create new career record
        await prisma.career_entry.create({
          data: {
            alumni_id: application.applicant.id,
            job_title: application.job_posting.job_title,
            company: application.job_posting.company,
            start_date: application.reviewed_at || application.applied_at || new Date(),
            is_current: true,
            description: `Position obtained through LCCB Alumni job posting`
          }
        });

        console.log(`✅ Created: ${application.job_posting.job_title} at ${application.job_posting.company} for alumni #${application.applicant.id}`);
        created++;

      } catch (error) {
        console.error(`❌ Error processing application #${application.id}:`, error.message);
      }
    }

    console.log('\n📈 Sync Summary:');
    console.log(`   - Created: ${created} new employment records`);
    console.log(`   - Skipped: ${skipped} existing records`);
    console.log(`   - Total processed: ${acceptedApplications.length}`);
    console.log('✨ Sync completed successfully!');

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncAcceptedApplicationsToCareer();
