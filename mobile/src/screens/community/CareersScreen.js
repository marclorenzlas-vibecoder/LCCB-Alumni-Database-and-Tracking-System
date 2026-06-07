import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { communityService } from '../../services/communityService';
import { getAlumniId } from '../../utils/auth';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

export default function CareersScreen({ user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company: '',
    job_title: '',
    start_date: '',
    description: ''
  });

  const loadEntries = useCallback(async () => {
    const data = await communityService.getCareers(alumniId);
    setItems(data || []);
  }, [alumniId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadEntries()
        .catch((error) => console.error('Failed to load career entries:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [loadEntries])
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onAddCareer = async () => {
    if (!alumniId) {
      Alert.alert('No alumni profile', 'Your account is missing an alumni profile.');
      return;
    }

    if (!form.company || !form.job_title) {
      Alert.alert('Missing fields', 'Company and job title are required.');
      return;
    }

    setSubmitting(true);
    try {
      await communityService.createCareer({
        alumni_id: alumniId,
        company: form.company,
        job_title: form.job_title,
        start_date: form.start_date || null,
        description: form.description || null,
        is_current: true
      });
      setForm({ company: '', job_title: '', start_date: '', description: '' });
      await loadEntries();
    } catch (error) {
      Alert.alert('Unable to save', error?.response?.data?.error || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add Career Entry</Text>
        <TextInput style={styles.input} placeholder="Company" value={form.company} onChangeText={(v) => setField('company', v)} />
        <TextInput style={styles.input} placeholder="Job Title" value={form.job_title} onChangeText={(v) => setField('job_title', v)} />
        <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" value={form.start_date} onChangeText={(v) => setField('start_date', v)} />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={form.description}
          onChangeText={(v) => setField('description', v)}
          multiline
          numberOfLines={4}
        />
        <PrimaryButton label={submitting ? 'Saving...' : 'Save Career Entry'} onPress={onAddCareer} disabled={submitting} />
      </View>

      {loading ? <LoadingState label="Loading career journey" /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No career entries yet" /> : null}

      {!loading && items.map((entry) => (
        <Pressable key={entry.id} style={styles.card}>
          <Text style={styles.title}>{entry.job_title}</Text>
          <Text style={styles.meta}>{entry.company}</Text>
          <Text style={styles.meta}>{formatDate(entry.start_date)} - {entry.end_date ? formatDate(entry.end_date) : 'Present'}</Text>
          {entry.description ? <Text style={styles.body}>{entry.description}</Text> : null}
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d6e6ff',
    backgroundColor: '#f4f8ff',
    padding: 14,
    gap: 10
  },
  formTitle: {
    fontWeight: '700',
    color: '#1e3a8a'
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
    minHeight: 90,
    textAlignVertical: 'top'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14,
    gap: 6
  },
  title: {
    fontWeight: '700',
    color: theme.colors.text
  },
  meta: {
    color: theme.colors.muted
  },
  body: {
    color: '#1f2937'
  }
});
