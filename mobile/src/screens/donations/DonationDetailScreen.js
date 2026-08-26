import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import LoadingState from '../../components/LoadingState';
import { API_ORIGIN } from '../../config/api';
import { donationService } from '../../services/donationService';
import { extractDonationMeta } from '../../utils/donationMeta';
import { formatCurrency, formatDate, imageUrl } from '../../utils/formatters';

export default function DonationDetailScreen({ route, navigation }) {
  const { donationId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donation, setDonation] = useState(null);
  const [error, setError] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDonation = useCallback(async () => {
    if (!donationId) {
      setError('Donation not found');
      return;
    }

    try {
      setError('');
      const allDonations = await donationService.getAll();
      const found = allDonations.find(d => d.id === parseInt(donationId));
      
      if (!found) {
        setError('Donation campaign not found');
      } else {
        setDonation(found);
      }
    } catch (err) {
      console.error('Error loading donation:', err);
      setError('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  }, [donationId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      setError('');
      
      loadDonation().catch(err => {
        if (mounted) {
          console.error('Failed to load donation:', err);
          setError('Failed to load campaign');
        }
      }).finally(() => {
        if (mounted) setLoading(false);
      });

      return () => {
        mounted = false;
      };
    }, [loadDonation])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDonation();
    } finally {
      setRefreshing(false);
    }
  };

  const calculateProgress = (raised, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min((raised / goal) * 100, 100);
  };

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('amount', String(parseFloat(donationAmount)));
      payload.append('purpose', donation.purpose);
      payload.append('category', donation.category || 'General');
      payload.append('date', new Date().toISOString());

      await donationService.createDonation(payload);
      Alert.alert('Success', 'Thank you for your donation! Your contribution has been recorded.');
      setDonationAmount('');
    } catch (err) {
      Alert.alert('Donation Failed', err?.response?.data?.message || 'Unable to process donation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingState label="Loading campaign" />
      </ScreenContainer>
    );
  }

  if (error || !donation) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Campaign Not Found</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.errorBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorBackButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const progress = calculateProgress(donation.amount || 0, donation.goal || 0);
  const { cleanDescription, meta } = extractDonationMeta(donation.description || '');
  const paymentNumber = meta.paymentNumber || '0912-345-6789';
  const paymentMethods = meta.paymentMethods || 'GCash / PayMaya / Bank Transfer';
  const qrSource = meta.qrImagePath
    ? imageUrl(meta.qrImagePath, API_ORIGIN)
    : (meta.qrCodeUrl || null);

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Campaign Header */}
      {donation.image && (
        <Image
          source={{ uri: imageUrl(donation.image, API_ORIGIN) }}
          style={styles.campaignImage}
        />
      )}

      {/* Campaign Info */}
      <View style={styles.campaignCard}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{donation.category || 'Community'}</Text>
          </View>
          {donation.date && (
            <Text style={styles.dateText}>Ends {formatDate(donation.date)}</Text>
          )}
        </View>

        <Text style={styles.campaignTitle}>{donation.purpose}</Text>

        {cleanDescription && (
          <Text style={styles.campaignDesc}>{cleanDescription}</Text>
        )}
      </View>

      {qrSource ? (
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Campaign QR Code</Text>
          <Image source={{ uri: qrSource }} style={styles.qrImage} />
        </View>
      ) : null}

      {/* Progress Section */}
      {donation.goal && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Raised: {formatCurrency(donation.amount || 0)}</Text>
            <Text style={styles.progressLabel}>Goal: {formatCurrency(donation.goal || 0)}</Text>
          </View>
          
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]}
            />
          </View>

          <Text style={styles.progressPercent}>{Math.round(progress)}% Complete</Text>
        </View>
      )}

      {/* Donation Methods */}
      <View style={styles.methodsCard}>
        <Text style={styles.methodsTitle}>Direct Donation</Text>
        <Pressable
          style={[styles.quickDonateButton, submitting && styles.donateButtonDisabled]}
          onPress={handleDonate}
          disabled={submitting}
        >
          <Text style={styles.quickDonateButtonText}>{submitting ? 'Processing...' : 'Donate'}</Text>
        </Pressable>

        <View style={styles.paymentMethods}>
          <Text style={styles.paymentLabel}>Payment Methods:</Text>
          <View style={styles.methodItem}>
            <Ionicons name="phone-portrait-outline" size={18} color="#1e3a8a" />
            <Text style={styles.methodText}>{paymentNumber}</Text>
          </View>
          <View style={styles.methodItem}>
            <Ionicons name="wallet-outline" size={18} color="#1e3a8a" />
            <Text style={styles.methodText}>{paymentMethods}</Text>
          </View>
        </View>
      </View>

      {/* Donation Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Make a Donation</Text>

        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₱</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={donationAmount}
            onChangeText={setDonationAmount}
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <Pressable
          style={[styles.donateButton, submitting && styles.donateButtonDisabled]}
          onPress={handleDonate}
          disabled={submitting}
        >
          <Text style={styles.donateButtonText}>
            {submitting ? 'Processing...' : 'Confirm Donation'}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  campaignImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#1f2937',
    marginHorizontal: -18,
    marginTop: -18
  },
  campaignCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  categoryBadge: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 999
  },
  categoryText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600'
  },
  dateText: {
    color: '#64748b',
    fontSize: 12
  },
  campaignTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28
  },
  campaignDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e3a8a',
    borderRadius: 999
  },
  progressPercent: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'right'
  },
  methodsCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    gap: 16
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e1b4b'
  },
  quickDonateButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  quickDonateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  paymentMethods: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e7ff'
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e1b4b',
    marginBottom: 4
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  methodText: {
    fontSize: 12,
    color: '#3f3f46',
    flex: 1
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc'
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 4
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a'
  },
  donateButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4
  },
  donateButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6
  },
  donateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626'
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center'
  },
  errorBackButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  errorBackButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
