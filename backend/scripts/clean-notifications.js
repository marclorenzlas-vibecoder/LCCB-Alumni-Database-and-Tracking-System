const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanNotifications() {
  try {
    // Delete all existing notifications to allow schema change
    const result = await prisma.$executeRaw`DELETE FROM notification`;
    console.log(`Deleted ${result} notification records to allow schema migration`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanNotifications();
