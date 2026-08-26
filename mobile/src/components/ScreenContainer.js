import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export default function ScreenContainer({ children, scroll = true, refreshControl = null }) {
  const Wrapper = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safe}>
      <Wrapper
        contentContainerStyle={scroll ? styles.scrollContent : undefined}
        style={!scroll ? styles.fill : undefined}
        refreshControl={scroll ? refreshControl : undefined}
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  fill: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 40,
    gap: 24
  }
});
