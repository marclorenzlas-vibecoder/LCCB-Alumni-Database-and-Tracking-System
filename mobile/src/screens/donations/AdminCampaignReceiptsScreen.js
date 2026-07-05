import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import LoadingState from '../../components/LoadingState';
import BackButton from '../../components/BackButton';
import { donationService } from '../../services/donationService';
import { API_ORIGIN } from '../../config/api';
import { formatCurrency, imageUrl } from '../../utils/formatters';

function MetricCard({ icon, label, value, tone = 'blue' }) {
  const iconStyle = tone === 'amber' ? styles.metricIconAmber : styles.metricIconBlue;
  const valueStyle = tone === 'amber' ? styles.metricValueAmber : styles.metricValueBlue;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, iconStyle]}>
        <Ionicons name={icon} size={18} color={tone === 'amber' ? '#b45309' : '#1d4ed8'} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={[styles.metricValue, valueStyle]} numberOfLines={1}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ContributionRow({ entry, activeTab }) {
  const donorName = entry.donorName || 'Anonymous Donor';
  const avatarUrl = imageUrl(entry.profileImage, API_ORIGIN);
  const dateLabel = entry.recordedAt
    ? new Date(entry.recordedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : 'Date unavailable';
  const openReceipt = () => {
    const lines = activeTab === 'money'
      ? [
          `Donor: ${donorName}`,
          `Amount: ${entry.amountLabel || formatCurrency(entry.amount || 0)}`,
          `Date: ${dateLabel}`
        ]
      : [
          `Donor: ${donorName}`,
          `Item: ${entry.itemName || 'Item Donation'}`,
          entry.itemDescription ? `Description: ${entry.itemDescription}` : null,
          `Date: ${dateLabel}`
        ];
    Alert.alert('Donation Receipt', lines.filter(Boolean).join('\n'));
  };

  return (
    <Pressable style={styles.contributionCard} onPress={openReceipt}>
      <View style={styles.contributionAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{donorName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.contributionInfo}>
        <Text style={styles.donorName} numberOfLines={1}>{donorName}</Text>
        {activeTab === 'items' && entry.itemName ? (
          <Text style={styles.itemDetail} numberOfLines={1}>
            {entry.itemName}{entry.itemDescription ? ` - ${entry.itemDescription}` : ''}
          </Text>
        ) : null}
        <Text style={styles.recordedDate}>{dateLabel}</Text>
      </View>

      <View style={styles.contributionAmount}>
        {activeTab === 'money' ? (
          <Text style={styles.amountText}>{entry.amountLabel || formatCurrency(entry.amount || 0)}</Text>
        ) : (
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>Item</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </View>
    </Pressable>
  );
}

function AdminCampaignReceiptsScreen({ route, navigation, user }) {
  const { donationId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [money, setMoney] = useState([]);
  const [items, setItems] = useState([]);
  const [totalMoney, setTotalMoney] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState('money');
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [contributions, receiptStatus] = await Promise.all([
        donationService.getContributions(donationId),
        donationService.getReceiptStatus(donationId).catch(() => ({ submitted: false }))
      ]);
      setCampaign(contributions.campaign);
      setMoney(contributions.money || []);
      setItems(contributions.items || []);
      setTotalMoney(contributions.totalMoney || 0);
      setTotalItems(contributions.totalItems || 0);
      setReceiptSubmitted(receiptStatus.submitted || false);
    } catch (err) {
      console.error('Error loading contributions:', err);
      Alert.alert('Error', 'Failed to load campaign receipts');
    } finally {
      setLoading(false);
    }
  }, [donationId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleSubmitReceipt = async () => {
    try {
      setSubmittingReceipt(true);
      await donationService.submitReceipt(donationId, {
        notes: `Receipt submitted by ${user?.username || 'Admin'}`
      });
      setReceiptSubmitted(true);
      Alert.alert('Success', 'Receipt submitted successfully');
    } catch (err) {
      console.error('Error submitting receipt:', err);
      Alert.alert('Error', 'Failed to submit receipt');
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return <LoadingState message="Loading campaign receipts..." />;
  }

  if (!campaign) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Campaign Not Found</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back to Donations</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const currentList = activeTab === 'money' ? money : items;
  const progress = campaign.goal ? Math.min((Number(campaign.amount || 0) / Number(campaign.goal || 1)) * 100, 100) : 0;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <BackButton navigation={navigation} label="Back" />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Campaign Receipts</Text>
          <Text style={styles.headerSubtitle}>Review donor transactions and item contributions.</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.campaignCard}>
          <View style={styles.campaignLeft}>
            {campaign.image ? (
              <Image source={{ uri: imageUrl(campaign.image, API_ORIGIN) }} style={styles.campaignImage} />
            ) : (
              <View style={[styles.campaignImage, styles.campaignImageFallback]}>
                <Ionicons name="heart-outline" size={24} color="#1d4ed8" />
              </View>
            )}
            <View style={styles.campaignTitleBlock}>
              <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.purpose}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{campaign.category || 'General'}</Text>
              </View>
            </View>
            {receiptSubmitted && (
              <View style={styles.receiptBadge}>
                <Text style={styles.receiptBadgeText}>Receipt Submitted</Text>
              </View>
            )}
          </View>

          {campaign.goal ? (
            <View style={styles.progressPanel}>
              <View style={styles.progressLabels}>
                <View>
                  <Text style={styles.progressEyebrow}>Raised</Text>
                  <Text style={styles.progressValue}>{formatAmount(campaign.amount)}</Text>
                </View>
                <View style={styles.progressGoal}>
                  <Text style={styles.progressEyebrow}>Goal</Text>
                  <Text style={styles.progressValue}>{formatAmount(campaign.goal)}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{Math.round(progress)}% Complete</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metricGrid}>
          <MetricCard icon="wallet-outline" label="Total Money Raised" value={formatAmount(totalMoney)} />
          <MetricCard icon="cube-outline" label="Items Donated" value={String(totalItems)} tone="amber" />
        </View>

        <View style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <View>
              <Text style={styles.recordsTitle}>Donation Records</Text>
              <Text style={styles.recordsSubtitle}>Money and item contributions.</Text>
            </View>
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, activeTab === 'money' && styles.tabActive]}
                onPress={() => setActiveTab('money')}
              >
                <Text style={[styles.tabText, activeTab === 'money' && styles.tabTextActive]}>
                  Money ({money.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'items' && styles.tabActive]}
                onPress={() => setActiveTab('items')}
              >
                <Text style={[styles.tabText, activeTab === 'items' && styles.tabTextActive]}>
                  Items ({items.length})
                </Text>
              </Pressable>
            </View>
          </View>

          {currentList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={28} color="#94a3b8" />
              <Text style={styles.emptyText}>
                No {activeTab === 'money' ? 'monetary' : 'item'} donations yet.
              </Text>
            </View>
          ) : (
            <View style={styles.listStack}>
              {currentList.map((entry, index) => (
                <ContributionRow key={`${activeTab}-${entry.id || index}`} entry={entry} activeTab={activeTab} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtnSecondary} onPress={() => navigation.goBack()}>
            <Text style={styles.actionBtnSecondaryText}>Back to Donation</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBtnPrimary,
              (submittingReceipt || receiptSubmitted) && styles.actionBtnDisabled
            ]}
            onPress={handleSubmitReceipt}
            disabled={submittingReceipt || receiptSubmitted}
          >
            <Text style={styles.actionBtnPrimaryText}>
              {receiptSubmitted ? 'Receipt Submitted' : submittingReceipt ? 'Submitting...' : 'Submit Receipt'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10
  },
  headerCopy: {
    marginTop: 8
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    padding: 14,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2
  },
  campaignLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  campaignImage: {
    width: 84,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#eff6ff'
  },
  campaignImageFallback: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  campaignTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  campaignTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#f1f5f9'
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569'
  },
  receiptBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#dcfce7'
  },
  receiptBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  progressPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8
  },
  progressGoal: {
    alignItems: 'flex-end'
  },
  progressEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2
  },
  progressBar: {
    height: 7,
    backgroundColor: '#dbe3f0',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1d4ed8',
    borderRadius: 999
  },
  progressPercent: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 6
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#ffffff',
    padding: 12
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricIconBlue: {
    backgroundColor: '#dbeafe'
  },
  metricIconAmber: {
    backgroundColor: '#fef3c7'
  },
  metricCopy: {
    flex: 1,
    minWidth: 0
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900'
  },
  metricValueBlue: {
    color: '#1e3a8a'
  },
  metricValueAmber: {
    color: '#b45309'
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2
  },
  recordsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#fff',
    padding: 12,
    gap: 12
  },
  recordsHeader: {
    gap: 12
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  recordsSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 3,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: '#1e3a8a'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569'
  },
  tabTextActive: {
    color: '#fff'
  },
  listStack: {
    gap: 8
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 24,
    alignItems: 'center',
    gap: 8
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center'
  },
  contributionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12
  },
  contributionAvatar: {
    marginRight: 12
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e3a8a'
  },
  contributionInfo: {
    flex: 1,
    minWidth: 0
  },
  donorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  itemDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2
  },
  recordedDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3
  },
  contributionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 10
  },
  amountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a'
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fef3c7'
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309'
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  actionBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569'
  },
  actionBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    alignItems: 'center'
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff'
  },
  actionBtnDisabled: {
    opacity: 0.5
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e3a8a'
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});

export default AdminCampaignReceiptsScreen;
