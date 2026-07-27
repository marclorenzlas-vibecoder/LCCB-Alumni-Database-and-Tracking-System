import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import AchievementVideoPreview from '../../components/AchievementVideoPreview';

function AchievementCardItem({ item, teacher, navigation, onEdit, onDelete }) {
  const [descLines, setDescLines] = useState(4);
  const isVideoAchievement = /\.(mp4|mov|avi|mkv|webm)$/i.test(item.image || '');
  const openDetail = () => {
    if (!teacher) navigation.navigate('AchievementDetail', { achievement: item });
  };

  const handleTitleLayout = (e) => {
    const lines = e.nativeEvent.lines.length;
    setDescLines(lines <= 1 ? 5 : 4);
  };

  return (
    <View
      key={item.id}
      style={styles.card}
    >
      {item.image ? (
        isVideoAchievement ? (
          <AchievementVideoPreview
            uri={imageUrl(item.image, API_ORIGIN)}
            style={styles.preview}
            resizeMode="cover"
          />
        ) : !teacher ? (
          <Pressable onPress={openDetail}>
            <Image source={{ uri: imageUrl(item.image, API_ORIGIN) }} style={styles.preview} />
          </Pressable>
        ) : (
          <Image source={{ uri: imageUrl(item.image, API_ORIGIN) }} style={styles.preview} />
        )
      ) : null}
      <Pressable style={styles.cardBody} onPress={openDetail} disabled={teacher}>
        <View style={styles.metaRow}>
          <Text style={styles.categoryBadge}>{item.category || 'General'}</Text>
          <Text style={styles.yearText}>{item.date ? new Date(item.date).getFullYear() : 'N/A'}</Text>
        </View>
        {item.alumni ? <Text style={styles.author}>{`${item.alumni.first_name || ''} ${item.alumni.last_name || ''}`.trim()}</Text> : null}
        <Text style={styles.title} onTextLayout={handleTitleLayout}>{item.title || 'Achievement'}</Text>
        {item.description ? (
          <View style={{ height: 105, overflow: 'hidden' }}>
            <Text style={styles.body} numberOfLines={descLines}>{item.description}</Text>
          </View>
        ) : null}
        {!teacher && (
          <Pressable
            style={styles.readMoreBtn}
            onPress={(event) => {
              event?.stopPropagation?.();
              openDetail();
            }}
          >
            <Text style={styles.readMoreText}>Read More</Text>
          </Pressable>
        )}
        <Text style={styles.meta}>Date: {formatDate(item.date)}</Text>
      </Pressable>
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
  );
}

function MultiOptionPicker({ visible, title, options, selected, onToggle, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={18} color="#334155" />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
            {options.map((value) => {
              const active = selected.includes(value);
              return (
                <Pressable
                  key={value}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => onToggle(value)}
                >
                  <View style={[styles.checkbox, active && styles.checkboxActive]}>
                    {active ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                  </View>
                  <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>{value}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterDropdown({ visible, categories, years, tempCategories, tempYears, toggleCategory, toggleYear, onApply, onClear, onClose }) {
  const [pickerTarget, setPickerTarget] = useState(null);

  const categoryCount = tempCategories.length;
  const yearCount = tempYears.length;
  const activeCount = categoryCount + yearCount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dropdownBackdrop} onPress={onClose}>
        <Pressable style={styles.dropdownPanel} onPress={() => {}}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Filters</Text>
            {activeCount > 0 ? (
              <View style={styles.dropdownCountBadge}>
                <Text style={styles.dropdownCountText}>{activeCount}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.dropdownFields}>
            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('category')}>
              <Text style={styles.dropdownFieldLabel}>Category</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, categoryCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {categoryCount === 0 ? 'Any category' : `${categoryCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('year')}>
              <Text style={styles.dropdownFieldLabel}>Year</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, yearCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {yearCount === 0 ? 'Any year' : `${yearCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>
          </View>

          <View style={styles.dropdownActions}>
            {activeCount > 0 ? (
              <Pressable style={styles.dropdownClearBtn} onPress={onClear}>
                <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.dropdownClearText}>Clear Filter</Text>
              </Pressable>
            ) : <View style={{ flex: 1 }} />}
            <Pressable style={styles.dropdownApplyBtn} onPress={onApply}>
              <Text style={styles.dropdownApplyText}>Apply Filter</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>

      <MultiOptionPicker
        visible={pickerTarget === 'category'}
        title="Category"
        options={categories}
        selected={tempCategories}
        onToggle={toggleCategory}
        onClose={() => setPickerTarget(null)}
      />
      <MultiOptionPicker
        visible={pickerTarget === 'year'}
        title="Year"
        options={years}
        selected={tempYears}
        onToggle={toggleYear}
        onClose={() => setPickerTarget(null)}
      />
    </Modal>
  );
}

export default function AchievementsScreen({ user, navigation }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const teacher = useMemo(() => isTeacher(user), [user]);
  const categories = useMemo(() => ['Professional', 'Leadership', 'Business', 'Community Service', 'Affiliate'], []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [tempCategories, setTempCategories] = useState([]);
  const [tempYears, setTempYears] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const availableYears = useMemo(() => {
    const years = items
      .map((item) => (item.date ? String(new Date(item.date).getFullYear()) : ''))
      .filter((year) => year && year !== 'NaN');
    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedCategories.length > 0) {
      result = result.filter((item) => selectedCategories.includes(String(item.category || 'General')));
    }

    if (selectedYears.length > 0) {
      result = result.filter((item) => selectedYears.includes(item.date ? String(new Date(item.date).getFullYear()) : ''));
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const alumniName = item.alumni ? `${item.alumni.first_name || ''} ${item.alumni.last_name || ''}`.trim() : '';
        return [item.title, item.category, item.description, alumniName]
          .map((v) => String(v || '').toLowerCase())
          .some((v) => v.includes(q));
      });
    }

    return result;
  }, [items, selectedCategories, selectedYears, searchTerm]);

  const activeFilterCount = selectedCategories.length + selectedYears.length;

  const openFilter = () => {
    setTempCategories([...selectedCategories]);
    setTempYears([...selectedYears]);
    setShowFilterDropdown(true);
  };

  const toggleTempCategory = (value) => {
    setTempCategories((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
  };

  const toggleTempYear = (value) => {
    setTempYears((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
  };

  const applyFilter = () => {
    setSelectedCategories([...tempCategories]);
    setSelectedYears([...tempYears]);
    setShowFilterDropdown(false);
  };

  const clearFilters = () => {
    setTempCategories([]);
    setTempYears([]);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Allow media access to upload achievement image.');
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

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Allow media access to upload achievement video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8
    });

    if (!result.canceled && result.assets?.length) {
      setVideoAsset(result.assets[0]);
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
      if (videoAsset) {
        const file = toMultipartFile(videoAsset, `achievement-${Date.now()}.mp4`);
        if (file) fd.append('video', file);
      }

      if (editingId) {
        await communityService.updateAchievement(editingId, fd);
      } else {
        await communityService.createAchievement(fd);
      }

      setEditingId(null);
      setImageAsset(null);
      setVideoAsset(null);
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
    setVideoAsset(null);
  };

  const onDelete = (id) => {
    Alert.alert(
      'Delete Achievement',
      'Are you sure you want to delete this achievement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityService.deleteAchievement(id);
              await loadItems(false);
            } catch (error) {
              Alert.alert('Delete failed', error?.response?.data?.error || 'Unable to delete.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Alumni Achievements</Text>
        <Text style={styles.headerSubtitle}>Celebrating the outstanding accomplishments of our LCCB alumni across various fields</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon}>
            <Ionicons name="search-outline" size={18} color="#64748b" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search achievements..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <Pressable style={styles.clearBtn} onPress={() => setSearchTerm('')}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        <Pressable style={[styles.filterToggleBtn, activeFilterCount > 0 && styles.filterToggleBtnActive]} onPress={openFilter}>
          <Ionicons name="filter-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#475569'} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterToggleBadge}>
              <Text style={styles.filterToggleBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <FilterDropdown
        visible={showFilterDropdown}
        categories={categories}
        years={availableYears}
        tempCategories={tempCategories}
        tempYears={tempYears}
        toggleCategory={toggleTempCategory}
        toggleYear={toggleTempYear}
        onApply={applyFilter}
        onClear={clearFilters}
        onClose={() => setShowFilterDropdown(false)}
      />

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
          <Pressable style={[styles.pickBtn, { backgroundColor: '#6b21a8' }]} onPress={pickVideo}>
            <Text style={styles.pickText}>{videoAsset ? videoAsset.fileName || 'Video selected' : 'Choose Video'}</Text>
          </Pressable>
          <PrimaryButton label={saving ? 'Saving...' : editingId ? 'Update Achievement' : 'Create Achievement'} onPress={onSave} disabled={saving} />
        </View>
      ) : null}

      {loading ? <LoadingState label="Loading achievements" /> : null}
      {!loading && filteredItems.length === 0 ? <EmptyState title="No achievements yet" /> : null}

      {!loading && filteredItems.map((item) => (
        <AchievementCardItem
          key={item.id}
          item={item}
          teacher={teacher}
          navigation={navigation}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32
  },
  headerWrap: {
    alignItems: 'flex-start',
    paddingBottom: 10
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a'
  },
  clearBtn: {
    marginLeft: 8,
    padding: 4
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 4
  },
  filterToggleBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a'
  },
  filterToggleBadge: {
    position: 'absolute',
    top: -5,
    right: -3,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5
  },
  filterToggleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
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
  },
  readMoreBtn: {
    marginTop: 10,
    marginBottom: 10,
  },
  readMoreText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline'
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  dropdownPanel: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden'
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  dropdownCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdownCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  dropdownFields: {
    padding: 18,
    gap: 0
  },
  dropdownField: {
    paddingVertical: 14
  },
  dropdownFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6
  },
  dropdownFieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownFieldValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1
  },
  dropdownFieldValuePlaceholder: {
    color: '#94a3b8',
    fontWeight: '400'
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9'
  },
  dropdownActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 18
  },
  dropdownClearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  dropdownClearText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700'
  },
  dropdownApplyBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdownApplyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  pickerCard: {
    width: '100%',
    maxHeight: '65%',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden'
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a'
  },
  pickerList: {
    padding: 10
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2
  },
  pickerOptionActive: {
    backgroundColor: '#eff6ff'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#334155'
  },
  pickerOptionTextActive: {
    color: '#1e3a8a',
    fontWeight: '700'
  }
});
