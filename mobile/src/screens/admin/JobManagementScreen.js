import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { theme } from '../../theme';

const initialForm = {
  job_title: '',
  company: '',
  location: '',
  department: '',
  job_type: '',
  requirements: '',
  benefits: '',
  application_url: '',
  description: ''
};

export default function JobManagementScreen({ user }) {
  const postedBy = useMemo(() => getAlumniId(user), [user]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const loadJobs = useCallback(async () => {
    const data = await jobService.getAllJobs();
    setJobs(data || []);
  }, []);

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

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async () => {
    if (!form.job_title || !form.company || !form.application_url) {
      Alert.alert('Missing fields', 'Job title, company, and application link are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        posted_by_alumni_id: postedBy,
        ...form
      };

      if (editingId) {
        await jobService.updateJob(editingId, payload);
      } else {
        await jobService.createJob(payload);
      }

      setForm(initialForm);
      setEditingId(null);
      await loadJobs();
    } catch (error) {
      Alert.alert('Unable to save', error?.response?.data?.error || 'Request failed.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (job) => {
    setEditingId(job.id);
    setForm({
      job_title: job.job_title || '',
      company: job.company || '',
      location: job.location || '',
      department: job.department || '',
      job_type: job.job_type || '',
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      application_url: job.application_url || '',
      description: job.description || ''
    });
  };

  const onDelete = async (jobId) => {
    try {
      await jobService.deleteJob(jobId);
      await loadJobs();
    } catch (error) {
      Alert.alert('Unable to delete', error?.response?.data?.error || 'Delete failed.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Edit Job Posting' : 'Create Job Posting'}</Text>
        <TextInput style={styles.input} placeholder="Job Title" value={form.job_title} onChangeText={(v) => setField('job_title', v)} />
        <TextInput style={styles.input} placeholder="Company" value={form.company} onChangeText={(v) => setField('company', v)} />
        <TextInput style={styles.input} placeholder="Location" value={form.location} onChangeText={(v) => setField('location', v)} />
        <TextInput style={styles.input} placeholder="Department (e.g. Technology, Marketing)" value={form.department} onChangeText={(v) => setField('department', v)} />
        <TextInput style={styles.input} placeholder="Job Type" value={form.job_type} onChangeText={(v) => setField('job_type', v)} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Requirements" multiline value={form.requirements} onChangeText={(v) => setField('requirements', v)} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Benefits" multiline value={form.benefits} onChangeText={(v) => setField('benefits', v)} />
        <TextInput
          style={styles.input}
          placeholder="Application Link / Job URL"
          autoCapitalize="none"
          keyboardType="url"
          value={form.application_url}
          onChangeText={(v) => setField('application_url', v)}
        />
        <TextInput style={[styles.input, styles.textAreaLarge]} placeholder="Job Description" multiline value={form.description} onChangeText={(v) => setField('description', v)} />
        <PrimaryButton label={saving ? 'Saving...' : editingId ? 'Update Job' : 'Create Job'} onPress={onSubmit} disabled={saving} />
      </View>

      {loading ? <LoadingState label="Loading jobs" /> : null}
      {!loading && jobs.length === 0 ? <EmptyState title="No job postings yet" /> : null}

      {!loading && jobs.map((job) => (
        <View key={job.id} style={styles.card}>
          <Text style={styles.title}>{job.job_title}</Text>
          <Text style={styles.meta}>{job.company} • {job.location || 'TBA'}</Text>

          <View style={styles.actions}>
            <Pressable style={styles.editBtn} onPress={() => onEdit(job)}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={() => onDelete(job.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d6e6ff',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 10
  },
  formTitle: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top'
  },
  textAreaLarge: {
    minHeight: 132,
    textAlignVertical: 'top'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14,
    gap: 5
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text
  },
  meta: {
    color: theme.colors.muted
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#e0f2fe'
  },
  editText: {
    color: '#075985',
    fontWeight: '700'
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2'
  },
  deleteText: {
    color: '#b91c1c',
    fontWeight: '700'
  }
});
