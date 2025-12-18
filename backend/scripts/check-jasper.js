const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Find Kendra Vaughn
    const kendra = await prisma.alumni.findMany({
      where: {
        OR: [
          { first_name: { contains: 'Kendra' } },
          { email: { contains: 'kendra' } }
        ]
      }
    });
    
    console.log('Kendra Vaughn records:');
    kendra.forEach(a => {
      console.log(`\nID: ${a.id}`);
      console.log(`Name: ${a.first_name} ${a.last_name}`);
      console.log(`Email: ${a.email}`);
      console.log(`Profile Image: ${a.profile_image}`);
      console.log(`Level: ${a.level}`);
      console.log(`Batch: ${a.batch}`);
      console.log(`Graduation Year: ${a.graduation_year}`);
    });
    
    // Also check the user table
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'Kendra' } },
          { email: { contains: 'kendra' } }
        ]
      }
    });
    
    if (user) {
      console.log('\n\nUser record:');
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Profile Image: ${user.profile_image}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
