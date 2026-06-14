import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId) => `notifications_enabled_${userId}`;

export async function areNotificationsEnabled(userId) {
  if (!userId) return true;
  const stored = await AsyncStorage.getItem(storageKey(userId));
  return stored === null ? true : stored === 'true';
}

export async function setNotificationEnabled(userId, enabled) {
  if (!userId) return;
  await AsyncStorage.setItem(storageKey(userId), String(Boolean(enabled)));
}
