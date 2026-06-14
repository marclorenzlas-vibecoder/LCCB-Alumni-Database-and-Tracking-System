export const NOTIFICATION_PREFERENCE_EVENT = 'notification-preference-changed';

const storageKey = (userId) => `notifications_enabled_${userId}`;

export const areNotificationsEnabled = (userId) => {
  if (!userId) return true;
  const stored = localStorage.getItem(storageKey(userId));
  return stored === null ? true : stored === 'true';
};

export const setNotificationEnabled = (userId, enabled) => {
  if (!userId) return;
  localStorage.setItem(storageKey(userId), String(enabled));
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_PREFERENCE_EVENT, {
      detail: { userId, enabled: Boolean(enabled) }
    })
  );
};
