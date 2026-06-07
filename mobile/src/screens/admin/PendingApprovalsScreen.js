import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/formatters';
import { theme } from '../../theme';

export default function PendingApprovalsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState({});

  const loadPending = useCallback(async () => {
    const data = await adminService.getPendingRegistrations();
    setItems(data || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadPending()
        .catch((error) => console.error('Failed to load pending registrations:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [loadPending])
  );

  const verify = async (studentId) => {
    try {
      const result = await adminService.verifyStudentId(studentId);
      Alert.alert('School ID Verification', result?.verified ? 'Student ID found in alumni records.' : 'Student ID not found in alumni records.');
    } catch (error) {
      Alert.alert('Verification failed', error?.response?.data?.error || 'Unable to verify student ID.');
    }
  };

  const approve = async (id) => {
    try {
      await adminService.approveRegistration(id);
      await loadPending();
    } catch (error) {
      Alert.alert('Approve failed', error?.response?.data?.error || 'Unable to approve.');
    }
  };

  const reject = async (id) => {
    const reason = reasons[id] || '';
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please enter a rejection reason.');
      return;
    }

    try {
      await adminService.rejectRegistration(id, reason.trim());
      await loadPending();
    } catch (error) {
      Alert.alert('Reject failed', error?.response?.data?.error || 'Unable to reject.');
    }
  };

  return (
    <ScreenContainer>
      {loading ? <LoadingState label="Loading pending approvals" /> : null}
      {!loading && items.length === 0 ? <EmptyState title="No pending approvals" /> : null}

      {!loading && items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.meta}>Email: {item.email}</Text>
          <Text style={styles.meta}>School ID: {item.student_id || '-'}</Text>
          <Text style={styles.meta}>Contact: {item.contact_number || '-'}</Text>
          <Text style={styles.meta}>Level/Course: {item.level || '-'} / {item.course || '-'}</Text>
          <Text style={styles.meta}>Batch/Year: {item.batch || '-'} / {item.graduation_year || '-'}</Text>
          <Text style={styles.meta}>Submitted: {formatDate(item.created_at)}</Text>

          <Pressable style={styles.verifyBtn} onPress={() => verify(item.student_id)}>
            <Text style={styles.verifyText}>Verify School ID</Text>
          </Pressable>

          <TextInput
            style={styles.reasonInput}
            placeholder="Rejection reason"
            value={reasons[item.id] || ''}
            onChangeText={(value) => setReasons((prev) => ({ ...prev, [item.id]: value }))}
          />

          <View style={styles.actions}>
            <Pressable style={styles.approveBtn} onPress={() => approve(item.id)}>
              <Text style={styles.approveText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.rejectBtn} onPress={() => reject(item.id)}>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    color: theme.colors.text,
    fontSize: 16
  },
  meta: {
    color: theme.colors.muted
  },
  verifyBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    paddingVertical: 8,
    alignItems: 'center'
  },
  verifyText: {
    color: '#5b21b6',
    fontWeight: '700'
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10
  },
  approveBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    paddingVertical: 10,
    alignItems: 'center'
  },
  approveText: {
    color: '#166534',
    fontWeight: '700'
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    paddingVertical: 10,
    alignItems: 'center'
  },
  rejectText: {
    color: '#b91c1c',
    fontWeight: '700'
  }
});
