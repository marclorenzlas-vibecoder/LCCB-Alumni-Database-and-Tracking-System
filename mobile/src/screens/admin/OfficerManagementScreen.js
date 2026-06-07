import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { adminService } from '../../services/adminService';
import { theme } from '../../theme';

const initialForm = {
  alumni_id: '',
  batch: '',
  position: '',
  term_start: '',
  term_end: ''
};

export default function OfficerManagementScreen() {
  const [summary, setSummary] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [sum, list] = await Promise.all([
      adminService.getOfficerSummary(),
      adminService.getOfficers(selectedBatch ? { batch: selectedBatch } : {})
    ]);
    setSummary(sum || []);
    setOfficers(list || []);
  }, [selectedBatch]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadData()
        .catch((error) => console.error('Failed to load officers:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [loadData])
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onAssign = async () => {
    if (!form.alumni_id || !form.batch || !form.position) {
      Alert.alert('Missing fields', 'alumni_id, batch, and position are required.');
      return;
    }

    setSaving(true);
    try {
      await adminService.assignOfficer(form);
      setForm(initialForm);
      await loadData();
    } catch (error) {
      Alert.alert('Assign failed', error?.response?.data?.message || 'Unable to assign officer.');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (id) => {
    try {
      await adminService.removeOfficer(id);
      await loadData();
    } catch (error) {
      Alert.alert('Remove failed', error?.response?.data?.message || 'Unable to remove officer.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Assign Officer</Text>
        <TextInput style={styles.input} placeholder="Alumni ID" keyboardType="number-pad" value={form.alumni_id} onChangeText={(v) => setField('alumni_id', v)} />
        <TextInput style={styles.input} placeholder="Batch" keyboardType="number-pad" value={form.batch} onChangeText={(v) => setField('batch', v)} />
        <TextInput style={styles.input} placeholder="Position (President, Secretary...)" value={form.position} onChangeText={(v) => setField('position', v)} />
        <TextInput style={styles.input} placeholder="Term Start" keyboardType="number-pad" value={form.term_start} onChangeText={(v) => setField('term_start', v)} />
        <TextInput style={styles.input} placeholder="Term End" keyboardType="number-pad" value={form.term_end} onChangeText={(v) => setField('term_end', v)} />
        <PrimaryButton label={saving ? 'Assigning...' : 'Assign Officer'} onPress={onAssign} disabled={saving} />
      </View>

      <View style={styles.filterRow}>
        <TextInput
          style={[styles.input, styles.filterInput]}
          placeholder="Filter batch"
          keyboardType="number-pad"
          value={selectedBatch}
          onChangeText={setSelectedBatch}
        />
        <Pressable style={styles.refreshBtn} onPress={loadData}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.formTitle}>Batch Summary</Text>
        {summary.length === 0 ? <Text style={styles.meta}>No summary data.</Text> : summary.map((row) => (
          <Text key={String(row.batch)} style={styles.meta}>Batch {row.batch}: {row._count?.id || 0} officers</Text>
        ))}
      </View>

      {loading ? <LoadingState label="Loading officers" /> : null}
      {!loading && officers.length === 0 ? <EmptyState title="No officers found" /> : null}

      {!loading && officers.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <Text style={styles.name}>{entry.alumni?.first_name} {entry.alumni?.last_name}</Text>
          <Text style={styles.meta}>Batch {entry.batch} • {entry.position}</Text>
          <Text style={styles.meta}>{entry.alumni?.course || 'No course'}</Text>
          <Pressable style={styles.removeBtn} onPress={() => onRemove(entry.id)}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
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
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  filterInput: {
    flex: 1
  },
  refreshBtn: {
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  refreshText: {
    color: '#075985',
    fontWeight: '700'
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14,
    gap: 6
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14,
    gap: 5
  },
  name: {
    fontWeight: '700',
    color: theme.colors.text
  },
  meta: {
    color: theme.colors.muted
  },
  removeBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  removeText: {
    color: '#b91c1c',
    fontWeight: '700'
  }
});
