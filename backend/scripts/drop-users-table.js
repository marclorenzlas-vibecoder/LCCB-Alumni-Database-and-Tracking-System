const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dropUsersTable() {
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS users');
    console.log('✅ Dropped users table successfully');
  } catch (error) {
    console.error('Error dropping users table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

dropUsersTable();
