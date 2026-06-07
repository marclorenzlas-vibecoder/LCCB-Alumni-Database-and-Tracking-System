const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanCompanyName(company) {
  if (!company) return company;

  let cleaned = company;
  cleaned = cleaned.replace(/\s*Philippines\s*Inc\.?/gi, '');
  cleaned = cleaned.replace(/\s*Philippines\b/gi, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned || null;
}

async function cleanAlumniCompanyPhilippines() {
  try {
    const targetAlumni = await prisma.alumni.findMany({
      where: {
        company: {
          contains: 'Philippines'
        }
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`Found ${targetAlumni.length} alumni with 'Philippines' in company.`);

    for (const alumnus of targetAlumni) {
      const newCompany = cleanCompanyName(alumnus.company);

      await prisma.alumni.update({
        where: { id: alumnus.id },
        data: { company: newCompany }
      });

      console.log(
        `Updated ID ${alumnus.id} (${alumnus.first_name} ${alumnus.last_name}): '${alumnus.company}' -> '${newCompany ?? ''}'`
      );
    }

    const remaining = await prisma.alumni.count({
      where: {
        company: {
          contains: 'Philippines'
        }
      }
    });

    console.log(`Remaining alumni with 'Philippines' in company: ${remaining}`);
    console.log('Done.');
  } catch (error) {
    console.error('Failed to clean company names:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

cleanAlumniCompanyPhilippines();
