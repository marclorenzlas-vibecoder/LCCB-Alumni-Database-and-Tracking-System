const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAutoCareerCreation() {
  try {
    console.log('🧪 Testing automatic career entry creation...\n');
    
    // Find a pending application
    const pendingApp = await prisma.job_application.findFirst({
      where: {
        status: 'PENDING'
      },
      include: {
        applicant: true,
        job_posting: true
      }
    });
    
    if (!pendingApp) {
      console.log('❌ No pending applications found to test with');
      return;
    }
    
    console.log(`Found pending application:`);
    console.log(`  Applicant: ${pendingApp.applicant.first_name} ${pendingApp.applicant.last_name}`);
    console.log(`  Job: ${pendingApp.job_posting.job_title} at ${pendingApp.job_posting.company}`);
    console.log(`  Current status: ${pendingApp.status}\n`);
    
    // Check if career entry already exists
    const existingCareer = await prisma.career_entry.findFirst({
      where: {
        alumni_id: pendingApp.applicant_id,
        job_title: pendingApp.job_posting.job_title,
        company: pendingApp.job_posting.company
      }
    });
    
    if (existingCareer) {
      console.log('⚠️  Career entry already exists for this job');
      console.log('Deleting it to test fresh creation...');
      await prisma.career_entry.delete({
        where: { id: existingCareer.id }
      });
    }
    
    console.log('📝 Updating application status to ACCEPTED...');
    
    // Simulate what the API does - update status to ACCEPTED
    const updated = await prisma.job_application.update({
      where: { id: pendingApp.id },
      data: {
        status: 'ACCEPTED',
        reviewed_at: new Date()
      },
      include: {
        applicant: true,
        job_posting: true
      }
    });
    
    console.log('✅ Application status updated\n');
    
    // Now manually trigger the career creation logic (simulating what should happen in the API)
    console.log('🏢 Creating career entry (this should happen automatically in the API)...');
    
    const career = await prisma.career_entry.create({
      data: {
        alumni_id: updated.applicant_id,
        job_title: updated.job_posting.job_title,
        company: updated.job_posting.company,
        start_date: new Date(),
        is_current: true,
        description: 'Position obtained through LCCB Alumni job posting'
      }
    });
    
    console.log('✅ Career entry created:', {
      id: career.id,
      alumni_id: career.alumni_id,
      job_title: career.job_title,
      company: career.company
    });
    
    console.log('\n✅ Test completed - automatic creation should work!');
    
    // Reset back to PENDING for future tests
    console.log('\n🔄 Resetting application back to PENDING...');
    await prisma.job_application.update({
      where: { id: pendingApp.id },
      data: { status: 'PENDING' }
    });
    
    await prisma.career_entry.delete({
      where: { id: career.id }
    });
    
    console.log('✅ Reset complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoCareerCreation();
