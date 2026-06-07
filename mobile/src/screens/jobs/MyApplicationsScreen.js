import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

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
      'Withdraw application',
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
      {loading ? <LoadingState label="Loading applications" /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No applications yet" /> : null}

      {!loading && items.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <Text style={styles.title}>{entry.job_posting?.job_title || 'Untitled Job'}</Text>
          <Text style={styles.meta}>{entry.job_posting?.company || 'Unknown company'}</Text>
          <Text style={styles.meta}>Applied: {formatDate(entry.applied_at)}</Text>
          <Text style={styles.status}>Status: {entry.status}</Text>

          {entry.status === 'PENDING' ? (
            <Pressable style={styles.withdrawBtn} onPress={() => onWithdraw(entry.id)}>
              <Text style={styles.withdrawText}>Withdraw</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14,
    gap: 5
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text
  },
  meta: {
    color: theme.colors.muted
  },
  status: {
    marginTop: 4,
    color: '#1d4ed8',
    fontWeight: '600'
  },
  withdrawBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2'
  },
  withdrawText: {
    color: '#b91c1c',
    fontWeight: '700'
  }
});
