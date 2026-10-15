import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const departments = ['Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];
const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Remote'];

const emptyForm = {
  job_title: '',
  company: '',
  location: '',
  department: 'Technology',
  job_type: 'Full-time',
  application_url: '',
  description: ''
};

export default function JobFormModal({
  visible,
  onClose,
  onSubmit,
  initialJob = null,
  loading = false
}) {
  const isEditing = Boolean(initialJob?.id);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initialJob) {
      setForm({
        job_title: initialJob.job_title || '',
        company: initialJob.company || '',
        location: initialJob.location || '',
        department: initialJob.department || 'Technology',
        job_type: initialJob.job_type || 'Full-time',
        application_url: initialJob.application_url || '',
        description: initialJob.description || ''
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialJob, visible]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.job_title.trim()) {
      Alert.alert('Missing Field', 'Please enter a job title.');
      return;
    }
    if (!form.company.trim()) {
      Alert.alert('Missing Field', 'Please enter a company name.');
      return;
    }
    if (!form.application_url.trim()) {
      Alert.alert('Missing Field', 'Please enter an application link or URL.');
      return;
    }

    onSubmit({
      ...form,
      job_title: form.job_title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      application_url: form.application_url.trim(),
      description: form.description.trim()
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Edit Job Posting' : 'Post New Opportunity'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditing
                  ? 'Update details for this employment opening.'
                  : 'Share career opportunities with fellow alumni.'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Form Scroll Area */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Job Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Job Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Senior Software Engineer"
                placeholderTextColor="#94a3b8"
                value={form.job_title}
                onChangeText={(text) => updateField('job_title', text)}
              />
            </View>

            {/* Company */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Company <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Google Philippines"
                placeholderTextColor="#94a3b8"
                value={form.company}
                onChangeText={(text) => updateField('company', text)}
              />
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bacolod City or Remote"
                placeholderTextColor="#94a3b8"
                value={form.location}
                onChangeText={(text) => updateField('location', text)}
              />
            </View>

            {/* Department */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Department</Text>
              <View style={styles.chipsRow}>
                {departments.map((dept) => {
                  const active = form.department === dept;
                  return (
                    <Pressable
                      key={dept}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => updateField('department', dept)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Job Type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Job Type</Text>
              <View style={styles.chipsRow}>
                {jobTypes.map((type) => {
                  const active = form.job_type === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => updateField('job_type', type)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Application URL */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Application Link <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="https://company.com/apply or email"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="url"
                value={form.application_url}
                onChangeText={(text) => updateField('application_url', text)}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description & Qualifications</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Responsibilities, requirements, and benefits..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={form.description}
                onChangeText={(text) => updateField('description', text)}
              />
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <View style={styles.submitRightGroup}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isEditing ? 'Update Job' : 'Post Job'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end'
  },
  backdropTouch: {
    flex: 1
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  formScroll: {
    paddingHorizontal: 20
  },
  formContent: {
    paddingVertical: 16,
    gap: 14
  },
  fieldGroup: {
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  required: {
    color: '#ef4444'
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a'
  },
  textArea: {
    minHeight: 110
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  chipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff'
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  chipTextActive: {
    color: '#2563eb',
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12
  },
  submitRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto'
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600'
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100
  },
  submitBtnDisabled: {
    opacity: 0.7
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});
