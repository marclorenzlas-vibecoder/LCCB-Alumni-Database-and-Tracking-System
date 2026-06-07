const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAlumniLocations() {
  try {
    const legacyRows = await prisma.alumni.findMany({
      where: {
        location: {
          in: ['Local', 'International']
        }
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        location: true
      }
    });

    const philippinesRows = await prisma.alumni.findMany({
      where: {
        location: {
          contains: 'Philippines'
        }
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        location: true
      }
    });

    const groupedCounts = await prisma.alumni.groupBy({
      by: ['location'],
      _count: {
        _all: true
      },
      orderBy: {
        location: 'asc'
      }
    });

    const allAlumni = await prisma.alumni.findMany({
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        location: true
      }
    });

    let blocksValid = true;
    const blockErrors = [];

    for (let i = 0; i < allAlumni.length; i += 5) {
      const block = allAlumni.slice(i, i + 5);
      const countries = block.map((a) => String(a.location || '').split(',').slice(-1)[0].trim());
      const cities = block.map((a) => String(a.location || '').split(',')[0].trim());
      const uniqueCountries = new Set(countries);
      const uniqueCities = new Set(cities);

      if (block.length >= 2 && uniqueCountries.size !== 1) {
        blocksValid = false;
        blockErrors.push({
          blockStartId: block[0].id,
          issue: 'Country mismatch in 5-alumni block',
          locations: block.map((a) => a.location)
        });
      }

      if (block.length >= 2 && uniqueCities.size !== block.length) {
        blocksValid = false;
        blockErrors.push({
          blockStartId: block[0].id,
          issue: 'Duplicate city inside block',
          locations: block.map((a) => a.location)
        });
      }
    }

    console.log(`Legacy location rows: ${legacyRows.length}`);
    if (legacyRows.length > 0) {
      console.log('Rows with Local/International still present:');
      console.log(JSON.stringify(legacyRows, null, 2));
    }

    console.log(`Rows with Philippines location: ${philippinesRows.length}`);
    if (philippinesRows.length > 0) {
      console.log('Rows still tagged as Philippines:');
      console.log(JSON.stringify(philippinesRows, null, 2));
    }

    console.log('\nGrouped counts by location:');
    console.log(JSON.stringify(groupedCounts, null, 2));

    console.log(`\n5-alumni block rule valid: ${blocksValid}`);
    if (!blocksValid) {
      console.log(JSON.stringify(blockErrors, null, 2));
    }
  } catch (error) {
    console.error('Verification failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

verifyAlumniLocations();
