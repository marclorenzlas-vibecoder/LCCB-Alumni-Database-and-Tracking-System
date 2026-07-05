import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import BackButton from '../../components/BackButton';
import { jobService } from '../../services/jobService';
import { formatDate } from '../../utils/formatters';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const loadData = async () => {
      const jobData = await jobService.getJobById(jobId);
      if (!mounted) return;
      setJob(jobData);
    };
    loadData()
      .catch((e) => console.error('Failed to load job:', e?.message || e))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [jobId]);

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
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Job not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const requirementsList = job.requirements
    ? job.requirements.split('\n').map((r) => r.trim()).filter(Boolean)
    : [];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <BackButton navigation={navigation} label="Back to Jobs" />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>{job.job_title}</Text>
          </View>

          <Text style={styles.heroCompany}>{job.company || 'Company not specified'}</Text>

          {job.created_at ? (
            <Text style={styles.heroPosted}>Posted {formatDate(job.created_at)}</Text>
          ) : null}
        </View>

        <View style={styles.logisticsCard}>
          <View style={styles.logisticsGrid}>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="location-outline" size={16} color="#2563eb" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Location</Text>
                <Text style={styles.logisticsValue}>{job.location || '—'}</Text>
              </View>
            </View>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="business-outline" size={16} color="#16a34a" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Department</Text>
                <Text style={styles.logisticsValue}>{job.department || '—'}</Text>
              </View>
            </View>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="briefcase-outline" size={16} color="#d97706" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Work Type</Text>
                <Text style={styles.logisticsValue}>{job.job_type || '—'}</Text>
              </View>
            </View>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#fce7f3' }]}>
                <Ionicons name="cash-outline" size={16} color="#db2777" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Salary</Text>
                <Text style={styles.logisticsValue}>{job.salary_range || '—'}</Text>
              </View>
            </View>
          </View>
          {job.application_deadline ? (
            <View style={styles.deadlineRow}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.deadlineText}>Deadline: {formatDate(job.application_deadline)}</Text>
            </View>
          ) : null}
        </View>

        {requirementsList.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {requirementsList.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionBody}>{job.description || 'No description provided.'}</Text>
        </View>

        {job.benefits ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            <Text style={styles.sectionBody}>{job.benefits}</Text>
          </View>
        ) : null}
      </ScrollView>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748b'
  },
  heroCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 16,
    padding: 18,
    gap: 6,
    marginBottom: 12
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10
  },
  heroTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28
  },
  heroCompany: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2
  },
  heroPosted: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4
  },
  logisticsCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12
  },
  logisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  logisticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '47%'
  },
  logisticsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logisticsContent: {
    flex: 1
  },
  logisticsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  logisticsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 1
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  sectionBody: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 23
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4
  },
  bulletDot: {
    fontSize: 15,
    color: '#2563eb',
    lineHeight: 22,
    fontWeight: '700'
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 22
  },
});
