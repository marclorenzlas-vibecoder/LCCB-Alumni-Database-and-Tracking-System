const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const a = await prisma.achievement.findFirst({where: {image: {not: null}}});
  console.log('achievement:', a?.image);
  
  const d = await prisma.donation.findFirst({where: {image: {not: null}}});
  console.log('donation:', d?.image);
  
  const e = await prisma.event.findFirst({where: {image: {not: null}}});
  console.log('event:', e?.image);
  
  const al = await prisma.alumni.findFirst({where: {profile_image: {not: null}}});
  console.log('alumni:', al?.profile_image);
}
main().finally(() => prisma.$disconnect());
