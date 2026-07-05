import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import EmptyState from "../../components/EmptyState";
import BackButton from "../../components/BackButton";
import LoadingState from "../../components/LoadingState";
import PrimaryButton from "../../components/PrimaryButton";
import ScreenContainer from "../../components/ScreenContainer";
import { API_ORIGIN } from "../../config/api";
import { eventService } from "../../services/eventService";
import { getAlumniId, isAlumni, isTeacher } from "../../utils/auth";
import { formatDate, fullName, imageUrl } from "../../utils/formatters";
import { toMultipartFile } from "../../utils/upload";
import { theme } from "../../theme";

export default function EventDetailScreen({ navigation, route, user }) {
  const { eventId } = route.params;
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const alumniUser = useMemo(() => isAlumni(user), [user]);
  const teacherUser = useMemo(() => isTeacher(user), [user]);
  const userBatch = useMemo(() => (
    user?.alumni?.batch === undefined || user?.alumni?.batch === null
      ? null
      : String(user.alumni.batch)
  ), [user]);
  const currentUserId = useMemo(
    () => Number(user?.id || user?.userId || user?.user_id || 0),
    [user],
  );

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isAttending, setIsAttending] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const loadDetails = useCallback(async () => {
    const [eventData, attendeeData, galleryData] = await Promise.all([
      eventService.getById(eventId),
      eventService.getAttendees(eventId),
      eventService.getGallery(eventId),
    ]);

    setEvent(eventData);
    setAttendees(attendeeData || []);
    setGallery(galleryData || []);

    if (alumniId) {
      const attendance = await eventService.checkAttendance(eventId, alumniId);
      setIsAttending(!!attendance?.isAttending);
    }
  }, [alumniId, eventId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadDetails()
      .catch((error) =>
        console.error("Failed to load event detail:", error?.message || error),
      )
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [loadDetails]);

  const onJoinLeave = async () => {
    if (!alumniId) {
      Alert.alert(
        "No alumni profile",
        "Your account has no alumni record yet.",
      );
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
      Alert.alert(
        "Action failed",
        error?.response?.data?.error || "Unable to update attendance.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onUploadGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo access to upload gallery images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      result.assets.forEach((asset, index) => {
        const file = toMultipartFile(
          asset,
          `gallery-${Date.now()}-${index}.jpg`,
        );
        if (file) formData.append("images", file);
      });

      await eventService.uploadGalleryPhotos(eventId, formData);
      await loadDetails();
      Alert.alert("Uploaded", "Gallery photos uploaded successfully.");
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error?.response?.data?.error || "Unable to upload photos.",
      );
    } finally {
      setUploading(false);
    }
  };

  const onDeleteGalleryPhoto = (photoId) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await eventService.deleteGalleryPhoto(eventId, photoId);
              await loadDetails();
            } catch (error) {
              Alert.alert(
                "Delete failed",
                error?.response?.data?.error || "Unable to delete photo.",
              );
            }
          },
        },
      ],
    );
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
  };

  const prevPhoto = () => {
    setLightboxIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const nextPhoto = () => {
    setLightboxIndex((prev) => (prev + 1) % gallery.length);
  };

  const getStatusBadge = () => {
    if (!event?.date)
      return { label: "Upcoming", bg: "#dbeafe", text: "#1e40af" };
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const eventDate = new Date(event.date);
    const eventDay = new Date(
      Date.UTC(
        eventDate.getUTCFullYear(),
        eventDate.getUTCMonth(),
        eventDate.getUTCDate(),
      ),
    );
    const diff = Math.round((eventDay - today) / (1000 * 60 * 60 * 24));
    if (eventDay < today)
      return { label: "Completed", bg: "#f1f5f9", text: "#64748b" };
    if (diff === 0) return { label: "Today", bg: "#fef3c7", text: "#b45309" };
    if (diff <= 7)
      return { label: `In ${diff} days`, bg: "#ffedd5", text: "#c2410c" };
    return { label: "Upcoming", bg: "#d1fae5", text: "#047857" };
  };

  const formatEventTimeRange = () => {
    const startTime = event?.start_time || event?.time || null;
    const endTime = event?.end_time || null;

    if (startTime && endTime) return `${startTime} – ${endTime}`;
    if (startTime) return startTime;
    if (endTime) return `Until ${endTime}`;
    return "To be announced";
  };

  const formatRegistrationLabel = () => {
    const fee = event?.registration_fee ?? event?.fee ?? event?.price;

    if (fee !== undefined && fee !== null && fee !== "") {
      const numericFee = Number(fee);
      if (!Number.isNaN(numericFee)) {
        if (numericFee === 0) return "Free";
        return new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          maximumFractionDigits: 0,
        }).format(numericFee);
      }

      return String(fee);
    }

    if (isAttending) return "Registered";
    if (isPreviousEvent) return "Registration closed";
    return "Open registration";
  };

  const status = getStatusBadge();
  const heroImage = imageUrl(event?.image, API_ORIGIN);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event?.date ? new Date(event.date) : null;
  if (eventDate) eventDate.setHours(0, 0, 0, 0);
  const isPreviousEvent =
    event?.status === "PREVIOUS" || (eventDate && eventDate < today);
  const canUploadGallery = isPreviousEvent && (alumniUser || teacherUser);

  const getAvatarFallbackUrl = (alumnus) => {
    const name = fullName(alumnus) || "User";
    const colors = ["2563eb", "7c3aed", "db2777", "ea580c", "16a34a", "0891b2"];
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const color = colors[Math.abs(hash) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&rounded=true&size=64`;
  };

  const getProfileImageSrc = (alumnus) => {
    const img = alumnus?.profile_image;
    if (!img) return getAvatarFallbackUrl(alumnus);
    return img.startsWith("/") ? `${API_ORIGIN}${img}` : img;
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

  return (
    <ScreenContainer>
      <BackButton navigation={navigation} label="Back to Events" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero Image */}
        {event.image ? (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: heroImage }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroContent}>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.text }]}>
                  {status.label}
                </Text>
              </View>
              <Text style={styles.heroTitle}>{event.name}</Text>
              <View style={styles.heroMeta}>
                {event.date && (
                  <Text style={styles.heroMetaText}>
                    {formatDate(event.date)}
                  </Text>
                )}
                {event.location && (
                  <Text style={styles.heroMetaText}> • {event.location}</Text>
                )}
                <Text style={styles.heroMetaText}>
                  {" "}
                  • {attendees.length} attending
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroContainer}>
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="calendar" size={28} color="#ffffff" />
            </View>
            <View style={{ padding: 16 }}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: status.bg, alignSelf: "flex-start" },
                ]}
              >
                <Text style={[styles.badgeText, { color: status.text }]}>
                  {status.label}
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: "#1e293b" }]}>
                {event.name}
              </Text>
              <View style={styles.heroMeta}>
                {event.date && (
                  <Text style={[styles.heroMetaText, { color: "#64748b" }]}>
                    {formatDate(event.date)}
                  </Text>
                )}
                {event.location && (
                  <Text style={[styles.heroMetaText, { color: "#64748b" }]}>
                    {" "}
                    • {event.location}
                  </Text>
                )}
                <Text style={[styles.heroMetaText, { color: "#64748b" }]}>
                  {" "}
                  • {attendees.length} attending
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About This Event</Text>
          <Text style={styles.description}>
            {event.description || "No description provided."}
          </Text>
        </View>

        {/* Event Logistics */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event Logistics</Text>
            <Text style={styles.sectionCount}>
              {attendees.length} registered
            </Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="calendar-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(event.date)}</Text>
                {event.end_date ? (
                  <Text style={styles.detailSub}>
                    Until {formatDate(event.end_date)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="time-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{formatEventTimeRange()}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="location-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Venue</Text>
                <Text style={styles.detailValue}>
                  {event.location || "To be announced"}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="ticket-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Registration</Text>
                <Text style={styles.detailValue}>
                  {formatRegistrationLabel()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Join / Leave */}
        {!isPreviousEvent ? (
          <View style={styles.card}>
            {isAttending ? (
              <View>
                <View style={styles.attendingBadge}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.attendingText}>You are attending!</Text>
                </View>
                <PrimaryButton
                  label="Leave Event"
                  onPress={onJoinLeave}
                  disabled={submitting}
                  tone="danger"
                />
              </View>
            ) : event?.target_batch && userBatch !== String(event.target_batch) ? (
              <View>
                <View style={[styles.attendingBadge, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="lock-closed-outline" size={17} color="#92400e" />
                  <Text style={[styles.attendingText, { color: '#92400e' }]}>
                    Restricted to Batch {event.target_batch}
                  </Text>
                </View>
                <PrimaryButton
                  label={`Only Batch ${event.target_batch} Can Join`}
                  onPress={() => {}}
                  disabled={true}
                  tone="secondary"
                />
              </View>
            ) : (
              <View>
                <Text style={styles.joinHint}>
                  Register your interest to receive updates about this event.
                </Text>
                <PrimaryButton
                  label="Join Event"
                  onPress={onJoinLeave}
                  disabled={submitting}
                  tone="primary"
                />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.completedCard}>
            <Text style={styles.completedLabel}>Event completed</Text>
            <Text style={styles.completedText}>
              Join is no longer available for previous events.
            </Text>
          </View>
        )}

        {/* Attendees */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendees</Text>
            <Text style={styles.sectionCount}>{attendees.length}</Text>
          </View>
          {attendees.length > 0 ? (
            <View style={styles.attendeeGrid}>
              {attendees.map((entry) => (
                <View key={entry.id} style={styles.attendee}>
                  <Image
                    source={{ uri: getProfileImageSrc(entry.alumni) }}
                    style={styles.attendeeAvatar}
                    defaultSource={{ uri: getAvatarFallbackUrl(entry.alumni) }}
                  />
                  <Text style={styles.attendeeName} numberOfLines={1}>
                    {entry.alumni?.first_name} {entry.alumni?.last_name}
                  </Text>
                  {entry.alumni?.course && (
                    <Text style={styles.attendeeCourse} numberOfLines={1}>
                      {entry.alumni.course}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="people-outline" size={20} color="#2563eb" />
              </View>
              <Text style={styles.emptyTitle}>No attendees yet</Text>
              <Text style={styles.emptySub}>
                Be the first to register for this event.
              </Text>
            </View>
          )}
        </View>

        {/* Gallery */}
        {isPreviousEvent && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              {gallery.length > 0 && (
                <Text style={styles.sectionCount}>
                  {gallery.length} {gallery.length === 1 ? "photo" : "photos"}
                </Text>
              )}
            </View>

            {canUploadGallery && (
              <Pressable
                style={[
                  styles.uploadButton,
                  uploading && styles.uploadButtonDisabled,
                ]}
                onPress={onUploadGallery}
                disabled={uploading}
              >
                <Ionicons name="camera-outline" size={18} color="#ffffff" />
                <Text style={styles.uploadButtonText}>
                  {uploading ? "Uploading..." : "Upload"}
                </Text>
              </Pressable>
            )}

            {gallery.length > 0 ? (
              <View style={styles.galleryGrid}>
                {gallery.map((photo, index) => {
                  const photoUrl = imageUrl(photo.image, API_ORIGIN);
                  const ownerId = Number(
                    photo.uploaded_by || photo.user?.id || 0,
                  );
                  const canDeletePhoto =
                    teacherUser ||
                    (alumniUser &&
                      currentUserId > 0 &&
                      ownerId === currentUserId);
                  return (
                    <View key={photo.id} style={styles.galleryItem}>
                      <Pressable onPress={() => openLightbox(index)}>
                        {photoUrl ? (
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.galleryImage}
                          />
                        ) : null}
                      </Pressable>
                      {canDeletePhoto && (
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => onDeleteGalleryPhoto(photo.id)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="image-outline" size={28} color="#2563eb" />
                </View>
                <Text style={styles.emptyTitle}>No photos yet</Text>
                <Text style={styles.emptySub}>
                  {canUploadGallery
                    ? "Upload photos to share with everyone."
                    : "Check back later for event photos."}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View style={styles.lightboxOverlay}>
          <Pressable style={styles.lightboxClose} onPress={closeLightbox}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>

          {gallery.length > 1 && (
            <View style={styles.lightboxNav}>
              <Pressable onPress={prevPhoto} style={styles.lightboxNavBtn}>
                <Ionicons name="chevron-back" size={22} color="#ffffff" />
              </Pressable>
              <Pressable onPress={nextPhoto} style={styles.lightboxNavBtn}>
                <Ionicons name="chevron-forward" size={22} color="#ffffff" />
              </Pressable>
            </View>
          )}

          {gallery[lightboxIndex] && (
            <Image
              source={{
                uri: imageUrl(gallery[lightboxIndex].image, API_ORIGIN),
              }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}

          <Text style={styles.lightboxCounter}>
            {lightboxIndex + 1} / {gallery.length}
          </Text>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
    padding: 14,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  description: {
    color: "#334155",
    lineHeight: 22,
  },
  // Hero
  heroContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroPlaceholder: {
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    height: 160,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    height: 220,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  heroMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  heroMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  // Details grid
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  detailItem: {
    width: "48%",
    gap: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  detailInfo: {
    flexShrink: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
  },
  detailSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  // Join/Leave
  joinHint: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  attendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginBottom: 12,
  },
  checkIcon: {
    fontSize: 16,
    color: "#059669",
    fontWeight: "700",
  },
  attendingText: {
    fontSize: 14,
    color: "#065f46",
    fontWeight: "700",
  },
  completedCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    padding: 14,
    marginTop: 12,
  },
  completedLabel: {
    color: "#1e3a8a",
    fontWeight: "700",
    fontSize: 14,
  },
  completedText: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4,
  },
  // Attendees
  attendeeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  attendee: {
    width: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  attendeeCourse: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  // Gallery
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignSelf: "stretch",
  },
  uploadButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  galleryItem: {
    width: "48%",
    marginBottom: 8,
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  // Empty states
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    backgroundColor: "#f8fafc",
  },
  emptyIconBox: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxNav: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    zIndex: 5,
  },
  lightboxNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "90%",
    height: "75%",
    borderRadius: 4,
  },
  lightboxCounter: {
    position: "absolute",
    bottom: 40,
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
