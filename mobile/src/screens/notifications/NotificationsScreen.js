import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { notificationService } from '../../services/notificationService';
import { realtimeClient } from '../../services/realtimeClient';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

const getDateGroup = (dateStr) => {
  if (!dateStr) return 'Older';
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const diffMs = startOfToday.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return 'Older';
};

const NOTIFICATION_MAX_DAYS = 61;

const isWithinRetention = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - NOTIFICATION_MAX_DAYS * 24 * 60 * 60 * 1000);
  return date >= cutoff;
};

const stripDonationPaymentDetails = (message = '') => {
  if (!message || typeof message !== 'string') return '';
  return message
    .split(/\r?\n/)
    .filter((line) => !/^\s*(payment method|currency)\s*:/i.test(line))
    .join('\n')
    .trim();
};

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setError(null);
    try {
      const data = await notificationService.getAll(false);
      const filtered = (data || []).filter((n) => isWithinRetention(n.created_at));
      setItems(filtered);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to load notifications. Pull down to retry.');
      }
      throw err;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadNotifications()
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoading(false);
        });

      const unsubCreated = realtimeClient.subscribe('notification.created', () => {
        if (mounted) loadNotifications().catch(() => {});
      });

      return () => {
        mounted = false;
        unsubCreated();
      };
    }, [loadNotifications])
  );

  const markOne = async (id) => {
    await notificationService.markAsRead(id);
    setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, is_read: true } : entry)));
  };

  const markAll = async () => {
    await notificationService.markAllAsRead();
    await loadNotifications();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const unreadCount = items.filter((item) => !item.is_read).length;

  const goToNotificationSource = (item) => {
    const link = String(item?.link || '').toLowerCase();

    if (link.startsWith('/events/')) {
      const id = Number(link.split('/')[2]);
      if (!Number.isNaN(id)) {
        navigation.navigate('Events', { screen: 'EventsList', params: { openEventId: id } });
        return;
      }
    }

    if (link.startsWith('/events')) {
      navigation.navigate('Events', { screen: 'EventsList' });
      return;
    }

    if (link.startsWith('/donate/') || link.startsWith('/donations/')) {
      const parts = link.split('/');
      const id = Number(parts[2]);
      if (!Number.isNaN(id)) {
        navigation.navigate('Donations', { screen: 'DonationDetail', params: { donationId: id } });
      } else {
        navigation.navigate('Donations');
      }
      return;
    }

    if (link.startsWith('/employment') || link.startsWith('/job-applications') || link.startsWith('/jobs')) {
      navigation.navigate('Employment');
      return;
    }

    if (link.startsWith('/achievements')) {
      navigation.navigate('Achievements');
      return;
    }

    if (item?.type === 'EVENT' && item?.event_id) {
      navigation.navigate('Events', { screen: 'EventsList', params: { openEventId: item.event_id } });
      return;
    }

    if (item?.type === 'JOB_APPLICATION') {
      navigation.navigate('Employment');
      return;
    }

    navigation.navigate('Home');
  };

  const onPressNotification = async (item) => {
    try {
      if (!item?.is_read) {
        await markOne(item.id);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error?.message || error);
    }
    goToNotificationSource(item);
  };

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="notifications" size={18} color="#1e3a8a" />
          </View>
          <View>
            <Text style={styles.heroTitle}>Notifications</Text>
            <Text style={styles.heroSub}>{unreadCount} unread</Text>
          </View>
        </View>
        <Pressable style={styles.action} onPress={markAll}>
          <Text style={styles.actionText}>Mark all read</Text>
        </Pressable>
      </View>

      {loading ? <LoadingState label="Loading notifications" /> : null}
      {!loading && error ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={{ marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>{error}</Text>
          <Pressable
            style={{ marginTop: 12, backgroundColor: '#0f766e', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
            onPress={onRefresh}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="No notifications" /> : null}

      {!loading && items.length > 0 ? (
        <View style={styles.list}>
          {(() => {
            const groups = [];
            let lastGroup = '';
            items.forEach((item) => {
              const group = getDateGroup(item.created_at);
              if (group !== lastGroup) {
                groups.push({ type: 'header', label: group, key: `header-${group}` });
                lastGroup = group;
              }
              groups.push({ type: 'item', data: item, key: `item-${item.id}` });
            });
            return groups.map((entry) => {
              if (entry.type === 'header') {
                return (
                  <Text key={entry.key} style={styles.dateHeader}>{entry.label}</Text>
                );
              }
              const item = entry.data;
              return (
                <Pressable key={entry.key} style={[styles.card, !item.is_read && styles.unread]} onPress={() => onPressNotification(item)}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.itemIconWrap}>
                      <Ionicons name={item.is_read ? 'mail-open-outline' : 'mail-unread-outline'} size={16} color={item.is_read ? '#475569' : '#1d4ed8'} />
                    </View>
                    <View style={styles.cardTextWrap}>
                      <Text style={styles.title}>{item.title || 'Notification'}</Text>
                      <Text style={styles.message}>{stripDonationPaymentDetails(item.message) || 'No message'}</Text>
                    </View>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                </Pressable>
              );
            });
          })()}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 5
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 2
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f9ff',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroTitle: {
    fontWeight: '800',
    fontSize: 17,
    color: '#0f172a'
  },
  heroSub: {
    color: '#475569',
    fontSize: 12
  },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  actionText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 11,
    gap: 4,
    marginBottom: 0,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  unread: {
    borderColor: '#93c5fd',
    backgroundColor: '#f0f9ff',
    borderWidth: 1.2
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  itemIconWrap: {
    marginTop: 2,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  cardTextWrap: {
    flex: 1,
    gap: 3
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    marginTop: 4,
    flexShrink: 0
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18
  },
  message: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17
  },
  date: {
    color: theme.colors.muted,
    fontSize: 11,
    marginLeft: 44,
    marginTop: 1
  }
});
