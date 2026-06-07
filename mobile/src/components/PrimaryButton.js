import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export default function PrimaryButton({ label, onPress, disabled = false, tone = 'primary' }) {
  const backgroundColor = tone === 'danger' ? theme.colors.danger : theme.colors.primary;

  return (
    <Pressable style={[styles.button, { backgroundColor }, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  label: {
    color: '#fff',
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.65
  }
});
