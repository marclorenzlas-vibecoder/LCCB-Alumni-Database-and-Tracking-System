const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAlumniLocations() {
  try {
    // Get all alumni sorted by ID
    const alumni = await prisma.alumni.findMany({
      orderBy: { id: 'asc' }
    });

    console.log(`Total alumni: ${alumni.length}`);
    
    // Every 5 alumni: same country, different cities.
    const countryCityGroups = [
      { country: 'Japan', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Sapporo'] },
      { country: 'Philippines', cities: ['Manila', 'Quezon City', 'Cebu City', 'Davao City', 'Baguio'] },
      { country: 'China', cities: ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Chengdu'] },
      { country: 'USA', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Seattle'] },
      { country: 'South Korea', cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon'] },
      { country: 'Australia', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
      { country: 'Canada', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'] },
      { country: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain'] },
      { country: 'UK', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'] },
      { country: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
      { country: 'France', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'] },
      { country: 'Spain', cities: ['Barcelona', 'Madrid', 'Valencia', 'Seville', 'Bilbao'] },
      { country: 'Italy', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence'] }
    ];

    for (let i = 0; i < alumni.length; i++) {
      const alumnus = alumni[i];
      const locationGroupIndex = Math.floor(i / 5) % countryCityGroups.length;
      const cityIndex = i % 5;
      const group = countryCityGroups[locationGroupIndex];
      const location = `${group.cities[cityIndex]}, ${group.country}`;

      await prisma.alumni.update({
        where: { id: alumnus.id },
        data: { location }
      });

      console.log(`Updated alumni ID ${alumnus.id} (${alumnus.first_name} ${alumnus.last_name}) to: ${location}`);
    }

    console.log('\n✅ All alumni locations updated successfully!');

  } catch (error) {
    console.error('Error updating alumni locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAlumniLocations();
