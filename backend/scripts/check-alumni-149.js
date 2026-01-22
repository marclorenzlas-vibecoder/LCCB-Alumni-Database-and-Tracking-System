const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlumni() {
  try {
    const alumni = await prisma.alumni.findUnique({
      where: { id: 149 },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true
      }
    });
    
    console.log('Alumni ID 149:', JSON.stringify(alumni, null, 2));
    
    // Now try to manually create a career entry for this alumni
    if (alumni) {
      console.log('\nAttempting to create career entry for Jace Randall...');
      
      const jobApp = await prisma.job_application.findFirst({
        where: {
          applicant_id: 149,
          status: 'ACCEPTED'
        },
        include: {
          job_posting: true
        }
      });
      
      if (jobApp) {
        console.log('Found accepted application:', {
          job: jobApp.job_posting.job_title,
          company: jobApp.job_posting.company
        });
        
        const career = await prisma.career_entry.create({
          data: {
            alumni_id: 149,
            job_title: jobApp.job_posting.job_title,
            company: jobApp.job_posting.company,
            start_date: new Date(),
            is_current: true,
            description: 'Position obtained through LCCB Alumni job posting'
          }
        });
        
        console.log('✅ Career entry created:', career);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlumni();
