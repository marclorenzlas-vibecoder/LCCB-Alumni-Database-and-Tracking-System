import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import BackButton from '../../components/BackButton';

export default function DonationReceiptScreen({ route, navigation }) {
  const { item } = route.params || {};

  if (!item) {
    return (
      <ScreenContainer>
        <BackButton navigation={navigation} label="Back" />
        <Text style={styles.empty}>Donation record not found.</Text>
      </ScreenContainer>
    );
  }

  const amount = item.amount ? `₱${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
  const date = item.date ? new Date(item.date).toLocaleDateString() : null;

  return (
    <ScreenContainer>
      <BackButton navigation={navigation} label="Back" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="heart" size={24} color="#dc2626" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{item.purpose || 'Donation'}</Text>
              {amount ? <Text style={styles.amount}>{amount}</Text> : null}
            </View>
          </View>

          {date ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.metaText}>{date}</Text>
            </View>
          ) : null}

          {item.donor_name ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color="#64748b" />
              <Text style={styles.metaText}>{item.donor_name}</Text>
            </View>
          ) : null}

          {item.message ? (
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>Message</Text>
              <Text style={styles.descText}>{item.message}</Text>
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
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  amount: { fontSize: 20, fontWeight: '800', color: '#16a34a', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 13, color: '#64748b' },
  descSection: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16, marginTop: 8 },
  descLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: 14, color: '#334155', lineHeight: 20 },
});
