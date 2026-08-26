const prisma = require('../config/prisma');
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
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Define filter for ongoing (CURRENT) events:
    // date <= today AND (end_date >= today OR (end_date is null AND date = today))
    const currentEventsFilter = {
      OR: [
        {
          date: { lte: today },
          end_date: { gte: today }
        },
        {
          date: today,
          end_date: null
        }
      ]
    };

    // Define filter for past (PREVIOUS) events:
    // end_date < today OR (date < today AND end_date is null)
    const previousEventsFilter = {
      OR: [
        {
          end_date: { lt: today }
        },
        {
          date: { lt: today },
          end_date: null
        }
      ]
    };

    // Find upcoming events that are transitioning to CURRENT and need notification
    const upcomingToCurrent = await prisma.event.findMany({
      where: {
        status: 'UPCOMING',
        notified_current: false,
        ...currentEventsFilter
      }
    });

    // Find current events that are transitioning to PREVIOUS (for logging/counters)
    const currentToPrevious = await prisma.event.findMany({
      where: {
        status: 'CURRENT',
        ...previousEventsFilter
      },
      select: { id: true }
    });

    // 1. Bulk update to UPCOMING
    const upcomingResult = await prisma.event.updateMany({
      where: {
        date: { gt: today },
        status: { not: 'UPCOMING' }
      },
      data: {
        status: 'UPCOMING'
      }
    });

    // 2. Bulk update to CURRENT
    const currentResult = await prisma.event.updateMany({
      where: {
        status: { not: 'CURRENT' },
        ...currentEventsFilter
      },
      data: {
        status: 'CURRENT',
        notified_current: true
      }
    });

    // 3. Bulk update to PREVIOUS
    const previousResult = await prisma.event.updateMany({
      where: {
        status: { not: 'PREVIOUS' },
        ...previousEventsFilter
      },
      data: {
        status: 'PREVIOUS'
      }
    });

    // Log the transitions if any
    if (upcomingResult.count > 0) {
      console.log(`Event status update: ${upcomingResult.count} events transitioned/reset to UPCOMING`);
    }
    if (currentResult.count > 0) {
      console.log(`Event status update: ${currentResult.count} events transitioned to CURRENT`);
    }
    if (previousResult.count > 0) {
      console.log(`Event status update: ${previousResult.count} events transitioned to PREVIOUS`);
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

    const totalProcessed = await prisma.event.count({
      where: {
        date: { not: null }
      }
    });

    return {
      upcomingToCurrent: upcomingToCurrent.length,
      currentToPrevious: currentToPrevious.length,
      totalProcessed
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
