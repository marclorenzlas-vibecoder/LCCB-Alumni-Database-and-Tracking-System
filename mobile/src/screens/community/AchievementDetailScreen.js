import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_ORIGIN } from '../../config/api';
import { communityService } from '../../services/communityService';
import { imageUrl } from '../../utils/formatters';
import ScreenContainer from '../../components/ScreenContainer';
import BackButton from '../../components/BackButton';
import { theme } from '../../theme';

export default function AchievementDetailScreen({ user }) {
  const route = useRoute();
  const navigation = useNavigation();
  const { achievement } = route.params;
  const [item, setItem] = useState(achievement);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (achievement && achievement.id) {
      setLoading(true);
      communityService.getAchievementById(achievement.id)
        .then((data) => {
          if (data) setItem(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [achievement]);

  const getAvatarFallback = (alumni) => {
    const name = `${alumni?.first_name || ''} ${alumni?.last_name || ''}`.trim() || 'User';
    const colors = ['007bff', '6f42c1', 'e83e8c', 'fd7e14', '28a745', '17a2b8', '6610f2', '20c997'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const color = colors[Math.abs(hash) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&rounded=true&size=128`;
  };

  const getProfileImageSrc = (alumni) => {
    const img = alumni?.profile_image || alumni?.profileImage;
    if (!img) return getAvatarFallback(alumni);
    return img.startsWith('/') ? `${API_ORIGIN}${img}` : img;
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <BackButton navigation={navigation} label="Back" />
        {item.image ? (
          /\.(mp4|mov|avi|mkv|webm)$/i.test(item.image) ? (
            <Video
              source={{ uri: imageUrl(item.image, API_ORIGIN) }}
              style={styles.heroImage}
              useNativeControls
              resizeMode="cover"
              shouldPlay={false}
            />
          ) : (
            <Image
              source={{ uri: imageUrl(item.image, API_ORIGIN) }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )
        ) : (
          <View style={[styles.heroImage, { backgroundColor: '#e2e8f0' }]} />
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.category}>{item.category || 'General'}</Text>
            <Text style={styles.year}>{item.date ? new Date(item.date).getFullYear() : 'N/A'}</Text>
          </View>

          <Text style={styles.title}>{item.title || 'Achievement'}</Text>

          {item.alumni && (
            <View style={styles.alumniRow}>
              <Image
                source={{ uri: getProfileImageSrc(item.alumni) }}
                style={styles.avatar}
              />
              <Text style={styles.alumniName}>
                {`${item.alumni.first_name || ''} ${item.alumni.last_name || ''}`.trim()}
              </Text>
            </View>
          )}

          <Text style={styles.description}>{item.description || 'No description provided'}</Text>

          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'}</Text>
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 30,
  },
  heroImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  year: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  alumniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  alumniName: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    color: '#0f172a',
    fontSize: 13,
  },
});