import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { communityService } from '../../services/communityService';
import { realtimeClient } from '../../services/realtimeClient';
import { getAlumniId, isTeacher } from '../../utils/auth';
import { formatDate, imageUrl } from '../../utils/formatters';
import { toMultipartFile } from '../../utils/upload';
import { theme } from '../../theme';

export default function AchievementsScreen({ user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const teacher = useMemo(() => isTeacher(user), [user]);
  const categories = useMemo(() => ['All', 'Professional', 'Academic', 'Business', 'Community Service'], []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageAsset, setImageAsset] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [form, setForm] = useState({
    alumni_id: alumniId ? String(alumniId) : '',
    title: '',
    description: '',
    date: ''
  });

  const loadItems = React.useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      // Show the shared achievements feed, same behavior as web.
      const data = await communityService.getAchievements();
      setItems(data || []);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems(true).catch((error) => console.error('Failed to load achievements:', error?.message || error));

    const unsubCreated = realtimeClient.subscribe('achievement.created', () => loadItems(false));
    const unsubUpdated = realtimeClient.subscribe('achievement.updated', () => loadItems(false));
    const unsubDeleted = realtimeClient.subscribe('achievement.deleted', () => loadItems(false));

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [loadItems]);

  useFocusEffect(
    React.useCallback(() => {
      loadItems(false).catch((error) => console.error('Failed to refresh achievements:', error?.message || error));
      return () => {};
    }, [loadItems])
  );

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter((item) => String(item.category || 'General') === selectedCategory);
  }, [items, selectedCategory]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to upload achievement image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (!result.canceled && result.assets?.length) {
      setImageAsset(result.assets[0]);
    }
  };

  const onSave = async () => {
    if (!form.alumni_id || !form.title) {
      Alert.alert('Missing fields', 'alumni_id and title are required.');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('alumni_id', form.alumni_id);
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      if (form.date) fd.append('date', form.date);
      if (imageAsset) {
        const file = toMultipartFile(imageAsset, `achievement-${Date.now()}.jpg`);
        if (file) fd.append('image', file);
      }

      if (editingId) {
        await communityService.updateAchievement(editingId, fd);
      } else {
        await communityService.createAchievement(fd);
      }

      setEditingId(null);
      setImageAsset(null);
      setForm({ alumni_id: alumniId ? String(alumniId) : '', title: '', description: '', date: '' });
      await loadItems(false);
    } catch (error) {
      Alert.alert('Unable to save', error?.response?.data?.error || 'Request failed.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item) => {
    setEditingId(item.id);
    setForm({
      alumni_id: String(item.alumni_id || alumniId || ''),
      title: item.title || '',
      description: item.description || '',
      date: item.date ? String(item.date).slice(0, 10) : ''
    });
    setImageAsset(null);
  };

  const onDelete = async (id) => {
    try {
      await communityService.deleteAchievement(id);
      await loadItems(false);
    } catch (error) {
      Alert.alert('Delete failed', error?.response?.data?.error || 'Unable to delete.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Alumni Achievements</Text>
        <Text style={styles.headerSubtitle}>Celebrating the outstanding accomplishments of our LCCB alumni across various fields</Text>
      </View>

      <View style={styles.chipsWrap}>
        {categories.map((category) => {
          const active = selectedCategory === category;
          return (
            <Pressable key={category} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelectedCategory(category)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{category}</Text>
            </Pressable>
          );
        })}
      </View>

      {teacher ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Achievement' : 'Add Achievement'}</Text>
          <TextInput style={styles.input} placeholder="Alumni ID" keyboardType="number-pad" value={form.alumni_id} onChangeText={(v) => setForm((p) => ({ ...p, alumni_id: v }))} />
          <TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Description" multiline value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={form.date} onChangeText={(v) => setForm((p) => ({ ...p, date: v }))} />
          <Pressable style={styles.pickBtn} onPress={pickImage}>
            <Text style={styles.pickText}>{imageAsset ? imageAsset.fileName || 'Image selected' : 'Choose Image'}</Text>
          </Pressable>
          <PrimaryButton label={saving ? 'Saving...' : editingId ? 'Update Achievement' : 'Create Achievement'} onPress={onSave} disabled={saving} />
        </View>
      ) : null}

      {loading ? <LoadingState label="Loading achievements" /> : null}
      {!loading && filteredItems.length === 0 ? <EmptyState title="No achievements yet" /> : null}

      {!loading && filteredItems.map((item) => (
        <View key={item.id} style={styles.card}>
          {item.image ? <Image source={{ uri: imageUrl(item.image, API_ORIGIN) }} style={styles.preview} /> : null}
          <View style={styles.cardBody}>
            <View style={styles.metaRow}>
              <Text style={styles.categoryBadge}>{item.category || 'General'}</Text>
              <Text style={styles.yearText}>{item.date ? new Date(item.date).getFullYear() : 'N/A'}</Text>
            </View>
            {item.alumni ? <Text style={styles.author}>{`${item.alumni.first_name || ''} ${item.alumni.last_name || ''}`.trim()}</Text> : null}
            <Text style={styles.title}>{item.title || 'Achievement'}</Text>
            {item.description ? <Text style={styles.body} numberOfLines={4}>{item.description}</Text> : null}
            <Text style={styles.meta}>{formatDate(item.date)}</Text>
          </View>
          {teacher ? (
            <View style={styles.actions}>
              <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => onDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 12
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  chipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
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
    minHeight: 90,
    textAlignVertical: 'top'
  },
  pickBtn: {
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    paddingVertical: 10,
    alignItems: 'center'
  },
  pickText: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  cardBody: {
    padding: 14,
    gap: 6
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700'
  },
  yearText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  author: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: theme.colors.text
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12
  },
  body: {
    color: '#1f2937',
    lineHeight: 21
  },
  preview: {
    width: '100%',
    height: 210,
    backgroundColor: '#e2e8f0'
  },
  actions: {
    flexDirection: 'row',
    gap: 10
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#dbeafe'
  },
  editText: {
    color: '#1e3a8a',
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
