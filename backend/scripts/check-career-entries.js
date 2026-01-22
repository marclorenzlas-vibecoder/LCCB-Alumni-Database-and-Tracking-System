const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCareerEntries() {
  try {
    console.log('📋 Checking career entries...\n');
    
    const careers = await prisma.career_entry.findMany({
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: { start_date: 'desc' }
    });
    
    if (careers.length === 0) {
      console.log('❌ No career entries found in database');
    } else {
      console.log(`✅ Found ${careers.length} career entries:\n`);
      careers.forEach((career, index) => {
        console.log(`${index + 1}. ${career.alumni?.first_name} ${career.alumni?.last_name}`);
        console.log(`   Job: ${career.job_title} at ${career.company}`);
        console.log(`   Start: ${career.start_date}`);
        console.log(`   Current: ${career.is_current}`);
        console.log(`   Alumni ID: ${career.alumni_id}\n`);
      });
    }
    
    console.log('\n📋 Checking accepted job applications...\n');
    
    const acceptedApps = await prisma.job_application.findMany({
      where: { status: 'ACCEPTED' },
      include: {
        applicant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        },
        job_posting: {
          select: {
            job_title: true,
            company: true
          }
        }
      }
    });
    
    if (acceptedApps.length === 0) {
      console.log('❌ No accepted applications found');
    } else {
      console.log(`✅ Found ${acceptedApps.length} accepted applications:\n`);
      acceptedApps.forEach((app, index) => {
        console.log(`${index + 1}. ${app.applicant?.first_name} ${app.applicant?.last_name}`);
        console.log(`   Job: ${app.job_posting.job_title} at ${app.job_posting.company}`);
        console.log(`   Applicant ID: ${app.applicant_id}`);
        console.log(`   Status: ${app.status}\n`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCareerEntries();
