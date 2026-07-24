import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import SectionHeader from '../../components/SectionHeader';
import { API_ORIGIN } from '../../config/api';
import { donationService } from '../../services/donationService';
import { isTeacher } from '../../utils/auth';
import { extractDonationMeta } from '../../utils/donationMeta';
import { formatCurrency, formatDate, imageUrl } from '../../utils/formatters';

export default function DonationsScreen({ navigation, user }) {
  const teacher = isTeacher(user);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDonations = useCallback(async () => {
    try {
      const data = await donationService.getAll();
      setDonations(data || []);
    } catch (err) {
      console.error('Error loading donations:', err);
      Alert.alert('Error', 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      
      loadDonations().catch(err => {
        if (mounted) console.error('Failed to load donations:', err);
      }).finally(() => {
        if (mounted) setLoading(false);
      });

      return () => {
        mounted = false;
      };
    }, [loadDonations])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDonations();
    } finally {
      setRefreshing(false);
    }
  };

  const onShare = async (item) => {
    const { cleanDescription } = extractDonationMeta(item.description || '');
    const donateBase = API_ORIGIN.replace(':5001', ':3002');
    const donateUrl = `${donateBase}/donate/${item.id}`;
    try {
      await Share.share({
        title: item.purpose || 'Donation Campaign',
        message: `${item.purpose || 'Donation Campaign'}\n\n${cleanDescription || ''}\n\nGoal: ${formatCurrency(item.goal || 0)}\nRaised: ${formatCurrency(item.amount || 0)}\n\n${donateUrl}`
      });
    } catch (error) {
      console.error('Failed to share donation:', error?.message || error);
    }
  };

  const renderDonationCard = ({ item }) => {
    const progressValue = item.goal ? Math.round(Math.min((item.amount || 0) / item.goal * 100, 100)) : 0;
    const { cleanDescription } = extractDonationMeta(item.description || '');

    return (
      <View style={styles.card}>
        <Pressable onPress={() => navigation.navigate('DonationDetail', { donationId: item.id })}>
          {item.image && (
            <Image
              source={{ uri: imageUrl(item.image, API_ORIGIN) }}
              style={styles.cardImage}
            />
          )}

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category || 'Community'}</Text>
              </View>
              {item.date && (
                <Text style={styles.dateText}>Ends {formatDate(item.date)}</Text>
              )}
            </View>

            <Text style={styles.cardTitle}>{item.purpose}</Text>

            {cleanDescription ? (
              <Text style={styles.cardDescription} numberOfLines={5}>
                {cleanDescription}
              </Text>
            ) : null}

            {item.goal ? (
              <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Raised: {formatCurrency(item.amount || 0)}</Text>
                  <Text style={styles.progressLabel}>Goal: {formatCurrency(item.goal)}</Text>
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressValue}%` }]} />
                </View>

                <Text style={styles.progressPercent}>{progressValue}% Complete</Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.donateActionWrap}>
          {teacher ? (
            <Pressable style={styles.donateBtn} onPress={() => navigation.navigate('AdminCampaignReceipts', { donationId: item.id })}>
              <Text style={styles.donateBtnText}>View Receipts</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.donateBtn} onPress={() => navigation.navigate('DonationDetail', { donationId: item.id })}>
              <Text style={styles.donateBtnText}>Donate</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.shareBtn} onPress={() => onShare(item)}>
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <SectionHeader 
        title="Support Our Causes" 
        subtitle="Join us in making a difference through your generous contributions"
      />

      {loading ? (
        <LoadingState label="Loading donations" />
      ) : donations.length === 0 ? (
        <EmptyState title="No donation campaigns yet" />
      ) : (
        <FlatList
          data={donations}
          renderItem={renderDonationCard}
          keyExtractor={(item) => `donation-${item.id}`}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#0f172a'
  },
  cardContent: {
    padding: 14,
    flex: 1,
    gap: 10
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 999
  },
  categoryText: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '600'
  },
  dateText: {
    color: '#64748b',
    fontSize: 11
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22
  },
  cardDescription: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18
  },
  progressSection: {
    gap: 6
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e3a8a'
  },
  progressPercent: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'right'
  },
  donateActionWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12
  },
  donateBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb'
  },
  donateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  actionsRow: {
    paddingHorizontal: 14,
    paddingBottom: 12
  },
  shareBtn: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  shareText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700'
  }
});
