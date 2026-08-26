import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { eventService } from '../../services/eventService';
import { getAlumniId, isAlumni, isTeacher } from '../../utils/auth';
import { formatDate, imageUrl } from '../../utils/formatters';
import { toMultipartFile } from '../../utils/upload';
import { theme } from '../../theme';

export default function EventDetailScreen({ route, user }) {
  const { eventId } = route.params;
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const alumniUser = useMemo(() => isAlumni(user), [user]);
  const teacherUser = useMemo(() => isTeacher(user), [user]);
  const currentUserId = useMemo(() => Number(user?.id || user?.userId || user?.user_id || 0), [user]);

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isAttending, setIsAttending] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDetails = async () => {
    const [eventData, attendeeData, galleryData] = await Promise.all([
      eventService.getById(eventId),
      eventService.getAttendees(eventId),
      eventService.getGallery(eventId)
    ]);

    setEvent(eventData);
    setAttendees(attendeeData || []);
    setGallery(galleryData || []);

    if (alumniId) {
      const attendance = await eventService.checkAttendance(eventId, alumniId);
      setIsAttending(!!attendance?.isAttending);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadDetails()
      .catch((error) => console.error('Failed to load event detail:', error?.message || error))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [eventId, alumniId]);

  const onJoinLeave = async () => {
    if (!alumniId) {
      Alert.alert('No alumni profile', 'Your account has no alumni record yet.');
      return;
    }

    setSubmitting(true);
    try {
      if (isAttending) {
        await eventService.leave(eventId, alumniId);
      } else {
        await eventService.join(eventId, alumniId);
      }
      await loadDetails();
    } catch (error) {
      Alert.alert('Action failed', error?.response?.data?.error || 'Unable to update attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const onUploadGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access to upload gallery images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      result.assets.forEach((asset, index) => {
        const file = toMultipartFile(asset, `gallery-${Date.now()}-${index}.jpg`);
        if (file) formData.append('images', file);
      });

      await eventService.uploadGalleryPhotos(eventId, formData);
      await loadDetails();
      Alert.alert('Uploaded', 'Gallery photos uploaded successfully.');
    } catch (error) {
      Alert.alert('Upload failed', error?.response?.data?.error || 'Unable to upload photos.');
    } finally {
      setUploading(false);
    }
  };

  const onDeleteGalleryPhoto = async (photoId) => {
    try {
      await eventService.deleteGalleryPhoto(eventId, photoId);
      await loadDetails();
    } catch (error) {
      Alert.alert('Delete failed', error?.response?.data?.error || 'Unable to delete photo.');
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading event" />
      </ScreenContainer>
    );
  }

  if (!event) {
    return (
      <ScreenContainer>
        <EmptyState title="Event not found" />
      </ScreenContainer>
    );
  }

  const heroImage = imageUrl(event.image, API_ORIGIN);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event.date ? new Date(event.date) : null;
  if (eventDate) eventDate.setHours(0, 0, 0, 0);
  const isPreviousEvent = event.status === 'PREVIOUS' || (eventDate && eventDate < today);
  const canUploadGallery = isPreviousEvent && (alumniUser || teacherUser);

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        {heroImage ? <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" /> : null}
        <Text style={styles.name}>{event.name}</Text>
        <Text style={styles.meta}>{formatDate(event.date)} • {event.location || 'TBA'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About this event</Text>
        <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
      </View>

      {!isPreviousEvent ? (
        <PrimaryButton
          label={isAttending ? 'Leave Event' : 'Join Event'}
          onPress={onJoinLeave}
          disabled={submitting}
          tone={isAttending ? 'danger' : 'primary'}
        />
      ) : (
        <View style={styles.completedCard}>
          <Text style={styles.completedLabel}>Event completed</Text>
          <Text style={styles.completedText}>Join is no longer available for previous events.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Attendees ({attendees.length})</Text>
        {attendees.length === 0 ? (
          <Text style={styles.description}>No attendees yet.</Text>
        ) : (
          attendees.slice(0, 8).map((entry) => (
            <Pressable key={entry.id} style={styles.attendee}>
              <Text style={styles.attendeeName}>{entry.alumni?.first_name} {entry.alumni?.last_name}</Text>
              <Text style={styles.attendeeMeta}>{entry.alumni?.course || 'Course not set'}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.galleryHeader}>
          <Text style={styles.sectionTitle}>Event Gallery ({gallery.length})</Text>
          {canUploadGallery ? (
            <Pressable style={styles.uploadBtn} onPress={onUploadGallery} disabled={uploading}>
              <Text style={styles.uploadText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
            </Pressable>
          ) : null}
        </View>

        {gallery.length === 0 ? (
          <Text style={styles.description}>No gallery photos yet.</Text>
        ) : (
          gallery.map((photo) => {
            const photoUrl = imageUrl(photo.image, API_ORIGIN);
            const ownerId = Number(photo.uploaded_by || photo.user?.id || 0);
            const canDeletePhoto = teacherUser || (alumniUser && currentUserId > 0 && ownerId === currentUserId);
            return (
              <View key={photo.id} style={styles.galleryItem}>
                {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.galleryImage} /> : null}
                <View style={styles.galleryMeta}>
                  <Text style={styles.attendeeMeta}>Uploaded: {formatDate(photo.created_at)}</Text>
                  {canDeletePhoto ? (
                    <Pressable style={styles.deletePhotoBtn} onPress={() => onDeleteGalleryPhoto(photo.id)}>
                      <Text style={styles.deletePhotoText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1d4ed8'
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff'
  },
  meta: {
    marginTop: 8,
    color: '#dbeafe'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    padding: 14
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8
  },
  description: {
    color: '#1f2937'
  },
  attendee: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7'
  },
  attendeeName: {
    color: theme.colors.text,
    fontWeight: '600'
  },
  attendeeMeta: {
    color: theme.colors.muted,
    marginTop: 2
  },
  completedCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    padding: 14,
    gap: 4
  },
  completedLabel: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 14
  },
  completedText: {
    color: '#475569',
    fontSize: 12
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  uploadBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#dcfce7'
  },
  uploadText: {
    color: '#166534',
    fontWeight: '700'
  },
  galleryItem: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingTop: 10,
    marginTop: 8
  },
  galleryImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#f1f5f9'
  },
  galleryMeta: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  deletePhotoBtn: {
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  deletePhotoText: {
    color: '#b91c1c',
    fontWeight: '700'
  }
});
