import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { notificationService } from '../../services/notificationService';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const data = await notificationService.getAll(false);
    setItems(data || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadNotifications()
        .catch((error) => console.error('Failed to load notifications:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
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
      {!loading && items.length === 0 ? <EmptyState title="No notifications" /> : null}

      {!loading && items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable key={item.id} style={[styles.card, !item.is_read && styles.unread]} onPress={() => onPressNotification(item)}>
              <View style={styles.cardTopRow}>
                <View style={styles.itemIconWrap}>
                  <Ionicons name={item.is_read ? 'mail-open-outline' : 'mail-unread-outline'} size={16} color={item.is_read ? '#475569' : '#1d4ed8'} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.title}>{item.title || 'Notification'}</Text>
                  <Text style={styles.message}>{item.message || 'No message'}</Text>
                </View>
                {!item.is_read ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 5
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
