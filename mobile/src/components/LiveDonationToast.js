import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ORIGIN } from '../config/api';
import apiClient from '../services/apiClient';
import { realtimeClient } from '../services/realtimeClient';
import {
  isShowDonationToastsEnabled,
  setNotificationEnabled,
  setShowDonationToastsEnabled
} from '../utils/notificationPreferences';
import { formatRelativeTime, getInitials, parseDonationPayload } from '../utils/donationToast';
import { imageUrl } from '../utils/formatters';

export default function LiveDonationToast({ user }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState([]);
  const [enabled, setEnabled] = useState(true);

  const userId = user?.id;
  const role = String(user?.role || '').toUpperCase();
  const canListen = role === 'ALUMNI' || role === 'TEACHER' || role === 'ADMIN';

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!userId) {
      setEnabled(false);
      setToasts([]);
      return;
    }

    let mounted = true;

    const syncPreferences = async () => {
      try {
        const response = await apiClient.get(`/auth/notification-preference/${userId}`);
        const data = response.data || {};
        await setNotificationEnabled(userId, data.notification_enabled ?? true);
        await setShowDonationToastsEnabled(userId, data.show_donation_toasts ?? true);
        if (mounted) {
          setEnabled(await isShowDonationToastsEnabled(userId));
        }
      } catch {
        if (mounted) {
          setEnabled(await isShowDonationToastsEnabled(userId));
        }
      }
    };

    syncPreferences();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!enabled) {
      setToasts([]);
    }
  }, [enabled]);

  useEffect(() => {
    if (!userId || !canListen || !enabled) return undefined;

    realtimeClient.connect();

    const handler = async (payload) => {
      try {
        if (!(await isShowDonationToastsEnabled(userId))) return;

        const parsed = parseDonationPayload(payload);
        if (!parsed) return;

        const toastItem = {
          ...parsed,
          createdAt: Date.now()
        };

        setToasts((prev) => [toastItem, ...prev].slice(0, 3));
        setTimeout(() => dismissToast(toastItem.id), 8000);
      } catch (error) {
        console.error('LiveDonationToast handler error:', error);
      }
    };

    const unsub = realtimeClient.subscribe('notification.created', handler);
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, [userId, canListen, enabled, dismissToast]);

  if (!enabled || !toasts.length) return null;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
      {toasts.map((toast) => {
        const avatarUri = imageUrl(toast.senderProfileImage, API_ORIGIN);
        return (
          <View key={toast.id} style={styles.card}>
            <View style={styles.accent} />
            <View style={styles.content}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{getInitials(toast.senderName)}</Text>
                </View>
              )}

              <View style={styles.body}>
                <View style={styles.headerRow}>
                  <Text style={styles.senderName} numberOfLines={1}>{toast.senderName}</Text>
                  <View style={styles.headerActions}>
                    <Text style={styles.timeText}>{formatRelativeTime(toast.createdAt)}</Text>
                    <Pressable
                      style={styles.dismissBtn}
                      onPress={() => dismissToast(toast.id)}
                      hitSlop={8}
                      accessibilityLabel="Dismiss donation toast"
                    >
                      <Text style={styles.dismissText}>×</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.messageText}>
                  Donated <Text style={styles.giftText}>{toast.gift}</Text> to{' '}
                  <Text style={styles.campaignText}>{toast.campaign}</Text>
                </Text>

                {toast.detail ? (
                  <Text style={styles.detailText} numberOfLines={2}>{toast.detail}</Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 10
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    overflow: 'hidden',
    shadowColor: '#064e3b',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#10b981'
  },
  content: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    paddingLeft: 18
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff'
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarFallbackText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 13
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8
  },
  senderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600'
  },
  dismissBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  dismissText: {
    fontSize: 18,
    lineHeight: 20,
    color: '#94a3b8',
    fontWeight: '600'
  },
  messageText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569'
  },
  giftText: {
    color: '#047857',
    fontWeight: '700'
  },
  campaignText: {
    color: '#0f172a',
    fontWeight: '600'
  },
  detailText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b'
  }
});
