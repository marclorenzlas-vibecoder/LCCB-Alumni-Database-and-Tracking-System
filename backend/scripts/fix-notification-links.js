const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNotificationLinks() {
  try {
    // Update all notification links from /event/ to /events/
    const result = await prisma.$executeRaw`
      UPDATE notification 
      SET link = REPLACE(link, '/event/', '/events/')
      WHERE link LIKE '/event/%'
    `;
    
    console.log(`Updated ${result} notification links`);
    
    // Verify the fix
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'EVENT'
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    
    console.log('\nVerifying recent event notifications:');
    notifications.forEach(n => {
      console.log(`ID: ${n.id}, Link: "${n.link}"`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNotificationLinks();
