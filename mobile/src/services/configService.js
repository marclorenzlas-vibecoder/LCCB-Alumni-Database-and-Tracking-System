import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const GROUPS_KEY = 'app:groups_v1';
const GROUPS_URL = `${API_BASE_URL}/config/groups`;

export async function fetchGroups() {
  try {
    const res = await fetch(GROUPS_URL, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body && body.success && body.data) {
      await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(body.data));
      return body.data;
    }
    // tolerate older shape where API returns raw data
    if (body && body.data) {
      await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(body.data));
      return body.data;
    }
    return null;
  } catch (err) {
    console.warn('fetchGroups failed', err.message || err);
    return null;
  }
}

export async function getCachedGroups() {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('getCachedGroups parse failed', err.message || err);
    return null;
  }
}

export async function getGroups() {
  const cached = await getCachedGroups();
  if (cached) return cached;
  const fetched = await fetchGroups();
  return fetched;
}
