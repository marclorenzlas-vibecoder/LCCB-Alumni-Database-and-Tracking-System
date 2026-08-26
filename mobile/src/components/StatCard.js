import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function StatCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: 14
  },
  label: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 6
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text
  }
});
