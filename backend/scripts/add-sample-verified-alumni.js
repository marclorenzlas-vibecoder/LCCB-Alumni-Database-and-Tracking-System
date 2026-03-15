const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to add sample verified alumni with School IDs
 * This demonstrates how to populate the alumni database for verification purposes
 */

async function addSampleAlumni() {
  try {
    console.log('📝 Adding sample verified alumni to database...\n');

    const sampleAlumni = [
      {
        student_id: '21-0087-958',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe.alumni@example.com',
        contact_number: '09611001684',
        level: 'Senior_High_school',
        course: 'GAS',
        batch: 2020,
        graduation_year: 2021,
        is_verified: true
      },
      // Add more sample alumni here
    ];

    for (const alumni of sampleAlumni) {
      // Check if already exists
      const existing = await prisma.alumni.findUnique({
        where: { student_id: alumni.student_id }
      });

      if (existing) {
        console.log(`⚠️  Alumni ${alumni.student_id} already exists, skipping...`);
        continue;
      }

      const created = await prisma.alumni.create({
        data: alumni
      });

      console.log(`✅ Added: ${created.first_name} ${created.last_name} (${created.student_id})`);
    }

    console.log('\n✅ Sample alumni added successfully!');
    console.log('\n📋 Note: To add more verified alumni, you can:');
    console.log('   1. Edit this script and add more entries to the sampleAlumni array');
    console.log('   2. Import from a CSV/Excel file');
    console.log('   3. Add them manually through an admin panel');

  } catch (error) {
    console.error('❌ Error adding sample alumni:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleAlumni();
