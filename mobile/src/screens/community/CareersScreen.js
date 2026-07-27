import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { communityService } from '../../services/communityService';
import { realtimeClient } from '../../services/realtimeClient';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

const getAlignmentLabel = (value) => {
  if (value === 'ALIGNED') return 'Related';
  if (value === 'NOT_ALIGNED') return 'Not Related';
  return 'Needs Checking';
};

const getAlignmentStyle = (value) => {
  if (value === 'ALIGNED') return styles.alignmentAligned;
  if (value === 'NOT_ALIGNED') return styles.alignmentNotAligned;
  return styles.alignmentReview;
};

export default function CareersScreen({ user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    const data = await communityService.getCareers(alumniId);
    setItems(data || []);
  }, [alumniId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadEntries()
        .catch((error) => console.error('Failed to load career entries:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });

      const unsubCreated = realtimeClient.subscribe('career.created', () => {
        if (mounted) loadEntries().catch(() => {});
      });
      const unsubUpdated = realtimeClient.subscribe('career.updated', () => {
        if (mounted) loadEntries().catch(() => {});
      });
      const unsubDeleted = realtimeClient.subscribe('career.deleted', () => {
        if (mounted) loadEntries().catch(() => {});
      });

      return () => {
        mounted = false;
        unsubCreated();
        unsubUpdated();
        unsubDeleted();
      };
    }, [loadEntries])
  );

  return (
    <ScreenContainer>
      {loading ? <LoadingState label="Loading career journey" /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No career entries yet" /> : null}

      {!loading && items.map((entry) => (
        <Pressable key={entry.id} style={styles.card}>
          <Text style={styles.title}>{entry.job_title}</Text>
          <Text style={styles.meta}>{entry.company}</Text>
          <Text style={styles.meta}>{formatDate(entry.start_date)} - {entry.end_date ? formatDate(entry.end_date) : 'Present'}</Text>
          <Text style={[styles.alignmentBadge, getAlignmentStyle(entry.program_alignment)]}>
            {getAlignmentLabel(entry.program_alignment)}
          </Text>
          {entry.description ? <Text style={styles.body}>{entry.description}</Text> : null}
        </Pressable>
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
    gap: 6
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text
  },
  meta: {
    color: theme.colors.muted
  },
  body: {
    color: '#1f2937'
  },
  alignmentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden'
  },
  alignmentAligned: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    color: '#047857'
  },
  alignmentNotAligned: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    color: '#be123c'
  },
  alignmentReview: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    color: '#b45309'
  }
});
