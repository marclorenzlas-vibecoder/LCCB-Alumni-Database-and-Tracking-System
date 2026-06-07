import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

export default function JobDetailScreen({ route, navigation, user }) {
  const { jobId } = route.params;
  const alumniId = useMemo(() => getAlumniId(user), [user]);

  const [job, setJob] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [jobData, appliedData] = await Promise.all([
      jobService.getJobById(jobId),
      alumniId ? jobService.checkApplication(jobId, alumniId) : Promise.resolve({ hasApplied: false })
    ]);

    setJob(jobData);
    setHasApplied(!!appliedData?.hasApplied || !!appliedData?.applied);
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadData()
      .catch((error) => console.error('Failed to load job details:', error?.message || error))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [jobId, alumniId]);

  const navigateToApplication = () => {
    if (!alumniId) {
      Alert.alert('No alumni profile', 'You need an alumni profile to apply.');
      return;
    }
    navigation.navigate('JobApplication', { jobId });
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading job details" />
      </ScreenContainer>
    );
  }

  if (!job) {
    return (
      <ScreenContainer>
        <Text>Job not found.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={[styles.badge, hasApplied ? styles.badgeApplied : styles.badgeOpen]}>
            <Text style={[styles.badgeText, hasApplied ? styles.badgeTextApplied : styles.badgeTextOpen]}>
              {hasApplied ? 'Already Applied' : 'Open for Applications'}
            </Text>
          </View>
          <Text style={styles.deadline}>Deadline: {formatDate(job.application_deadline)}</Text>
        </View>

        <Text style={styles.title}>{job.job_title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={15} color="#475569" />
          <Text style={styles.metaStrong}>{job.company || 'Company not specified'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color="#475569" />
          <Text style={styles.meta}>{job.location || 'Location TBD'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="briefcase-outline" size={15} color="#475569" />
          <Text style={styles.meta}>{job.job_type || 'Job type not specified'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#1d4ed8" />
          <Text style={styles.section}>Requirements</Text>
        </View>
        <Text style={styles.body}>{job.requirements || 'No requirements provided.'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={16} color="#1d4ed8" />
          <Text style={styles.section}>Description</Text>
        </View>
        <Text style={styles.body}>{job.description || 'No description provided.'}</Text>
      </View>

      <PrimaryButton
        label={hasApplied ? 'Already Applied' : 'Apply Now'}
        onPress={navigateToApplication}
        disabled={hasApplied}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3f0',
    gap: 8
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeOpen: {
    backgroundColor: '#dbeafe'
  },
  badgeApplied: {
    backgroundColor: '#dcfce7'
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  badgeTextOpen: {
    color: '#1d4ed8'
  },
  badgeTextApplied: {
    color: '#166534'
  },
  deadline: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaStrong: {
    color: '#1f2937',
    fontWeight: '600'
  },
  meta: {
    color: '#64748b'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#fff',
    padding: 14,
    gap: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  section: {
    fontWeight: '700',
    fontSize: 15,
    color: theme.colors.text
  },
  body: {
    color: '#1f2937',
    lineHeight: 21
  }
});
