const { PrismaClient, event_status } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing full home-snapshot query...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alumniDirectoryWhere = {
      NOT: {
        OR: [
          { email: { endsWith: '@lccbonline.com' } },
          { user: { is: { email: { endsWith: '@lccbonline.com' } } } }
        ]
      }
    };

    console.log('Starting Promise.all...');
    const result = await Promise.all([
      prisma.alumni.count({ where: alumniDirectoryWhere }),
      prisma.event.count({
        where: {
          OR: [
            { date: { gte: today } },
            { status: { in: ['UPCOMING', 'CURRENT'] } }
          ]
        }
      }),
      prisma.job_posting.count(),
      prisma.event.findMany({
        orderBy: { date: 'desc' },
        take: 3
      }),
      prisma.achievement.findMany({
        include: {
          alumni: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 3
      }),
      prisma.job_posting.findMany({
        include: {
          alumni: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 3
      }),
      prisma.donation.findMany({
        include: {
          alumni: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 3
      })
    ]);
    
    console.log('Query successful, got result:', result.map(r => Array.isArray(r) ? `Array(${r.length})` : r));
  } catch (e) {
    console.error('Prisma Error:', e);
  } finally {
    await prisma.$disconnect();
    console.log('Done');
  }
}

main();
