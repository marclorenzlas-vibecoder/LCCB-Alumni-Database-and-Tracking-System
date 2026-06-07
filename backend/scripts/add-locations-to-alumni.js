const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌍 Adding locations to existing alumni...');

    const locationUpdates = [
      { email: 'lucas@gmail.com', location: 'Tokyo, Japan' },
      { email: 'marc@gmail.com', location: 'Sydney, Australia' },
      { email: 'mariareyes@gmail.com', location: 'Manila, Philippines' },
      { email: 'josecruz@gmail.com', location: 'Bangkok, Thailand' },
      { email: 'analopez@gmail.com', location: 'Hong Kong, China' },
      { email: 'davidtan@gmail.com', location: 'Singapore' },
      { email: 'lizagarcia@gmail.com', location: 'Cebu, Philippines' },
      { email: 'paolomendoza@gmail.com', location: 'New York, USA' },
      { email: 'biancasantos@gmail.com', location: 'London, United Kingdom' },
      { email: 'kevinramos@gmail.com', location: 'Toronto, Canada' },
      { email: 'nicolevillanueva@gmail.com', location: 'Dubai, UAE' },
      { email: 'adrianflores@gmail.com', location: 'Berlin, Germany' },
      { email: 'jasminenavarro@gmail.com', location: 'Paris, France' },
      { email: 'ethandelacruz@gmail.com', location: 'Amsterdam, Netherlands' },
      { email: 'camilleagustin@gmail.com', location: 'Melbourne, Australia' },
      { email: 'bryanlim@gmail.com', location: 'Jakarta, Indonesia' },
      { email: 'angelapascual@gmail.com', location: 'Quezon City, Philippines' },
      { email: 'marcusrivera@gmail.com', location: 'Seoul, South Korea' },
      { email: 'victoriagonzales@gmail.com', location: 'Vancouver, Canada' },
      { email: 'raphaelsantos@gmail.com', location: 'Mumbai, India' },
      { email: 'sophiatorres@gmail.com', location: 'Bali, Indonesia' },
      { email: 'lucascorpuz@gmail.com', location: 'Los Angeles, USA' },
      { email: 'auroramedina@gmail.com', location: 'Madrid, Spain' },
      { email: 'danielcastillo@gmail.com', location: 'Makati, Philippines' },
      { email: 'isabellavalencia@gmail.com', location: 'Istanbul, Turkey' },
      { email: 'alexanderrobles@gmail.com', location: 'Athens, Greece' },
      { email: 'evelynmontoya@gmail.com', location: 'Bangkok, Thailand' }
    ];

    let updated = 0;

    for (const item of locationUpdates) {
      const alumnus = await prisma.alumni.findFirst({
        where: { email: item.email },
        select: { id: true, first_name: true, last_name: true }
      });

      if (!alumnus) {
        console.log(`- Not found: ${item.email}`);
        continue;
      }

      await prisma.alumni.update({
        where: { id: alumnus.id },
        data: { location: item.location }
      });

      console.log(`+ Updated ${alumnus.first_name} ${alumnus.last_name}: ${item.location}`);
      updated += 1;
    }

    console.log(`\n✅ Done. Added locations to ${updated} alumni.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
