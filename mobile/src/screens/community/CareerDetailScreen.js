import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import BackButton from '../../components/BackButton';

const getAlignmentLabel = (value) => {
  if (value === 'ALIGNED') return 'Related';
  if (value === 'NOT_ALIGNED') return 'Not Related';
  return 'Needs Checking';
};

const getAlignmentStyle = (value) => {
  if (value === 'ALIGNED') return styles.alignmentAligned;
  if (value === 'NOT_ALIGNED') return styles.alignmentNotAligned;
  return styles.alignmentReview;
};

export default function CareerDetailScreen({ route, navigation }) {
  const { item } = route.params || {};

  if (!item) {
    return (
      <ScreenContainer>
        <BackButton navigation={navigation} label="Back" />
        <Text style={styles.empty}>Career record not found.</Text>
      </ScreenContainer>
    );
  }

  const dateRange = `${item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A'} – ${item.is_current ? 'Present' : item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}`;

  return (
    <ScreenContainer>
      <BackButton navigation={navigation} label="Back" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="briefcase" size={24} color="#1d4ed8" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{item.job_title || 'Position'}</Text>
              <Text style={styles.company}>{item.company || 'Company not set'}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{dateRange}</Text>
          </View>

          <View style={styles.alignmentSection}>
            <Text style={[styles.alignmentBadge, getAlignmentStyle(item.program_alignment)]}>
              {getAlignmentLabel(item.program_alignment)}
            </Text>
            {item.alignment_notes ? <Text style={styles.alignmentNotes}>{item.alignment_notes}</Text> : null}
          </View>

          {item.description ? (
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>Description</Text>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  company: { fontSize: 14, color: '#475569' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  metaText: { fontSize: 13, color: '#64748b' },
  alignmentSection: { marginBottom: 16, gap: 8, alignItems: 'flex-start' },
  alignmentBadge: { borderRadius: 999, borderWidth: 1, fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  alignmentAligned: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' },
  alignmentNotAligned: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c' },
  alignmentReview: { backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#b45309' },
  alignmentNotes: { color: '#64748b', fontSize: 13, lineHeight: 18 },
  descSection: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  descLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: 14, color: '#334155', lineHeight: 20 },
});
