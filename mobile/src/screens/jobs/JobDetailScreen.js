import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import BackButton from '../../components/BackButton';
import JobFormModal from '../../components/JobFormModal';
import { jobService } from '../../services/jobService';
import { realtimeClient } from '../../services/realtimeClient';
import { formatDate, imageUrl } from '../../utils/formatters';
import { API_ORIGIN } from '../../config/api';
import { cleanClientText } from '../../utils/cleanText';
import { getAlumniId, isTeacher } from '../../utils/auth';

const getPosterInfo = (job) => {
  if (job?.alumni) {
    const firstName = job.alumni.first_name || '';
    const lastName = job.alumni.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || 'Alumni Member';
    return {
      name,
      role: 'Alumni',
      profileImage: job.alumni.profile_image || null,
      email: job.alumni.email || null,
      userId: job.alumni.user_id || null,
      alumniId: job.alumni.id,
      isSchoolAdmin: false
    };
  }

  return {
    name: 'School Administration / Placement',
    role: 'LCCB Admin',
    profileImage: null,
    email: null,
    userId: null,
    alumniId: null,
    isSchoolAdmin: true
  };
};

function FormattedJobDescription({ rawText }) {
  const text = useMemo(() => cleanClientText(rawText), [rawText]);
  if (!text) {
    return <Text style={styles.sectionBody}>No description provided.</Text>;
  }

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <View style={styles.descContainer}>
      {paragraphs.map((para, pIdx) => {
        const isMarkdownHeading = /^\*\*.*?\*\*$/.test(para.trim());
        const cleanHeadingText = para.replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').trim();
        const isHeading =
          isMarkdownHeading ||
          /^(responsibilities|requirements|qualifications|about the role|about linkedin|job description|overview|what you'll do|skills|benefits|minimum qualifications|preferred qualifications|key responsibilities)[:]?$/i.test(
            para.trim()
          );

        if (isHeading) {
          return (
            <View key={pIdx} style={styles.descHeadingContainer}>
              <View style={styles.descHeadingDot} />
              <Text style={styles.descHeadingText}>{cleanHeadingText || para}</Text>
            </View>
          );
        }

        const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
        const hasBullets = lines.some((l) => /^[-•*]\s+/.test(l));

        if (hasBullets) {
          return (
            <View key={pIdx} style={styles.bulletList}>
              {lines.map((line, lIdx) => {
                if (/^[-•*]\s+/.test(line)) {
                  return (
                    <View key={lIdx} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{line.replace(/^[-•*]\s+/, '')}</Text>
                    </View>
                  );
                }
                return (
                  <Text key={lIdx} style={styles.descParagraphText}>
                    {line}
                  </Text>
                );
              })}
            </View>
          );
        }

        return (
          <Text key={pIdx} style={styles.descParagraphText}>
            {para}
          </Text>
        );
      })}
    </View>
  );
}

export default function JobDetailScreen({ route, navigation, user }) {
  const { jobId } = route.params;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadJob = async () => {
    const jobData = await jobService.getJobById(jobId);
    setJob(jobData);
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadJob()
      .catch((e) => console.error('Failed to load job:', e?.message || e))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const unsubUpdated = realtimeClient.subscribe('job.updated', (payload) => {
      if (payload?.jobId === Number(jobId)) loadJob().catch(() => {});
    });

    return () => {
      mounted = false;
      unsubUpdated();
    };
  }, [jobId]);

  const poster = useMemo(() => getPosterInfo(job), [job]);

  const canManageJob = useMemo(() => {
    if (!job) return false;
    // Admins / teachers can manage any job:
    if (isTeacher(user)) return true;
    // Alumni can only manage their own:
    const myAlumniId = getAlumniId(user);
    if (myAlumniId && job.posted_by_alumni_id && Number(myAlumniId) === Number(job.posted_by_alumni_id)) {
      return true;
    }
    return false;
  }, [job, user]);

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


  const handleDeleteJob = () => {
    Alert.alert(
      'Delete Job Posting',
      'Are you sure you want to delete this job posting? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobService.deleteJob(job.id);
              realtimeClient.emit('job.deleted', { jobId: job.id });
              Alert.alert('Success', 'Job posting deleted successfully.');
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                'Delete Failed',
                err?.response?.data?.error || err?.message || 'Failed to delete job posting.'
              );
            }
          }
        }
      ]
    );
  };

  const handleUpdateJob = async (formData) => {
    setIsSaving(true);
    try {
      const updated = await jobService.updateJob(job.id, formData);
      setJob(updated);
      setShowEditModal(false);
      realtimeClient.emit('job.updated', { jobId: job.id });
      Alert.alert('Success', 'Job posting updated successfully.');
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err?.response?.data?.error || err?.message || 'Failed to update job posting.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const avatarSource = poster.profileImage
    ? { uri: imageUrl(poster.profileImage, API_ORIGIN) }
    : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <BackButton navigation={navigation} label="Back to Jobs" />
          <Pressable style={styles.applyButton} onPress={openApplicationLink}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{job.job_title}</Text>
          <Text style={styles.heroCompany}>{job.company || 'Company not specified'}</Text>
        </View>

        {/* Posted By Information Card */}
        <View style={styles.posterCard}>
          <View style={styles.posterHeader}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.posterAvatarImg} />
            ) : (
              <View
                style={[
                  styles.posterAvatar,
                  poster.isSchoolAdmin && { backgroundColor: '#7c3aed' }
                ]}
              >
                {poster.isSchoolAdmin ? (
                  <Ionicons name="school" size={20} color="#fff" />
                ) : (
                  <Text style={styles.posterAvatarText}>
                    {poster.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.posterInfo}>
              <View style={styles.badgeRow}>
                <Text style={styles.posterSub}>POSTED BY</Text>
                <View
                  style={[
                    styles.roleBadge,
                    poster.isSchoolAdmin ? styles.roleBadgeAdmin : styles.roleBadgeAlumni
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      poster.isSchoolAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextAlumni
                    ]}
                  >
                    {poster.role}
                  </Text>
                </View>
              </View>
              <Text style={styles.posterName} numberOfLines={1}>
                {poster.name}
              </Text>
              {poster.email ? (
                <Text style={styles.posterEmail} numberOfLines={1}>
                  {poster.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Action Row for Owners/Admins (Edit & Delete) */}
          {canManageJob ? (
            <View style={styles.manageRow}>
              <Pressable
                style={styles.editJobBtn}
                onPress={() => setShowEditModal(true)}
              >
                <Ionicons name="create-outline" size={16} color="#ffffff" />
                <Text style={styles.editJobBtnText}>Edit Job</Text>
              </Pressable>

              <Pressable
                style={styles.deleteJobBtn}
                onPress={handleDeleteJob}
              >
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.deleteJobBtnText}>Delete Job</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Logistics Grid Card */}
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

        {/* About the Position (Formatted Description) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderIcon}>
              <Ionicons name="document-text-outline" size={16} color="#2563eb" />
            </View>
            <Text style={styles.sectionHeaderTitle}>About the Position</Text>
          </View>

          <FormattedJobDescription rawText={job.description} />
        </View>
      </ScrollView>

      {/* Edit Job Modal */}
      <JobFormModal
        visible={showEditModal}
        initialJob={job}
        loading={isSaving}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateJob}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 36
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 18,
    gap: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28
  },
  heroCompany: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2
  },
  posterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  posterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  posterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  posterAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0'
  },
  posterAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  posterInfo: {
    flex: 1
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  posterSub: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6
  },
  roleBadgeAlumni: {
    backgroundColor: '#eff6ff'
  },
  roleBadgeTextAlumni: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '700'
  },
  roleBadgeAdmin: {
    backgroundColor: '#faf5ff'
  },
  roleBadgeTextAdmin: {
    color: '#7c3aed',
    fontSize: 10,
    fontWeight: '700'
  },
  posterName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2
  },
  posterEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  editJobBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2
  },
  editJobBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  deleteJobBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2
  },
  deleteJobBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  logisticsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
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
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 1
  },
  applyButton: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 2
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  sectionBody: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22
  },
  descContainer: {
    gap: 14
  },
  descHeadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  descHeadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb'
  },
  descHeadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  bulletList: {
    gap: 8,
    paddingLeft: 4
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginTop: 7,
    flexShrink: 0
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 21
  },
  descParagraphText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22
  }
});
