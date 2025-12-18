const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlumni() {
  const alumni = await prisma.alumni.findMany({
    select: {
      email: true,
      first_name: true,
      last_name: true,
      batch: true
    },
    orderBy: { batch: 'asc' }
  });
  
  console.log(`Total alumni in database: ${alumni.length}\n`);
  alumni.forEach(a => {
    console.log(`${a.first_name} ${a.last_name} - ${a.email} (Batch ${a.batch})`);
  });
  
  await prisma.$disconnect();
}

checkAlumni();
