const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notificationService');

/**
 * Update event statuses based on current date
 * - UPCOMING: date is in the future
 * - CURRENT: date is today or (date <= today <= end_date)
 * - PREVIOUS: date has passed
 */
async function updateEventStatuses() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get all events
    const events = await prisma.event.findMany({
      where: {
        date: { not: null }
      }
    });

    let upcomingToCurrent = [];
    let currentToPrevious = [];

    for (const event of events) {
      const eventDate = new Date(event.date);
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      let newStatus = event.status;
      
      // Determine end date
      const endDate = event.end_date 
        ? new Date(event.end_date)
        : eventDateOnly;
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      // Check status
      if (today < eventDateOnly) {
        // Event is in the future
        newStatus = 'UPCOMING';
      } else if (today >= eventDateOnly && today <= endDateOnly) {
        // Event is happening now
        newStatus = 'CURRENT';
        if (event.status === 'UPCOMING' && !event.notified_current) {
          upcomingToCurrent.push(event);
        }
      } else {
        // Event has ended
        newStatus = 'PREVIOUS';
        if (event.status === 'CURRENT') {
          currentToPrevious.push(event);
        }
      }

      // Update if status changed
      if (newStatus !== event.status) {
        await prisma.event.update({
          where: { id: event.id },
          data: { 
            status: newStatus,
            notified_current: newStatus === 'CURRENT' ? true : event.notified_current
          }
        });
        console.log(`Event "${event.name}" status updated: ${event.status} -> ${newStatus}`);
      }
    }

    // Send notifications for events that became current
    for (const event of upcomingToCurrent) {
      try {
        await notificationService.createNotifications({
          type: 'EVENT',
          title: `Event Now Ongoing: ${event.name}`,
          message: `${event.name} is now happening! ${event.location ? `Location: ${event.location}` : ''} Join us now!`,
          link: `/events/${event.id}`,
          eventId: event.id
        });
        console.log(`Sent current event notifications for: ${event.name}`);
      } catch (error) {
        console.error(`Error sending notification for event ${event.id}:`, error);
      }
    }

    return {
      upcomingToCurrent: upcomingToCurrent.length,
      currentToPrevious: currentToPrevious.length,
      totalProcessed: events.length
    };
  } catch (error) {
    console.error('Error updating event statuses:', error);
    throw error;
  }
}

/**
 * Initialize event status checker - runs every hour
 */
function startEventStatusChecker() {
  // Run immediately on start
  updateEventStatuses().then(result => {
    console.log('Event status check complete:', result);
  }).catch(error => {
    console.error('Initial event status check failed:', error);
  });

  // Run every hour (3600000 ms)
  setInterval(async () => {
    try {
      const result = await updateEventStatuses();
      console.log('Event status check complete:', result);
    } catch (error) {
      console.error('Event status check failed:', error);
    }
  }, 3600000); // 1 hour

  console.log('Event status checker started - checking every hour');
}

module.exports = {
  updateEventStatuses,
  startEventStatusChecker
};
