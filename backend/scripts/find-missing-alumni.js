const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const expectedEmails = {
  2014: ['lucas@gmail.com', 'mia@gmail.com', 'joseph@gmail.com', 'jack@gmail.com', 'ethan@gmail.com', 'isaac@gmail.com', 'layla@gmail.com', 'olivia@gmail.com', 'ella@gmail.com', 'emily@gmail.com'],
  2015: ['brielle@gmail.com', 'aiden@gmail.com', 'aubrey@gmail.com', 'zoey@gmail.com', 'lincoln@gmail.com', 'luke@gmail.com', 'avery@gmail.com', 'grace@gmail.com', 'mason@gmail.com', 'sophia@gmail.com'],
  2019: ['kendra@gmail.com', 'charlotte@gmail.com', 'david@gmail.com', 'dylan@gmail.com', 'lillian@gmail.com', 'evelyn@gmail.com', 'matthew@gmail.com', 'natalie@gmail.com', 'daniel@gmail.com', 'sebastian@gmail.com'],
  2020: ['oscar@gmail.com', 'vj@gmail.com', 'joey@gmail.com', 'jackson@gmail.com', 'riley@gmail.com', 'matthew@gmail.com', 'penelope@gmail.com', 'scarlett@gmail.com', 'elizabeth@gmail.com', 'samuel@gmail.com'],
  2021: ['alaine@gmail.com', 'sofia@gmail.com', 'owen@gmail.com', 'addison@gmail.com', 'gabriel@gmail.com', 'harper@gmail.com', 'chloe@gmail.com', 'leo@gmail.com', 'liam@gmail.com', 'amelia@gmail.com'],
  2023: ['marc@gmail.com', 'anthony@gmail.com', 'sebastian@gmail.com', 'wyatt@gmail.com', 'lily@gmail.com', 'alexander@gmail.com', 'avery@gmail.com', 'noah@gmail.com', 'ethan@gmail.com', 'harper@gmail.com']
};

async function findMissing() {
  console.log('🔍 Finding missing alumni...\n');
  
  for (const [batch, emails] of Object.entries(expectedEmails)) {
    console.log(`\nBatch ${batch} - Expected: ${emails.length}`);
    const missing = [];
    
    for (const email of emails) {
      const alumni = await prisma.alumni.findFirst({
        where: { email },
        select: { email: true, first_name: true, last_name: true }
      });
      
      if (!alumni) {
        missing.push(email);
      }
    }
    
    if (missing.length > 0) {
      console.log(`❌ Missing ${missing.length}:`);
      missing.forEach(e => console.log(`   - ${e}`));
    } else {
      console.log(`✅ All 10 alumni present`);
    }
  }
  
  await prisma.$disconnect();
}

findMissing();
