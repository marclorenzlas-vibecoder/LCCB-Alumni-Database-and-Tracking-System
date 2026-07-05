import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId) => `notifications_enabled_${userId}`;
const toastsKey = (userId) => `show_donation_toasts_${userId}`;

export async function areNotificationsEnabled(userId) {
  if (!userId) return true;
  const stored = await AsyncStorage.getItem(storageKey(userId));
  return stored === null ? true : stored === 'true';
}

export async function isShowDonationToastsEnabled(userId) {
  if (!userId) return true;
  const master = await areNotificationsEnabled(userId);
  if (!master) return false;
  const stored = await AsyncStorage.getItem(toastsKey(userId));
  return stored === null ? true : stored === 'true';
}

export async function setNotificationEnabled(userId, enabled) {
  if (!userId) return;
  await AsyncStorage.setItem(storageKey(userId), String(Boolean(enabled)));
}

export async function setShowDonationToastsEnabled(userId, enabled) {
  if (!userId) return;
  await AsyncStorage.setItem(toastsKey(userId), String(Boolean(enabled)));
}
