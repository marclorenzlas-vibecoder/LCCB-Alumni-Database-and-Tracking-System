import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const openApplicationLink = async () => {
    const rawUrl = String(job.application_url || '').trim();
    if (!rawUrl) {
      Alert.alert('Application link unavailable', 'No external application link was provided for this job.');
      return;
    }

    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unable to open link', 'The application link is not valid.');
      return;
    }

    Linking.openURL(url);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <BackButton navigation={navigation} label="Back to Jobs" />
          <Pressable style={styles.applyButton} onPress={openApplicationLink}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>{job.job_title}</Text>
          </View>

          <Text style={styles.heroCompany}>{job.company || 'Company not specified'}</Text>

        </View>

        <View style={styles.logisticsCard}>
          <View style={styles.logisticsGrid}>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="business-outline" size={16} color="#2563eb" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Company</Text>
                <Text style={styles.logisticsValue}>{job.company || '-'}</Text>
              </View>
            </View>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="location-outline" size={16} color="#2563eb" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Location</Text>
                <Text style={styles.logisticsValue}>{job.location || '-'}</Text>
              </View>
            </View>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="calendar-outline" size={16} color="#16a34a" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Posted</Text>
                <Text style={styles.logisticsValue}>{job.created_at ? formatDate(job.created_at) : '-'}</Text>
              </View>
            </View>
            <View style={styles.logisticsItem}>
              <View style={[styles.logisticsIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="briefcase-outline" size={16} color="#d97706" />
              </View>
              <View style={styles.logisticsContent}>
                <Text style={styles.logisticsLabel}>Employment Type</Text>
                <Text style={styles.logisticsValue}>{job.job_type || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionBody}>{job.description || 'No description provided.'}</Text>
        </View>
      </ScrollView>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12
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
  applyButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 2
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800'
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
  sectionBody: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 23
  },
});

