const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Cleaning up recently created alumni...\n');

  try {
    // Delete alumni created with the batch email pattern
    const deletedAlumni = await prisma.alumni.deleteMany({
      where: {
        email: {
          contains: '@lccbonline.edu'
        }
      }
    });

    // Delete users created with the batch email pattern
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@lccbonline.edu'
        }
      }
    });

    console.log(`✅ Deleted ${deletedAlumni.count} alumni records`);
    console.log(`✅ Deleted ${deletedUsers.count} user accounts`);
    console.log('\n✨ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
