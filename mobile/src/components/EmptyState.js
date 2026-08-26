import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function EmptyState({ title = 'No data yet', description = 'Please check again later.' }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700'
  },
  description: {
    marginTop: 6,
    color: theme.colors.muted
  }
});
