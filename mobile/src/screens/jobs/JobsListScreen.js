import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import SectionHeader from '../../components/SectionHeader';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

export default function JobsListScreen({ navigation, user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const loadJobs = useCallback(async () => {
    const [jobsData, applicationsData] = await Promise.all([
      jobService.getAllJobs(),
      alumniId ? jobService.getApplicationsByAlumni(alumniId) : Promise.resolve([])
    ]);

    setJobs(jobsData || []);

    const nextApplied = new Set(
      (applicationsData || [])
        .map((entry) => Number(entry?.job_posting_id || entry?.job_posting?.id))
        .filter((id) => !Number.isNaN(id))
    );
    setAppliedJobIds(nextApplied);
  }, [alumniId]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) => {
      const hay = [job.job_title, job.company, job.location, job.description]
        .map((value) => String(value || ''))
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, query]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadJobs()
        .catch((error) => console.error('Failed to load jobs:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [loadJobs])
  );

  return (
    <ScreenContainer>
      <SectionHeader title="Job Board" subtitle="Explore openings posted across alumni network." />

      <View style={styles.searchPanel}>
        <Text style={styles.searchTitle}>Search Jobs</Text>
        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, company, location"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <Pressable style={styles.searchClearButton} onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable style={styles.myAppsButton} onPress={() => navigation.navigate('MyApplications')}>
        <Text style={styles.myAppsText}>View My Applications</Text>
      </Pressable>

      {loading ? <LoadingState label="Loading job postings" /> : null}
      {!loading && jobs.length === 0 ? <EmptyState title="No jobs available" /> : null}
      {!loading && jobs.length > 0 && filteredJobs.length === 0 ? <EmptyState title="No matching jobs" /> : null}

      {!loading && filteredJobs.map((job) => {
        const isApplied = appliedJobIds.has(Number(job.id));
        return (
        <Pressable key={job.id} style={[styles.card, isApplied && styles.cardApplied]} onPress={() => navigation.navigate('JobDetail', { jobId: job.id, user })}>
          <View style={styles.cardTopRow}>
            <View style={[styles.tagPill, isApplied ? styles.tagPillApplied : null]}>
              <Text style={[styles.tagText, isApplied ? styles.tagTextApplied : null]}>{isApplied ? 'Applied' : 'Open Role'}</Text>
            </View>
            <Text style={styles.deadlineText}>Deadline: {formatDate(job.application_deadline)}</Text>
          </View>

          <Text style={styles.title}>{job.job_title || 'Job Opening'}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="business-outline" size={14} color="#475569" />
            <Text style={styles.metaStrong}>{job.company || 'Company not specified'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#475569" />
            <Text style={styles.meta}>{job.location || 'Location TBD'}</Text>
          </View>

          {job.description ? <Text style={styles.desc} numberOfLines={3}>{job.description}</Text> : null}

          <View style={styles.cardFooter}>
            <Text style={styles.footerHint}>{isApplied ? 'You already applied to this job' : 'Tap to view details and apply'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#1e40af" />
          </View>
        </Pressable>
      );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  myAppsButton: {
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    alignItems: 'center'
  },
  myAppsText: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  searchPanel: {
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  searchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    fontSize: 14,
    color: '#0f172a'
  },
  searchClearButton: {
    marginLeft: 8
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#fff',
    padding: 14,
    gap: 8,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  cardApplied: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4'
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  tagPill: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start'
  },
  tagText: {
    color: '#1e40af',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3
  },
  tagPillApplied: {
    backgroundColor: '#dcfce7'
  },
  tagTextApplied: {
    color: '#166534'
  },
  deadlineText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text
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
    color: theme.colors.muted
  },
  desc: {
    marginTop: 2,
    color: '#334155',
    lineHeight: 20
  },
  cardFooter: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  footerHint: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600'
  }
});
