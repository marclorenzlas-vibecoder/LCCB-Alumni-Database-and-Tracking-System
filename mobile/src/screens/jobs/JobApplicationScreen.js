import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import LoadingState from '../../components/LoadingState';
import BackButton from '../../components/BackButton';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';
import { safeGoBack } from '../../utils/safeGoBack';

export default function JobApplicationScreen({ route, navigation, user }) {
  const { jobId } = route.params || {};
  const alumniId = useCallback(() => getAlumniId(user), [user])();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [contactMethod, setContactMethod] = useState('email');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactNumber, setContactNumber] = useState(user?.alumni?.contact_number || user?.contact_number || '');
  const [resumeFiles, setResumeFiles] = useState([]);

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

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const newFiles = (result.assets || []).map((asset) => ({
        name: asset.name,
        size: asset.size,
        uri: asset.uri,
        mimeType: asset.mimeType
      }));

      setResumeFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  const removeFile = (index) => {
    setResumeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!coverLetter.trim()) {
      Alert.alert('Missing Cover Letter', 'Please provide a cover letter before submitting.');
      return;
    }

    const trimmedEmail = String(contactEmail || '').trim();
    const trimmedNumber = String(contactNumber || '').trim();

    if (contactMethod === 'email' && !trimmedEmail) {
      Alert.alert('Missing Contact', 'Please provide a contact email.');
      return;
    }

    if (contactMethod === 'phone' && !trimmedNumber) {
      Alert.alert('Missing Contact', 'Please provide a contact number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        job_posting_id: Number(jobId),
        applicant_id: alumniId,
        cover_letter: coverLetter.trim(),
        contact_method: contactMethod,
        contact_email: trimmedEmail,
        contact_number: trimmedNumber
      };

      if (resumeFiles.length > 0) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, value);
        });
        resumeFiles.forEach((file) => {
          formData.append('resume', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/pdf'
          });
        });
        await jobService.applyToJob(formData);
      } else {
        await jobService.applyToJob(payload);
      }

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
          <BackButton navigation={navigation} label="Go Back" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Job Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.jobTitle}>{job.job_title}</Text>
          <Text style={styles.companyName}>{job.company || 'Company'}</Text>
          <View style={styles.metaRow}>
            {job.location ? (
              <View style={styles.metaChip}>
                <Ionicons name="location-outline" size={13} color="#475569" />
                <Text style={styles.metaChipText}>{job.location}</Text>
              </View>
            ) : null}
            {job.job_type ? (
              <View style={styles.metaChip}>
                <Ionicons name="briefcase-outline" size={13} color="#475569" />
                <Text style={styles.metaChipText}>{job.job_type}</Text>
              </View>
            ) : null}
            {job.salary_range ? (
              <View style={styles.metaChip}>
                <Ionicons name="cash-outline" size={13} color="#475569" />
                <Text style={styles.metaChipText}>{job.salary_range}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBar}>
          <Ionicons name="information-circle-outline" size={16} color="#475569" />
          <Text style={styles.infoText}>
            Your profile info, qualifications, and employment history will be shared with the employer.
          </Text>
        </View>

        {/* Cover Letter */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Cover Letter</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <Text style={styles.sectionHint}>Introduce yourself and explain why you are interested in this position.</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={8}
            placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the position..."
            placeholderTextColor="#cbd5e1"
            value={coverLetter}
            onChangeText={setCoverLetter}
            textAlignVertical="top"
          />
        </View>

        {/* Resume */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume / CV</Text>
          <Text style={styles.sectionHint}>Attach your resume so employers can review your background.</Text>

          <Pressable style={styles.uploadBtn} onPress={pickDocument}>
            <Ionicons name="cloud-upload-outline" size={18} color="#2563eb" />
            <Text style={styles.uploadBtnText}>Choose Files</Text>
          </Pressable>

          {resumeFiles.length > 0 && (
            <View style={styles.fileList}>
              {resumeFiles.map((file, idx) => (
                <View key={idx} style={styles.fileChip}>
                  <Ionicons name="document-text-outline" size={14} color="#475569" />
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileSize}>{Math.round(file.size / 1024)} KB</Text>
                  <Pressable onPress={() => removeFile(idx)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.fileHint}>PDF, DOC, or DOCX. Leave blank to use your profile documents.</Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Contact Method</Text>
          <Text style={styles.sectionHint}>Choose how the employer can reach you.</Text>

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, contactMethod === 'email' && styles.toggleActive]}
              onPress={() => setContactMethod('email')}
            >
              <Ionicons name="mail-outline" size={15} color={contactMethod === 'email' ? '#ffffff' : '#64748b'} />
              <Text style={[styles.toggleLabel, contactMethod === 'email' && styles.toggleLabelActive]}>Email</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, contactMethod === 'phone' && styles.toggleActive]}
              onPress={() => setContactMethod('phone')}
            >
              <Ionicons name="call-outline" size={15} color={contactMethod === 'phone' ? '#ffffff' : '#64748b'} />
              <Text style={[styles.toggleLabel, contactMethod === 'phone' && styles.toggleLabelActive]}>Phone</Text>
            </Pressable>
          </View>

          {contactMethod === 'email' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor="#94a3b8"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor="#94a3b8"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
              />
            </View>
          )}
        </View>

        {/* What Happens Next */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What happens next?</Text>
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={styles.stepText}>Your application will be sent to the employer</Text>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={styles.stepText}>The employer will review your profile and qualifications</Text>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.stepText}>You'll be contacted if your application is selected</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => safeGoBack(navigation)}
            disabled={submitting}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Text style={styles.submitBtnText}>Submitting...</Text>
            ) : (
              <Text style={styles.submitBtnText}>Submit Application</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 48
  },
  summaryCard: {
    marginBottom: 16,
    gap: 4
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28
  },
  companyName: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500'
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569'
  },
  infoBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19
  },
  section: {
    marginBottom: 24
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden'
  },
  sectionHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 10
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#0f172a',
    minHeight: 150,
    lineHeight: 20
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: '#eff6ff'
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb'
  },
  fileList: {
    marginTop: 8,
    gap: 6
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500'
  },
  fileSize: {
    fontSize: 11,
    color: '#94a3b8'
  },
  fileHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 3,
    gap: 3,
    marginBottom: 12
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10
  },
  toggleActive: {
    backgroundColor: '#2563eb'
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  toggleLabelActive: {
    color: '#ffffff'
  },
  inputGroup: {
    gap: 4
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#0f172a'
  },
  steps: {
    marginTop: 8,
    gap: 12
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    paddingTop: 2
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b'
  },
  submitBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  submitBtnText: {
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626'
  },
  backButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 24
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
