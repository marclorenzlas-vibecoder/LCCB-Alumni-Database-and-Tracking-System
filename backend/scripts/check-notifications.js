const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    });
    
    console.log('Recent notifications:');
    notifications.forEach(n => {
      console.log(`ID: ${n.id}, Type: ${n.type}, Link: "${n.link}", Event ID: ${n.event_id}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
