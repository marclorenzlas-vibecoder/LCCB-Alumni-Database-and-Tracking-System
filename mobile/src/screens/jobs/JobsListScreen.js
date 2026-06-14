import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

const categories = ['All', 'Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];

const STATUS_STYLES = {
  PENDING: { label: 'Pending', badge: { backgroundColor: '#fef3c7' }, text: { color: '#92400e' } },
  REVIEWED: { label: 'Under Review', badge: { backgroundColor: '#e0e7ff' }, text: { color: '#3730a3' } },
  SHORTLISTED: { label: 'Shortlisted', badge: { backgroundColor: '#dcfce7' }, text: { color: '#166534' } },
  ACCEPTED: { label: 'Accepted', badge: { backgroundColor: '#d1fae5' }, text: { color: '#065f46' } },
  REJECTED: { label: 'Not Selected', badge: { backgroundColor: '#fee2e2' }, text: { color: '#991b1b' } }
};

export default function JobsListScreen({ navigation, user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const [jobs, setJobs] = useState([]);
  const [applicationMap, setApplicationMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadJobs = useCallback(async () => {
    const [jobsData, applicationsData] = await Promise.all([
      jobService.getAllJobs(),
      alumniId ? jobService.getApplicationsByAlumni(alumniId) : Promise.resolve([])
    ]);

    setJobs(jobsData || []);

    const nextMap = new Map();
    (applicationsData || []).forEach((entry) => {
      const jobId = Number(entry?.job_posting_id || entry?.job_posting?.id);
      if (!Number.isNaN(jobId)) {
        nextMap.set(jobId, {
          id: entry.id,
          status: entry.status,
          appliedAt: entry.applied_at
        });
      }
    });
    setApplicationMap(nextMap);
  }, [alumniId]);

  const handleWithdraw = (applicationId) => {
    Alert.alert(
      'Withdraw Application',
      'Are you sure you want to withdraw this application? You can reapply later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobService.withdrawApplication(applicationId);
              await loadJobs();
            } catch (error) {
              Alert.alert('Withdraw failed', error?.response?.data?.error || 'Please try again later.');
            }
          }
        }
      ]
    );
  };

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = jobs;

    if (q) {
      result = result.filter((job) => {
        const hay = [job.job_title, job.company, job.location, job.description]
          .map((value) => String(value || ''))
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (selectedCategory !== 'All') {
      result = result.filter((job) => job.category === selectedCategory);
    }

    return result;
  }, [jobs, query, selectedCategory]);

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
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
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

        {/* Category Pills */}
        <View style={styles.categoryRow}>
          {categories.map((category) => (
            <Pressable
              key={category}
              style={[styles.pill, selectedCategory === category && styles.pillActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.pillText, selectedCategory === category && styles.pillTextActive]}>
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.myAppsButton} onPress={() => navigation.navigate('MyApplications')}>
          <Text style={styles.myAppsText}>View My Applications</Text>
        </Pressable>

        {loading ? <LoadingState label="Loading job postings" /> : null}
        {!loading && jobs.length === 0 ? <EmptyState title="No jobs available" /> : null}
        {!loading && jobs.length > 0 && filteredJobs.length === 0 ? <EmptyState title="No matching jobs" /> : null}

        {!loading && filteredJobs.map((job) => {
          const application = applicationMap.get(Number(job.id));
          const isApplied = !!application;
          const status = application?.status;
          return (
          <View key={job.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{job.job_title || 'Job Opening'}</Text>
                <Text style={styles.companyName}>{job.company || 'Company not specified'}</Text>
              </View>
              {isApplied ? (
                <View style={[styles.statusBadge, STATUS_STYLES[status]?.badge]}>
                  <Text style={[styles.statusBadgeText, STATUS_STYLES[status]?.text]}>
                    {STATUS_STYLES[status]?.label || status}
                  </Text>
                </View>
              ) : (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>Open</Text>
                </View>
              )}
            </View>

            {job.created_at ? (
              <Text style={styles.postedDate}>Posted {new Date(job.created_at).toLocaleDateString()}</Text>
            ) : null}

            {/* Metadata Grid */}
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#475569" />
                <Text style={styles.metaText}>{job.location || 'Not specified'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={14} color="#475569" />
                <Text style={styles.metaText}>{job.job_type || 'Not specified'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={14} color="#475569" />
                <Text style={styles.metaText}>{job.salary_range || 'Not specified'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#475569" />
                <Text style={styles.metaText}>Deadline: {formatDate(job.application_deadline)}</Text>
              </View>
            </View>

            {/* Requirements */}
            {job.requirements ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>Requirements</Text>
                <Text style={styles.sectionBoxText} numberOfLines={4}>{job.requirements}</Text>
              </View>
            ) : null}

            {/* Description */}
            {job.description ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>Description</Text>
                <Text style={styles.sectionBoxText} numberOfLines={3}>{job.description}</Text>
              </View>
            ) : null}

            {/* Action */}
            {!isApplied && (
              <Pressable
                style={styles.applyButton}
                onPress={() => navigation.navigate('JobApplication', { jobId: job.id })}
              >
                <Text style={styles.applyButtonText}>Apply Now</Text>
              </Pressable>
            )}
            {isApplied && status === 'PENDING' && (
              <View style={styles.pendingActions}>
                <Ionicons name="time-outline" size={16} color="#ca8a04" />
                <Text style={styles.pendingText}>Application Pending</Text>
                <Pressable
                  style={styles.withdrawBtn}
                  onPress={() => handleWithdraw(application.id)}
                >
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </Pressable>
              </View>
            )}
            {isApplied && status && status !== 'PENDING' && (
              <View style={styles.appliedFooter}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.appliedFooterText}>
                  {status === 'SHORTLISTED' ? 'You were shortlisted!' :
                   status === 'ACCEPTED' ? 'You were accepted!' :
                   status === 'REJECTED' ? 'Not selected' :
                   status === 'REVIEWED' ? 'Under review' : 'Applied'}
                </Text>
              </View>
            )}
          </View>
        );
        })}
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: 12
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
    gap: 12,
    marginTop: 16,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  pillActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb'
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  pillTextActive: {
    color: '#ffffff'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#fff',
    padding: 14,
    gap: 10,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  companyName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  postedDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500'
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  openBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  openBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700'
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '48%'
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    flexShrink: 1
  },
  sectionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  sectionBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  sectionBoxText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19
  },
  applyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  appliedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4
  },
  appliedFooterText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 13
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4
  },
  pendingText: {
    color: '#ca8a04',
    fontWeight: '600',
    fontSize: 13,
    flex: 1
  },
  withdrawBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  withdrawBtnText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 12
  }
});
