export const NOTIFICATION_PREFERENCE_EVENT = 'notification-preference-changed';

const masterKey = (userId) => `notifications_enabled_${userId}`;
const eventsKey = (userId) => `notify_events_${userId}`;
const achievementsKey = (userId) => `notify_achievements_${userId}`;
const donationsKey = (userId) => `notify_donations_${userId}`;
const jobsKey = (userId) => `notify_jobs_${userId}`;
const toastsKey = (userId) => `show_donation_toasts_${userId}`;
const birthdayVisibilityKey = (userId) => `birthday_notification_visibility_${userId}`;

export const normalizeBirthdayNotificationVisibility = (value) => {
  const normalized = String(value || 'PUBLIC').trim().toUpperCase();
  if (['PRIVATE', 'OFF'].includes(normalized)) return 'OFF';
  return 'PUBLIC';
};

export const areNotificationsEnabled = (userId) => {
  if (!userId) return true;
  const stored = localStorage.getItem(masterKey(userId));
  return stored === null ? true : stored === 'true';
};

export const isNotifyEventsEnabled = (userId) => {
  if (!userId) return true;
  if (!areNotificationsEnabled(userId)) return false;
  const stored = localStorage.getItem(eventsKey(userId));
  return stored === null ? true : stored === 'true';
};

export const isNotifyAchievementsEnabled = (userId) => {
  if (!userId) return true;
  if (!areNotificationsEnabled(userId)) return false;
  const stored = localStorage.getItem(achievementsKey(userId));
  return stored === null ? true : stored === 'true';
};

export const isNotifyDonationsEnabled = (userId) => {
  if (!userId) return true;
  if (!areNotificationsEnabled(userId)) return false;
  const stored = localStorage.getItem(donationsKey(userId));
  return stored === null ? true : stored === 'true';
};

export const isNotifyJobsEnabled = (userId) => {
  if (!userId) return true;
  if (!areNotificationsEnabled(userId)) return false;
  const stored = localStorage.getItem(jobsKey(userId));
  return stored === null ? true : stored === 'true';
};

export const isShowDonationToastsEnabled = (userId) => {
  if (!userId) return true;
  if (!areNotificationsEnabled(userId)) return false;
  const stored = localStorage.getItem(toastsKey(userId));
  return stored === null ? true : stored === 'true';
};

export const getBirthdayNotificationVisibility = (userId) => {
  if (!userId) return 'PUBLIC';
  const stored = localStorage.getItem(birthdayVisibilityKey(userId));
  return normalizeBirthdayNotificationVisibility(stored);
};

export const setNotificationEnabled = (userId, enabled) => {
  if (!userId) return;
  localStorage.setItem(masterKey(userId), String(enabled));
  triggerPreferenceChange(userId);
};

export const setPreferences = (userId, prefs) => {
  if (!userId || !prefs) return;
  if (typeof prefs.notificationEnabled !== 'undefined') {
    localStorage.setItem(masterKey(userId), String(prefs.notificationEnabled));
  }
  if (typeof prefs.notifyEvents !== 'undefined') {
    localStorage.setItem(eventsKey(userId), String(prefs.notifyEvents));
  }
  if (typeof prefs.notifyAchievements !== 'undefined') {
    localStorage.setItem(achievementsKey(userId), String(prefs.notifyAchievements));
  }
  if (typeof prefs.notifyDonations !== 'undefined') {
    localStorage.setItem(donationsKey(userId), String(prefs.notifyDonations));
  }
  if (typeof prefs.notifyJobs !== 'undefined') {
    localStorage.setItem(jobsKey(userId), String(prefs.notifyJobs));
  }
  if (typeof prefs.showDonationToasts !== 'undefined') {
    localStorage.setItem(toastsKey(userId), String(prefs.showDonationToasts));
  }
  if (typeof prefs.birthdayNotificationVisibility !== 'undefined') {
    localStorage.setItem(
      birthdayVisibilityKey(userId),
      normalizeBirthdayNotificationVisibility(prefs.birthdayNotificationVisibility)
    );
  }
  triggerPreferenceChange(userId);
};

const triggerPreferenceChange = (userId) => {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_PREFERENCE_EVENT, {
      detail: { userId }
    })
  );
};
