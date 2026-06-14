import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

export default function ScreenContainer({ children, scroll = true, refreshControl = null, noTopPadding = false }) {
  const insets = useSafeAreaInsets();
  const Wrapper = scroll ? ScrollView : View;

  return (
    <View style={[styles.safe, { paddingBottom: insets.bottom }]}>
      <Wrapper
        contentContainerStyle={scroll ? (noTopPadding ? styles.scrollContentNoTop : styles.scrollContent) : undefined}
        style={!scroll ? styles.fill : undefined}
        refreshControl={scroll ? refreshControl : undefined}
      >
        {children}
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  fill: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 16,
    paddingBottom: theme.spacing.lg
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 16,
    paddingBottom: 0,
    gap: 24
  },
  scrollContentNoTop: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 24
  }
});
