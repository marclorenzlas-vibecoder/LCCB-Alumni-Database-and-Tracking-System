const { PrismaClient } = require('@prisma/client');

// Prisma client instance for database access
const prisma = new PrismaClient();

module.exports = prisma;

