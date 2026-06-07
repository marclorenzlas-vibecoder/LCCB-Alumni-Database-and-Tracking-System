const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const donations = await prisma.donation.findMany({
      select: {
        id: true,
        purpose: true,
        amount: true,
        description: true
      }
    });
    console.log('--- CAMPAIGNS ---');
    console.log(JSON.stringify(donations, null, 2));

    const notifications = await prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    });
    console.log('--- RECENT 5 NOTIFICATIONS ---');
    console.log(JSON.stringify(notifications, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
