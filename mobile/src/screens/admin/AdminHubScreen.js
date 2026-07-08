import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import SectionHeader from '../../components/SectionHeader';
import { theme } from '../../theme';

const cards = [
  {
    key: 'JobManagement',
    title: 'Job Posting Management',
    description: 'Create, edit, and remove external job directory postings.'
  },
  {
    key: 'PendingApprovals',
    title: 'Pending Approvals',
    description: 'Review alumni registrations and approve or reject with reason.'
  },
  {
    key: 'OfficerManagement',
    title: 'Officer Management',
    description: 'Assign and update batch officers using existing backend rules.'
  }
];

export default function AdminHubScreen({ navigation }) {
  return (
    <ScreenContainer>
      <SectionHeader title="Teacher/Admin Controls" subtitle="Mobile management modules copied from web workflows." />

      <View style={styles.grid}>
        {cards.map((card) => (
          <Pressable key={card.key} style={styles.card} onPress={() => navigation.navigate(card.key)}>
            <Text style={styles.title}>{card.title}</Text>
            <Text style={styles.desc}>{card.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4f0',
    backgroundColor: '#fff',
    padding: 16
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text
  },
  desc: {
    marginTop: 8,
    color: theme.colors.muted
  }
});
