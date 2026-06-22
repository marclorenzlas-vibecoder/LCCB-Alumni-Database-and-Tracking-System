import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../../components/BackButton';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { authService } from '../../services/authService';

export default function ChangePasswordScreen({ navigation, user }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setPasswordField = (key, value) => setPasswordForm((prev) => ({ ...prev, [key]: value }));

  const onUpdatePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Missing fields', 'Please fill out all password fields.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Password mismatch', 'New password and confirm password do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Too short', 'New password must be at least 6 characters.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authService.changePassword(user.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        email: user?.email || ''
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Updated', 'Password changed successfully.');
    } catch (error) {
      Alert.alert('Unable to update', error?.response?.data?.error || 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const renderField = (label, key, isShow, setIsShow, placeholder) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputIcon}>
          <Ionicons name="key-outline" size={16} color="#94a3b8" />
        </View>
        <TextInput
          style={styles.input}
          secureTextEntry={!isShow}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={passwordForm[key]}
          onChangeText={(v) => setPasswordField(key, v)}
        />
        <Pressable onPress={() => setIsShow(!isShow)} style={styles.eyeBtn}>
          <Ionicons name={isShow ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <BackButton navigation={navigation} label="Back" />
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Change Password</Text>
        <Text style={styles.heroSubtitle}>
          Keep your account secure by updating your password regularly.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Password Details</Text>
        <View style={styles.sectionDivider} />

        {renderField('Current Password', 'currentPassword', showCurrent, setShowCurrent, 'Enter current password')}
        {renderField('New Password', 'newPassword', showNew, setShowNew, 'Enter new password')}
        {renderField('Confirm New Password', 'confirmPassword', showConfirm, setShowConfirm, 'Confirm new password')}

        <View style={styles.requirements}>
          <Text style={styles.reqTitle}>Password Requirements</Text>
          <View style={styles.reqRow}>
            <Ionicons
              name={passwordForm.newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={passwordForm.newPassword.length >= 6 ? '#22c55e' : '#94a3b8'}
            />
            <Text style={styles.reqText}>At least 6 characters</Text>
          </View>
          <View style={styles.reqRow}>
            <Ionicons
              name={passwordForm.newPassword && passwordForm.newPassword !== passwordForm.currentPassword ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={passwordForm.newPassword && passwordForm.newPassword !== passwordForm.currentPassword ? '#22c55e' : '#94a3b8'}
            />
            <Text style={styles.reqText}>Different from current password</Text>
          </View>
          <View style={styles.reqRow}>
            <Ionicons
              name={passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword ? '#22c55e' : '#94a3b8'}
            />
            <Text style={styles.reqText}>Passwords match</Text>
          </View>
        </View>

        <PrimaryButton
          label={updatingPassword ? 'Updating...' : 'Update Password'}
          onPress={onUpdatePassword}
          disabled={updatingPassword}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 6
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 4
  },
  fieldGroup: {
    gap: 6
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    overflow: 'hidden'
  },
  inputIcon: {
    paddingLeft: 12,
    paddingRight: 4
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#0f172a'
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  requirements: {
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 6
  },
  reqTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  reqText: {
    fontSize: 13,
    color: '#64748b'
  }
});