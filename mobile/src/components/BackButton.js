import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { safeGoBack } from '../utils/safeGoBack';

/**
 * Reusable back-arrow button for detail screens.
 *
 * Props:
 *  - navigation: the React Navigation prop
 *  - label:      optional text next to the arrow (default "Back")
 */
export default function BackButton({ navigation, label = 'Back' }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      onPress={() => safeGoBack(navigation)}
    >
      <Ionicons name="arrow-back" size={18} color="#475569" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  btnPressed: {
    opacity: 0.5,
  },
  label: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
});
