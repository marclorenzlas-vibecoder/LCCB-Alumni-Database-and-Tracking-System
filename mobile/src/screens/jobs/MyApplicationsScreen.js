import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';

const STATUS_CONFIG = {
  PENDING: { label: 'Application Pending', bg: '#fef3c7', text: '#92400e', icon: 'time-outline' },
  REVIEWED: { label: 'Under Review', bg: '#e0e7ff', text: '#3730a3', icon: 'eye-outline' },
  SHORTLISTED: { label: 'Shortlisted', bg: '#dcfce7', text: '#166534', icon: 'star-outline' },
  ACCEPTED: { label: 'Accepted', bg: '#d1fae5', text: '#065f46', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Not Selected', bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline' }
};

export default function MyApplicationsScreen({ user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!alumniId) {
      setItems([]);
      return;
    }
    const data = await jobService.getApplicationsByAlumni(alumniId);
    setItems(data || []);
  }, [alumniId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadItems()
        .catch((error) => console.error('Failed to load applications:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [loadItems])
  );

  const onWithdraw = async (applicationId) => {
    Alert.alert(
      'Withdraw Application',
      'Do you want to withdraw this pending application? You can reapply later if the job is still open.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobService.withdrawApplication(applicationId);
              await loadItems();
            } catch (error) {
              Alert.alert('Unable to withdraw', error?.response?.data?.error || 'Please try again later.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {loading ? <LoadingState label="Loading applications" /> : null}
        {!loading && items.length === 0 ? <EmptyState title="No applications yet" /> : null}

        {!loading && items.map((entry) => {
          const status = entry.status;
          const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
          return (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{entry.job_posting?.job_title || 'Untitled Job'}</Text>
                <Text style={styles.company}>{entry.job_posting?.company || 'Unknown company'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon} size={14} color={config.text} />
                <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
              </View>
            </View>

            <Text style={styles.appliedDate}>Applied: {formatDate(entry.applied_at)}</Text>

            {entry.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Employer Notes</Text>
                <Text style={styles.notesText} numberOfLines={3}>{entry.notes}</Text>
              </View>
            ) : null}

            {status === 'PENDING' ? (
              <Pressable style={styles.withdrawBtn} onPress={() => onWithdraw(entry.id)}>
                <Ionicons name="close-circle-outline" size={16} color="#b91c1c" />
                <Text style={styles.withdrawText}>Withdraw</Text>
              </Pressable>
            ) : null}
          </View>
        );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 14,
    gap: 8,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  company: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  appliedDate: {
    fontSize: 12,
    color: '#94a3b8'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2'
  },
  withdrawText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 13
  }
});
