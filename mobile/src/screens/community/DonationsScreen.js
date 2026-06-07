import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import SectionHeader from '../../components/SectionHeader';
import { API_ORIGIN } from '../../config/api';
import { donationService } from '../../services/donationService';
import { getAlumniId, isTeacher } from '../../utils/auth';
import { extractDonationMeta, withDonationMeta } from '../../utils/donationMeta';
import { formatCurrency, formatDate, imageUrl } from '../../utils/formatters';
import { toMultipartFile } from '../../utils/upload';
import { theme } from '../../theme';

export default function DonationsScreen({ user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const teacher = useMemo(() => isTeacher(user), [user]);
  const [items, setItems] = useState([]);
  const [weeklyStatus, setWeeklyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageAsset, setImageAsset] = useState(null);
  const [qrImageAsset, setQrImageAsset] = useState(null);
  const [form, setForm] = useState({
    amount: '',
    purpose: '',
    description: '',
    category: '',
    goal: '',
    date: '',
    qrImagePath: '',
    paymentNumber: '',
    paymentMethods: ''
  });

  const loadData = useCallback(async () => {
    if (!alumniId) {
      setItems([]);
      setWeeklyStatus(null);
      return;
    }

    const [donations, status] = await Promise.all([
      teacher ? donationService.getAll() : donationService.getByAlumni(alumniId),
      teacher ? Promise.resolve(null) : donationService.getWeeklyStatus(alumniId)
    ]);

    setItems(donations || []);
    setWeeklyStatus(status || null);
  }, [alumniId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadData()
        .catch((error) => console.error('Failed to load donations:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [loadData])
  );

  const onSubmitDonation = async () => {
    if (!form.amount || !form.purpose) {
      Alert.alert('Missing fields', 'Amount and purpose are required.');
      return;
    }

    setSubmitting(true);
    try {
      const descriptionWithMeta = withDonationMeta(form.description, {
        qrImagePath: form.qrImagePath,
        paymentNumber: form.paymentNumber,
        paymentMethods: form.paymentMethods
      });

      const fd = new FormData();
      fd.append('amount', String(Number(form.amount)));
      fd.append('purpose', form.purpose);
      if (descriptionWithMeta) fd.append('description', descriptionWithMeta);
      if (form.category) fd.append('category', form.category);
      if (form.goal) fd.append('goal', form.goal);
      fd.append('date', form.date || new Date().toISOString());
      if (imageAsset) {
        const file = toMultipartFile(imageAsset, `donation-${Date.now()}.jpg`);
        if (file) fd.append('image', file);
      }
      if (teacher && qrImageAsset) {
        const qrFile = toMultipartFile(qrImageAsset, `donation-qr-${Date.now()}.jpg`);
        if (qrFile) fd.append('qr_image', qrFile);
      }

      if (editingId) {
        await donationService.updateDonation(editingId, fd);
      } else {
        await donationService.createDonation(fd);
      }

      setEditingId(null);
      setImageAsset(null);
      setQrImageAsset(null);
      setForm({
        amount: '',
        purpose: '',
        description: '',
        category: '',
        goal: '',
        date: '',
        qrImagePath: '',
        paymentNumber: '',
        paymentMethods: ''
      });
      await loadData();
    } catch (error) {
      Alert.alert('Donation failed', error?.response?.data?.message || error?.response?.data?.error || 'Unable to process donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const onPickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to upload donation image.');
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

  const onPickQrImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to upload QR image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (!result.canceled && result.assets?.length) {
      setQrImageAsset(result.assets[0]);
    }
  };

  const onEdit = (item) => {
    const { cleanDescription, meta } = extractDonationMeta(item.description || '');

    setEditingId(item.id);
    setForm({
      amount: String(item.amount || ''),
      purpose: item.purpose || '',
      description: cleanDescription,
      category: item.category || '',
      goal: item.goal ? String(item.goal) : '',
      date: item.date ? String(item.date).slice(0, 10) : '',
      qrImagePath: meta.qrImagePath || '',
      paymentNumber: meta.paymentNumber || '',
      paymentMethods: meta.paymentMethods || ''
    });
    setImageAsset(null);
    setQrImageAsset(null);
  };

  const onDelete = async (id) => {
    try {
      await donationService.deleteDonation(id);
      await loadData();
    } catch (error) {
      Alert.alert('Delete failed', error?.response?.data?.error || 'Unable to delete donation.');
    }
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Donations" subtitle="Support campaigns and causes across the alumni community." />

      {!teacher ? (
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Weekly Donation Limit</Text>
        <Text style={styles.bannerText}>
          {weeklyStatus ? `${weeklyStatus.remaining} remaining of ${weeklyStatus.weeklyLimit}` : 'Checking your weekly status...'}
        </Text>
      </View>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'Update Donation' : teacher ? 'Create Donation Campaign' : 'Make Donation'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="number-pad"
          value={form.amount}
          onChangeText={(v) => setForm((prev) => ({ ...prev, amount: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Purpose"
          value={form.purpose}
          onChangeText={(v) => setForm((prev) => ({ ...prev, purpose: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Category"
          value={form.category}
          onChangeText={(v) => setForm((prev) => ({ ...prev, category: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Goal"
          keyboardType="number-pad"
          value={form.goal}
          onChangeText={(v) => setForm((prev) => ({ ...prev, goal: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          value={form.date}
          onChangeText={(v) => setForm((prev) => ({ ...prev, date: v }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          multiline
          numberOfLines={4}
          value={form.description}
          onChangeText={(v) => setForm((prev) => ({ ...prev, description: v }))}
        />
        <Pressable style={styles.pickBtn} onPress={onPickImage}>
          <Text style={styles.pickText}>{imageAsset ? imageAsset.fileName || 'Image selected' : 'Choose Image'}</Text>
        </Pressable>
        {teacher ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Payment Number / Account"
              value={form.paymentNumber}
              onChangeText={(v) => setForm((prev) => ({ ...prev, paymentNumber: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Payment Methods (e.g., GCash / Bank Transfer)"
              value={form.paymentMethods}
              onChangeText={(v) => setForm((prev) => ({ ...prev, paymentMethods: v }))}
            />
            <Pressable style={styles.pickBtn} onPress={onPickQrImage}>
              <Text style={styles.pickText}>
                {qrImageAsset
                  ? qrImageAsset.fileName || 'QR image selected'
                  : form.qrImagePath
                    ? 'Current QR saved (tap to replace)'
                    : 'Choose QR Image'}
              </Text>
            </Pressable>
          </>
        ) : null}
        <PrimaryButton
          label={submitting ? 'Submitting...' : editingId ? 'Update Donation' : 'Submit Donation'}
          onPress={onSubmitDonation}
          disabled={submitting || (!teacher && weeklyStatus && !weeklyStatus.canDonate)}
        />
      </View>

      {loading ? <LoadingState label="Loading donations" /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No donations yet" /> : null}

      {!loading && items.map((item) => {
        const { cleanDescription } = extractDonationMeta(item.description || '');

        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.meta}>{item.purpose}</Text>
            <Text style={styles.meta}>{formatDate(item.date)}</Text>
            {cleanDescription ? <Text style={styles.desc}>{cleanDescription}</Text> : null}
            {item.image ? <Image source={{ uri: imageUrl(item.image, API_ORIGIN) }} style={styles.preview} /> : null}
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
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fef9c3',
    padding: 14
  },
  bannerTitle: {
    color: '#854d0e',
    fontWeight: '700'
  },
  bannerText: {
    marginTop: 4,
    color: '#92400e'
  },
  form: {
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
    padding: 14,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  amount: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 20
  },
  meta: {
    color: theme.colors.muted
  },
  desc: {
    color: '#1f2937',
    marginTop: 4
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
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
