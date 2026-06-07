import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.muted
  }
});
