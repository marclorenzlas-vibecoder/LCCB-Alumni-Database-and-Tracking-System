import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import LoadingState from '../../components/LoadingState';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';

export default function JobApplicationScreen({ route, navigation, user }) {
  const { jobId } = route.params || {};
  const alumniId = useCallback(() => getAlumniId(user), [user])();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      if (!jobId) {
        setJob(null);
        return;
      }
      const response = await jobService.getJobById(jobId);
      setJob(response.data || response);
    } catch (err) {
      console.error('Error loading job:', err);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadJob().catch(err => {
        if (mounted) console.error('Failed to load job:', err);
      }).finally(() => {
        if (mounted) setLoading(false);
      });

      return () => {
        mounted = false;
      };
    }, [loadJob])
  );

  const handleSubmit = async () => {
    if (!coverLetter.trim()) {
      Alert.alert('Missing Cover Letter', 'Please provide a cover letter before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await jobService.applyToJob({
        job_posting_id: Number(jobId),
        applicant_id: alumniId,
        cover_letter: coverLetter.trim()
      });

      Alert.alert('Success', 'Your application has been submitted successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MyApplications')
        }
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingState label="Loading job details" />
      </ScreenContainer>
    );
  }

  if (!job) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Job Not Found</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Job Header */}
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>Apply for {job.job_title}</Text>
        <Text style={styles.companyName}>at {job.company || 'Company'}</Text>
      </View>

      {/* Info Alert */}
      <View style={styles.infoBox}>
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle" size={20} color="#0284c7" />
        </View>
        <Text style={styles.infoText}>
          Your profile information, qualifications, and employment history will be shared with the employer once you submit this application.
        </Text>
      </View>

      {/* Cover Letter Section */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
          <Text style={styles.required}>(Required)</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Introduce yourself and explain why you're interested in the position. This field is required.
        </Text>
        
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={8}
          placeholder="Dear Hiring Manager,

I am writing to express my interest in the position..."
          placeholderTextColor="#cbd5e1"
          value={coverLetter}
          onChangeText={setCoverLetter}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.resumeReminderBox}>
        <Text style={styles.resumeReminderTitle}>Resume Reminder</Text>
        <Text style={styles.resumeReminderText}>
          After submitting your application, please send your CV or resume straight to zora@gmail.com.
        </Text>
      </View>

      {/* What Happens Next */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>What happens next?</Text>
        
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.bulletText}>Your application will be sent to the employer</Text>
          </View>
          
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.bulletText}>The employer will review your profile and qualifications</Text>
          </View>
          
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.bulletText}>You'll be contacted if your application is selected</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <Pressable
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  jobHeader: {
    marginBottom: 24,
    gap: 4
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 32
  },
  companyName: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500'
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 14,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start'
  },
  infoIcon: {
    marginTop: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cffafe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 21,
    fontWeight: '500'
  },
  formSection: {
    marginBottom: 24,
    gap: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  required: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500'
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f8fafc',
    fontSize: 14,
    color: '#0f172a',
    minHeight: 160,
    lineHeight: 20,
    fontFamily: 'System'
  },
  resumeReminderBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    gap: 4
  },
  resumeReminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e'
  },
  resumeReminderText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20
  },
  bulletList: {
    gap: 12
  },
  bulletItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start'
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginTop: 2
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 48
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569'
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626'
  },
  backButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
