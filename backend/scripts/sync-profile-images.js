const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncProfileImages() {
  try {
    // Find all users with alumni records
    const users = await prisma.user.findMany({
      where: {
        profile_image: { not: null },
        alumni: { isNot: null }
      },
      include: {
        alumni: true
      }
    });
    
    console.log(`Found ${users.length} users with profile images and alumni records`);
    
    for (const user of users) {
      // Check if alumni.profile_image is different from user.profile_image
      if (user.alumni && user.alumni.profile_image !== user.profile_image) {
        console.log(`\nSyncing profile image for: ${user.alumni.first_name} ${user.alumni.last_name}`);
        console.log(`  User profile_image: ${user.profile_image}`);
        console.log(`  Alumni profile_image: ${user.alumni.profile_image}`);
        
        // Update alumni profile_image to match user profile_image
        await prisma.alumni.update({
          where: { id: user.alumni.id },
          data: { profile_image: user.profile_image }
        });
        
        console.log(`  ✓ Updated to: ${user.profile_image}`);
      }
    }
    
    console.log('\n✓ Profile image sync complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncProfileImages();
