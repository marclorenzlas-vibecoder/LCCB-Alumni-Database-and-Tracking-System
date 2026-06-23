import { communityService } from './communityService';
import { donationService } from './donationService';
import { eventService } from './eventService';
import { jobService } from './jobService';
import { notificationService } from './notificationService';
import { statsService } from './statsService';

export const dashboardService = {
  async getSnapshot(alumniId) {
    const [snapshotResult, notificationsResult, unreadCountResult] = await Promise.allSettled([
      statsService.getHomeSnapshot(),
      notificationService.getAll(false),
      notificationService.getUnreadCount()
    ]);

    const snapshot = snapshotResult.status === 'fulfilled' ? snapshotResult.value : {};
    const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : [];
    const unreadCount = unreadCountResult.status === 'fulfilled' ? unreadCountResult.value : { count: 0 };

    return {
      events: snapshot.events || [],
      jobs: snapshot.jobs || [],
      achievements: snapshot.achievements || [],
      donations: snapshot.donations || [],
      notifications,
      unreadCount: unreadCount?.count || 0,
      stats: snapshot.stats || { totalAlumni: 0, activeMembers: 0, upcomingEvents: 0, jobOpportunities: 0 }
    };
  }
};
