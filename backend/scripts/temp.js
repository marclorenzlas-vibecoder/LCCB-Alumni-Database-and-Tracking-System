const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS alumni_education_history (
      id SERIAL PRIMARY KEY,
      alumni_id INT NOT NULL,
      level VARCHAR(50) NOT NULL CHECK (level IN ('INTEGRATED_SCHOOL','NIGHT_HIGH','SENIOR_HIGH','COLLEGE','ETEEAP','GRAD_SCHOOL')),
      batch INT,
      graduation_year INT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_alumni_education_history_alumni FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
    );
  `);
  console.log("Table created successfully");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
