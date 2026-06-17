import React, { useMemo, useState, useEffect } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { authService } from '../../services/authService';
import { realtimeClient } from '../../services/realtimeClient';
import { getAlumniId, isTeacher } from '../../utils/auth';
import { imageUrl } from '../../utils/formatters';
import { toMultipartFile } from '../../utils/upload';
import { theme } from '../../theme';
import { dataEmitter } from '../../utils/EventEmitter';

const LEVEL_LABELS = {
  INTEGRATED_SCHOOL: 'Integrated School',
  NIGHT_HIGH: 'Night High',
  SENIOR_HIGH: 'Senior High',
  SENIOR_HIGH_SCHOOL: 'Senior High',
  COLLEGE: 'College',
  ETEEAP: 'ETEEAP',
  GRAD_SCHOOL: 'Grad School'
};

const LEVEL_OPTIONS = [
  { value: 'INTEGRATED_SCHOOL', label: 'Integrated School' },
  { value: 'NIGHT_HIGH', label: 'Night High' },
  { value: 'SENIOR_HIGH', label: 'Senior High' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'ETEEAP', label: 'ETEEAP' },
  { value: 'GRAD_SCHOOL', label: 'Grad School' }
];

const BATCH_OPTIONS = Array.from({ length: 60 }, (_, index) => String(new Date().getFullYear() - index));

const createEducationEntry = (entry = {}) => ({
  level: entry.level || '',
  batch: entry.batch ? String(entry.batch) : '',
  graduationYear: entry.graduationYear || entry.graduation_year || ''
});

const normalizeEducationHistory = (alumni = {}) => {
  const raw = alumni.educationHistory || alumni.education_history || [];
  const parsed = Array.isArray(raw) ? raw : [];
  const normalized = parsed.map((entry) => createEducationEntry(entry)).filter((entry) => entry.level || entry.batch || entry.graduationYear);

  if (normalized.length > 0) return normalized;

  if (alumni.level || alumni.batch || alumni.graduationYear || alumni.graduation_year) {
    return [createEducationEntry({
      level: alumni.level,
      batch: alumni.batch,
      graduationYear: alumni.graduationYear || alumni.graduation_year
    })];
  }

  return [createEducationEntry()];
};

const getPrimaryEducation = (history = []) => {
  const filled = history.filter((entry) => entry.level || entry.batch || entry.graduationYear);
  if (filled.length === 0) return createEducationEntry();
  return filled[filled.length - 1];
};

const formatLevelLabel = (value) => LEVEL_LABELS[value] || value || 'Not set';

export default function ProfileScreen({ user, setUser }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const role = String(user?.role || 'ALUMNI').toUpperCase();
  const fullName = `${user?.alumni?.firstName || user?.alumni?.first_name || ''} ${user?.alumni?.lastName || user?.alumni?.last_name || ''}`.trim() || user?.username || 'Alumni User';
  const initialEducationHistory = normalizeEducationHistory(user?.alumni || {});
  const initialPrimaryEducation = getPrimaryEducation(initialEducationHistory);

  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.alumni?.firstName || user?.alumni?.first_name || '',
    middleName: user?.alumni?.middleName || user?.alumni?.middle_name || '',
    lastName: user?.alumni?.lastName || user?.alumni?.last_name || '',
    studentId: user?.alumni?.studentId || user?.alumni?.student_id || '',
    course: user?.alumni?.course || '',
    graduationYear: user?.alumni?.graduationYear || user?.alumni?.graduation_year || initialPrimaryEducation.graduationYear || '',
    currentPosition: user?.alumni?.currentPosition || user?.alumni?.current_position || '',
    company: user?.alumni?.company || '',
    location: user?.alumni?.location || '',
    contactNumber: user?.alumni?.contactNumber || user?.alumni?.contact_number || '',
    skills: user?.alumni?.skills || ''
  });
  const [educationHistory, setEducationHistory] = useState(initialEducationHistory);
  const [saving, setSaving] = useState(false);
  const [imageAsset, setImageAsset] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pickerState, setPickerState] = useState({
    visible: false,
    field: null,
    index: null
  });

  const refreshProfile = React.useCallback(() => {
    if (!user?.id) return;
    authService.getUser(user.id)
      .then(async (freshUser) => {
        const freshEducationHistory = normalizeEducationHistory(freshUser?.alumni || {});
        const primaryEducation = getPrimaryEducation(freshEducationHistory);
        setUser(freshUser);
        await authService.saveUser(freshUser);
        setForm({
          username: freshUser?.username || '',
          email: freshUser?.email || '',
          firstName: freshUser?.alumni?.firstName || freshUser?.alumni?.first_name || '',
          middleName: freshUser?.alumni?.middleName || freshUser?.alumni?.middle_name || '',
          lastName: freshUser?.alumni?.lastName || freshUser?.alumni?.last_name || '',
          studentId: freshUser?.alumni?.studentId || freshUser?.alumni?.student_id || '',
          course: freshUser?.alumni?.course || '',
          graduationYear: freshUser?.alumni?.graduationYear || freshUser?.alumni?.graduation_year || primaryEducation.graduationYear || '',
          currentPosition: freshUser?.alumni?.currentPosition || freshUser?.alumni?.current_position || '',
          company: freshUser?.alumni?.company || '',
          location: freshUser?.alumni?.location || '',
          contactNumber: freshUser?.alumni?.contactNumber || freshUser?.alumni?.contact_number || '',
          skills: freshUser?.alumni?.skills || ''
        });
        setEducationHistory(freshEducationHistory);
      })
      .catch((error) => console.error('Failed to refresh profile:', error));
  }, [setUser, user?.id]);

  const setField = (key, value) => {
    setForm((prev) => {
      if (key !== 'username') return { ...prev, [key]: value };
      const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
      return {
        ...prev,
        username: value,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
      };
    });
  };
  const setEducationField = (index, key, value) => {
    setEducationHistory((prev) => prev.map((entry, i) => {
      if (i !== index) return entry;
      return {
        ...entry,
        [key]: value
      };
    }));
  };
  const addEducationEntry = () => setEducationHistory((prev) => [...prev, createEducationEntry()]);
  const removeEducationEntry = (index) => {
    setEducationHistory((prev) => {
      if (prev.length === 1) return [createEducationEntry()];
      return prev.filter((_, i) => i !== index);
    });
  };
  const openPicker = (index, field) => setPickerState({ visible: true, field, index });
  const closePicker = () => setPickerState({ visible: false, field: null, index: null });
  const selectPickerValue = (value) => {
    if (pickerState.index === null || !pickerState.field) return;
    setEducationField(pickerState.index, pickerState.field, value);
    closePicker();
  };

  // Listen for alumni data updates and refresh profile if it's the current user
  useEffect(() => {
    const handleAlumniUpdated = (updatedAlumnus) => {
      // If the updated alumni is the current user's alumni record, refetch user data
      if (updatedAlumnus?.id === alumniId || updatedAlumnus?.user_id === user?.id) {
        refreshProfile();
      }
    };

    const unsubscribe = dataEmitter.on('alumniUpdated', handleAlumniUpdated);
    const unsubProfileRealtime = realtimeClient.subscribe('profile.updated', (payload) => {
      if (!payload?.userId || Number(payload.userId) === Number(user?.id)) {
        refreshProfile();
      }
    });
    const unsubAlumniRealtime = realtimeClient.subscribe('alumni.updated', (payload) => {
      if (!alumniId || !payload?.alumniId) return;
      if (Number(payload.alumniId) === Number(alumniId)) {
        refreshProfile();
      }
    });

    return () => {
      unsubscribe();
      unsubProfileRealtime();
      unsubAlumniRealtime();
    };
  }, [alumniId, refreshProfile, user?.id]);

  // Refetch profile data when screen comes into focus (catches updates from web)
  useFocusEffect(
    React.useCallback(() => {
      refreshProfile();
      return () => {};
    }, [refreshProfile])
  );

  const onPickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to update your profile image.');
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
    if (!alumniId) {
      Alert.alert('No alumni profile', 'Your account is missing an alumni profile.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      const cleanedEducationHistory = educationHistory
        .map((entry) => createEducationEntry(entry))
        .filter((entry) => entry.level);
      const primaryEducation = getPrimaryEducation(cleanedEducationHistory);
      formData.append('username', form.username || '');
      formData.append('email', form.email || '');
      formData.append('firstName', form.firstName || '');
      formData.append('middleName', form.middleName || '');
      formData.append('lastName', form.lastName || '');
      formData.append('studentId', form.studentId || '');
      formData.append('level', primaryEducation.level || '');
      formData.append('course', form.course || '');
      formData.append('batch', primaryEducation.batch || '');
      formData.append('graduationYear', form.graduationYear || '');
      formData.append('educationHistory', JSON.stringify(cleanedEducationHistory));
      formData.append('currentPosition', form.currentPosition || '');
      formData.append('company', form.company || '');
      formData.append('location', form.location || '');
      formData.append('contactNumber', form.contactNumber || '');
      formData.append('skills', form.skills || '');

      if (imageAsset) {
        const file = toMultipartFile(imageAsset, `profile-${Date.now()}.jpg`);
        if (file) formData.append('profileImage', file);
      }

      const response = await authService.updateProfile(user.id, formData, true);
      const updatedAlumni = response.alumni || {};
      const updatedUser = response.user || user;
      const nextUsername = updatedUser.username || form.username || user.username;
      const nextEmail = updatedUser.email || form.email || user.email;
      const returnedHistory = normalizeEducationHistory(updatedAlumni || {});
      const finalEducationHistory = returnedHistory.some((entry) => entry.level)
        ? returnedHistory
        : (cleanedEducationHistory.length > 0 ? cleanedEducationHistory : [createEducationEntry()]);

      const nextUser = {
        ...user,
        username: nextUsername,
        email: nextEmail,
        profile_image: updatedUser.profile_image || user.profile_image,
        role: updatedUser.role || user.role,
        alumni: {
          ...user.alumni,
          id: updatedAlumni.id || user?.alumni?.id,
          firstName: updatedAlumni.first_name || updatedAlumni.firstName,
          middleName: updatedAlumni.middle_name || updatedAlumni.middleName,
          lastName: updatedAlumni.last_name || updatedAlumni.lastName,
          studentId: updatedAlumni.student_id || updatedAlumni.studentId,
          level: updatedAlumni.level || primaryEducation.level,
          course: updatedAlumni.course || form.course,
          batch: updatedAlumni.batch || primaryEducation.batch,
          graduationYear: updatedAlumni.graduation_year || updatedAlumni.graduationYear || form.graduationYear,
          currentPosition: updatedAlumni.current_position || updatedAlumni.currentPosition,
          company: updatedAlumni.company,
          location: updatedAlumni.location,
          contactNumber: updatedAlumni.contact_number || updatedAlumni.contactNumber,
          skills: updatedAlumni.skills || form.skills,
          educationHistory: finalEducationHistory,
          education_history: finalEducationHistory
        }
      };
      setUser(nextUser);
      await authService.saveUser(nextUser);
      setForm((prev) => ({
        ...prev,
        username: nextUsername,
        email: nextEmail
      }));
      setEducationHistory(finalEducationHistory);
      setImageAsset(null);
      setEditMode(false);
      await refreshProfile();
      // Emit event to notify other screens about data change
      dataEmitter.emit('profileUpdated', nextUser);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Unable to save', error?.response?.data?.error || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <ScreenContainer>
      <View style={styles.heroCard}>
        <View style={styles.heroBgDot} />
        <Pressable onPress={editMode ? onPickImage : undefined} style={styles.heroAvatarWrap}>
          <Image
            source={{ uri: imageAsset?.uri || imageUrl(user?.profile_image, API_ORIGIN) || 'https://via.placeholder.com/150' }}
            style={styles.avatar}
          />
          <View style={styles.onlineBadge} />
          {editMode ? (
            <View style={styles.cameraOverlay}>
              <Ionicons name="add" size={20} color="#ffffff" />
            </View>
          ) : null}
        </Pressable>
        <Text style={styles.heroName}>{form.username || fullName}</Text>
        <Text style={styles.heroEmail}>{form.email || user?.email || '-'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{role}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <Pressable style={styles.editBtn} onPress={() => setEditMode((prev) => !prev)}>
            <Text style={styles.editBtnText}>{editMode ? 'Cancel' : 'Edit Profile'}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Username</Text>
        {editMode ? (
          <TextInput style={styles.input} value={form.username} onChangeText={(v) => setField('username', v)} />
        ) : (
          <Text style={styles.value}>{form.username || '-'}</Text>
        )}

        <Text style={styles.label}>Email</Text>
        {editMode ? (
          <TextInput style={styles.input} keyboardType="email-address" value={form.email} onChangeText={(v) => setField('email', v)} autoCapitalize="none" />
        ) : (
          <Text style={styles.value}>{form.email || '-'}</Text>
        )}

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{role}</Text>

        <Text style={styles.label}>Account Status</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Alumni Information</Text>

        <Text style={styles.label}>First Name</Text>
        {editMode ? <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => setField('firstName', v)} /> : <Text style={styles.value}>{form.firstName || '-'}</Text>}

        <Text style={styles.label}>Middle Name</Text>
        {editMode ? <TextInput style={styles.input} value={form.middleName} onChangeText={(v) => setField('middleName', v)} /> : <Text style={styles.value}>{form.middleName || '-'}</Text>}

        <Text style={styles.label}>Last Name</Text>
        {editMode ? <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => setField('lastName', v)} /> : <Text style={styles.value}>{form.lastName || '-'}</Text>}

        <Text style={styles.label}>School ID / Student Number</Text>
        {editMode ? <TextInput style={styles.input} value={form.studentId} onChangeText={(v) => setField('studentId', v)} placeholder="Optional" /> : <Text style={styles.value}>{form.studentId || 'Not provided'}</Text>}

        <Text style={styles.label}>Course</Text>
        {editMode ? <TextInput style={styles.input} value={form.course} onChangeText={(v) => setField('course', v)} /> : <Text style={styles.value}>{form.course || '-'}</Text>}

        <Text style={styles.label}>Graduation Year</Text>
        {editMode ? <TextInput style={styles.input} keyboardType="number-pad" value={form.graduationYear} onChangeText={(v) => setField('graduationYear', v)} /> : <Text style={styles.value}>{form.graduationYear || '-'}</Text>}

        <Text style={styles.label}>Education History (Level & Batch)</Text>
        <View style={styles.educationWrap}>
          {educationHistory.map((entry, index) => (
            <View key={`education-${index}`} style={styles.educationCard}>
              {editMode ? (
                <>
                  <Text style={styles.subLabel}>Level</Text>
                  <Pressable style={styles.selectInput} onPress={() => openPicker(index, 'level')}>
                    <Text style={entry.level ? styles.selectText : styles.selectPlaceholder}>
                      {entry.level ? formatLevelLabel(entry.level) : 'Select Level'}
                    </Text>
                    <Text style={styles.selectCaret}>v</Text>
                  </Pressable>

                  <Text style={styles.subLabel}>Batch</Text>
                  <Pressable style={styles.selectInput} onPress={() => openPicker(index, 'batch')}>
                    <Text style={entry.batch ? styles.selectText : styles.selectPlaceholder}>
                      {entry.batch || 'Select Batch'}
                    </Text>
                    <Text style={styles.selectCaret}>v</Text>
                  </Pressable>

                  <Pressable style={styles.removeButton} onPress={() => removeEducationEntry(index)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.value}>
                  {`${index + 1}. ${formatLevelLabel(entry.level)}${entry.batch ? `, Batch ${entry.batch}` : ''}`}
                </Text>
              )}
            </View>
          ))}

          {editMode ? (
            <Pressable style={styles.addButton} onPress={addEducationEntry}>
              <Text style={styles.addButtonText}>+ Add Level & Batch</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.label}>Current Position</Text>
        {editMode ? <TextInput style={styles.input} value={form.currentPosition} onChangeText={(v) => setField('currentPosition', v)} /> : <Text style={styles.value}>{form.currentPosition || '-'}</Text>}

        <Text style={styles.label}>Company</Text>
        {editMode ? <TextInput style={styles.input} value={form.company} onChangeText={(v) => setField('company', v)} /> : <Text style={styles.value}>{form.company || '-'}</Text>}

        <Text style={styles.label}>Location</Text>
        {editMode ? <TextInput style={styles.input} value={form.location} onChangeText={(v) => setField('location', v)} /> : <Text style={styles.value}>{form.location || '-'}</Text>}

        <Text style={styles.label}>Skills</Text>
        {editMode ? <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={3} value={form.skills} onChangeText={(v) => setField('skills', v)} /> : <Text style={styles.value}>{form.skills || '-'}</Text>}

        {editMode ? <PrimaryButton label={saving ? 'Saving...' : 'Save Profile'} onPress={onSave} disabled={saving} /> : null}
      </View>

      <PrimaryButton label="Logout" tone="danger" onPress={onLogout} />

      <Modal visible={pickerState.visible} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{pickerState.field === 'level' ? 'Select Level' : 'Select Batch'}</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {(pickerState.field === 'level' ? LEVEL_OPTIONS : BATCH_OPTIONS).map((option) => {
                const value = typeof option === 'string' ? option : option.value;
                const label = typeof option === 'string' ? option : option.label;
                const active = pickerState.index !== null && educationHistory[pickerState.index]?.[pickerState.field] === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => selectPickerValue(value)}
                  >
                    <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 14,
    backgroundColor: '#2747a2',
    borderWidth: 1,
    borderColor: '#3559bc',
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden'
  },
  heroBgDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent'
  },
  heroAvatarWrap: {
    position: 'relative',
    marginBottom: 6
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
    borderWidth: 3,
    borderColor: '#a5b4fc'
  },
  onlineBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#dbeafe'
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  cameraIcon: {
    fontSize: 12
  },
  heroName: {
    fontSize: 38 / 2,
    lineHeight: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center'
  },
  heroEmail: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '600'
  },
  rolePill: {
    marginTop: 4,
    backgroundColor: '#4c67b8',
    borderWidth: 1,
    borderColor: '#6f87cf',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4
  },
  rolePillText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700'
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14,
    gap: 7
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  sectionTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 17
  },
  editBtn: {
    backgroundColor: '#2747a2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12
  },
  value: {
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 6
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 6
  },
  statusText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 4
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  educationWrap: {
    gap: 8,
    marginBottom: 6
  },
  educationCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 4
  },
  subLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#fee2e2'
  },
  removeButtonText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700'
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  selectText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500'
  },
  selectPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500'
  },
  selectCaret: {
    color: '#64748b',
    fontWeight: '700'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    padding: 24
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6deeb',
    maxHeight: '75%'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalList: {
    paddingHorizontal: 8,
    paddingTop: 8
  },
  modalListContent: {
    paddingBottom: 18
  },
  modalOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8
  },
  modalOptionActive: {
    backgroundColor: '#dbeafe'
  },
  modalOptionText: {
    fontSize: 14,
    color: '#334155'
  },
  modalOptionTextActive: {
    color: '#1e3a8a',
    fontWeight: '700'
  }
});
