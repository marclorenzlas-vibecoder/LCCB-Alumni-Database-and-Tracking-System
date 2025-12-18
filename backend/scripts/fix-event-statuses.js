const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEventStatuses() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get all events
    const events = await prisma.event.findMany({
      where: {
        date: { not: null }
      }
    });

    console.log(`Found ${events.length} events to check\n`);

    let updated = 0;
    for (const event of events) {
      const eventDate = new Date(event.date);
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      let newStatus;
      
      // Determine end date
      const endDate = event.end_date 
        ? new Date(event.end_date)
        : eventDateOnly;
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      // Check status
      if (today < eventDateOnly) {
        newStatus = 'UPCOMING';
      } else if (today >= eventDateOnly && today <= endDateOnly) {
        newStatus = 'CURRENT';
      } else {
        newStatus = 'PREVIOUS';
      }

      // Update status
      await prisma.event.update({
        where: { id: event.id },
        data: { status: newStatus }
      });

      console.log(`✓ "${event.name}": ${event.date.toISOString().split('T')[0]} -> ${newStatus}`);
      updated++;
    }

    console.log(`\n✅ Updated ${updated} events successfully!`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEventStatuses();
