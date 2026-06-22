import { communityService } from './communityService';
import { donationService } from './donationService';
import { eventService } from './eventService';
import { jobService } from './jobService';
import { notificationService } from './notificationService';
import { statsService } from './statsService';

export const dashboardService = {
  async getSnapshot(alumniId) {
    const [eventsResult, jobsResult, achievementsResult, donationsResult, notificationsResult, unreadCountResult, statsResult] = await Promise.allSettled([
      eventService.getAll(),
      jobService.getAllJobs(),
      communityService.getAchievements(),
      donationService.getAll(),
      notificationService.getAll(false),
      notificationService.getUnreadCount(),
      statsService.getHomeStats()
    ]);

    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];
    const achievements = achievementsResult.status === 'fulfilled' ? achievementsResult.value : [];
    const donations = donationsResult.status === 'fulfilled' ? donationsResult.value : [];
    const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : [];
    const unreadCount = unreadCountResult.status === 'fulfilled' ? unreadCountResult.value : { count: 0 };
    const stats = statsResult.status === 'fulfilled'
      ? statsResult.value
      : { totalAlumni: 0, activeMembers: 0, upcomingEvents: 0, jobOpportunities: 0 };

    return {
      events,
      jobs,
      achievements,
      donations,
      notifications,
      unreadCount: unreadCount?.count || 0,
      stats
    };
  }
};
