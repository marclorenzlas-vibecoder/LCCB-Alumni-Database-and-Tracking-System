import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import SectionHeader from '../../components/SectionHeader';
import { theme } from '../../theme';

const modules = [
  { key: 'AlumniDirectory', title: 'Alumni Directory', subtitle: 'Search and discover fellow alumni' },
  { key: 'Achievements', title: 'Achievements', subtitle: 'See milestones and recognitions' },
  { key: 'Careers', title: 'Career Journey', subtitle: 'Track and add career entries' },
  { key: 'Donations', title: 'Donations', subtitle: 'Contribute and review donation history' },
  { key: 'Notifications', title: 'Notifications', subtitle: 'Read and manage alerts' }
];

export default function CommunityHubScreen({ navigation }) {
  return (
    <ScreenContainer>
      <SectionHeader title="Community Modules" subtitle="All alumni system modules are connected here." />

      <View style={styles.grid}>
        {modules.map((item) => (
          <Pressable key={item.key} style={styles.card} onPress={() => navigation.navigate(item.key)}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.muted
  }
});
