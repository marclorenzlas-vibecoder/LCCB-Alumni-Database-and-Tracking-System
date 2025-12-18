const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Officer positions for each batch
const officerPositions = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Public Relations Officer',
  'Business Manager'
];

// Batches to assign officers
const batches = [2014, 2015, 2019, 2020, 2021, 2023];

async function assignBatchOfficers() {
  console.log('🎖️  Assigning Batch Officers...\n');
  
  let totalAssigned = 0;
  
  for (const batch of batches) {
    console.log(`📅 Batch ${batch}`);
    console.log('─'.repeat(70));
    
    // Get all alumni from this batch
    const batchAlumni = await prisma.alumni.findMany({
      where: { batch },
      select: { id: true, first_name: true, last_name: true }
    });
    
    if (batchAlumni.length === 0) {
      console.log(`⚠️  No alumni found for batch ${batch}\n`);
      continue;
    }
    
    console.log(`Found ${batchAlumni.length} alumni in batch ${batch}`);
    
    // Shuffle alumni array for random selection
    const shuffled = [...batchAlumni].sort(() => 0.5 - Math.random());
    
    // Assign positions (take only as many as available)
    const positionsToAssign = Math.min(officerPositions.length, shuffled.length);
    
    for (let i = 0; i < positionsToAssign; i++) {
      const alumni = shuffled[i];
      const position = officerPositions[i];
      
      try {
        // Check if already assigned
        const existing = await prisma.batch_officer.findFirst({
          where: {
            alumni_id: alumni.id,
            batch,
            position
          }
        });
        
        if (existing) {
          console.log(`   ✓ ${alumni.first_name} ${alumni.last_name} - ${position} (already assigned)`);
          continue;
        }
        
        // Assign officer position
        await prisma.batch_officer.create({
          data: {
            alumni_id: alumni.id,
            batch,
            position,
            term_start: batch,
            term_end: batch
          }
        });
        
        console.log(`   ✅ ${alumni.first_name} ${alumni.last_name} - ${position}`);
        totalAssigned++;
        
      } catch (error) {
        console.log(`   ⚠️  Error assigning ${position}: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('═'.repeat(70));
  console.log(`📊 Total Officers Assigned: ${totalAssigned}`);
  console.log('═'.repeat(70));
  
  await prisma.$disconnect();
}

assignBatchOfficers();
