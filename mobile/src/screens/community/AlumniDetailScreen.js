import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../../components/ScreenContainer";
import LoadingState from "../../components/LoadingState";
import BackButton from "../../components/BackButton";
import { API_ORIGIN } from "../../config/api";
import { communityService } from "../../services/communityService";
import { donationService } from "../../services/donationService";
import { imageUrl } from "../../utils/formatters";

function getSocialIconMeta(link) {
  const platform = String(link?.platform || "").toLowerCase();
  const url = String(link?.url || "").toLowerCase();

  if (platform.includes("instagram") || url.includes("instagram.com")) {
    return { name: "logo-instagram", color: "#e1306c", label: "Instagram" };
  }
  if (
    platform.includes("facebook") ||
    url.includes("facebook.com") ||
    url.includes("fb.com")
  ) {
    return { name: "logo-facebook", color: "#1877f2", label: "Facebook" };
  }
  if (platform.includes("linkedin") || url.includes("linkedin.com")) {
    return { name: "logo-linkedin", color: "#0a66c2", label: "LinkedIn" };
  }
  if (
    platform.includes("twitter") ||
    platform === "x" ||
    url.includes("twitter.com") ||
    url.includes("x.com")
  ) {
    return { name: "logo-twitter", color: "#1d9bf0", label: "Twitter/X" };
  }
  if (
    platform.includes("youtube") ||
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  ) {
    return { name: "logo-youtube", color: "#ff0000", label: "YouTube" };
  }
  if (platform.includes("github") || url.includes("github.com")) {
    return { name: "logo-github", color: "#111827", label: "GitHub" };
  }
  if (platform.includes("tiktok") || url.includes("tiktok.com")) {
    return { name: "logo-tiktok", color: "#111827", label: "TikTok" };
  }

  return {
    name: "globe-outline",
    color: "#475569",
    label: link?.platform || "Link",
  };
}

function getEducationHistory(alumni = {}) {
  const explicit = alumni.education_history || alumni.educationHistory || [];
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;
  if (
    alumni.level ||
    alumni.batch ||
    alumni.graduation_year ||
    alumni.graduationYear
  ) {
    return [
      {
        level: alumni.level,
        batch: alumni.batch,
        graduationYear: alumni.graduationYear || alumni.graduation_year,
      },
    ];
  }
  return [];
}

function getLevelLabel(value) {
  const map = {
    INTEGRATED_SCHOOL: "Integrated School",
    NIGHT_HIGH: "Night High",
    SENIOR_HIGH: "Senior High",
    SENIOR_HIGH_SCHOOL: "Senior High",
    COLLEGE: "College",
    ETEEAP: "ETEEAP",
    GRAD_SCHOOL: "Grad School",
  };
  return map[value] || value || "Not set";
}

function formatBirthday(dateStr) {
  if (!dateStr) return "Not provided";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Not provided";

  try {
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not provided";
  }
}

export default function AlumniDetailScreen({ route, navigation }) {
  const { alumniId } = route.params;
  const [alumni, setAlumni] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [careers, setCareers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgErrored, setImgErrored] = useState(false);

  const openExternalLink = async (rawUrl) => {
    if (!rawUrl) return;
    const trimmed = String(rawUrl).trim();
    const normalizedUrl = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const canOpen = await Linking.canOpenURL(normalizedUrl);
      if (!canOpen) {
        Alert.alert("Invalid link", "Unable to open this social media link.");
        return;
      }
      await Linking.openURL(normalizedUrl);
    } catch (error) {
      console.error("Failed to open social link:", error);
      Alert.alert("Open failed", "Could not open the social media link.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      Promise.all([
        communityService.getAlumniById(alumniId),
        communityService.getAchievements(alumniId),
        communityService.getCareers(alumniId),
        donationService.getByAlumni(alumniId),
      ])
        .then(([detail, achievementsData, careersData, donationsData]) => {
          if (!mounted) return;
          setAlumni(detail);
          setAchievements(achievementsData || []);
          setCareers(careersData || []);
          const sortedDonations = (donationsData || [])
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 3);
          setDonations(sortedDonations);
        })
        .catch((error) => {
          console.error("Failed to load alumni detail:", error?.message || error);
          if (mounted) Alert.alert("Error", "Failed to load alumni details.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [alumniId])
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading alumni profile" />
      </ScreenContainer>
    );
  }

  if (!alumni) {
    return (
      <ScreenContainer>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Alumni Not Found</Text>
          <Text style={styles.errorDesc}>
            Could not load the alumni profile.
          </Text>
          <BackButton navigation={navigation} label="Go Back" />
        </View>
      </ScreenContainer>
    );
  }

  const img = imageUrl(alumni.profile_image || alumni.profileImage, API_ORIGIN);
  const fullName =
    `${alumni.first_name || ""} ${alumni.last_name || ""}`.trim() ||
    alumni.user?.username ||
    "Unknown";
  const skills = String(alumni.skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const socialLinks = Array.isArray(alumni.social_link)
    ? alumni.social_link
    : [];
  const educationHistory = getEducationHistory(alumni);
  const primaryEducation =
    educationHistory.length > 0
      ? educationHistory[educationHistory.length - 1]
      : {};

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BackButton navigation={navigation} label="Back" />
        {/* Header */}
        <View style={styles.header}>
          {img && !imgErrored ? (
            <Image
              source={{ uri: img }}
              style={styles.avatar}
              resizeMode="cover"
              onError={() => setImgErrored(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {fullName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.fullName}>{fullName}</Text>
            <Text style={styles.role}>
              {alumni.current_position || "Alumni Member"}
            </Text>
            {alumni.company && (
              <Text style={styles.company}>{alumni.company}</Text>
            )}
            {alumni.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#64748b" />
                <Text style={styles.locationText}>{alumni.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Academic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Academic Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.infoLabel}>School ID / Student Number</Text>
              <Text style={styles.infoValue}>
                {alumni.student_id || alumni.studentId || "Not provided"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{alumni.course || "Not set"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.infoLabel}>Graduation Year</Text>
              <Text style={styles.infoValue}>
                {alumni.graduationYear ||
                  alumni.graduation_year ||
                  primaryEducation.graduationYear ||
                  "Not set"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.infoLabel}>Level & Batch</Text>
              {educationHistory.length > 0 ? (
                <View style={styles.historyWrap}>
                  {educationHistory.map((entry, index) => (
                    <View key={`education-${index}`} style={styles.historyCard}>
                      <Text
                        style={styles.historyLevel}
                      >{`${index + 1}. ${getLevelLabel(entry.level)}`}</Text>
                      <View style={styles.batchChip}>
                        <Text
                          style={styles.batchChipText}
                        >{`Batch: ${entry.batch || "N/A"}`}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.infoValue}>Not set</Text>
              )}
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>
              {alumni.email || "Not provided"}
            </Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Birthday</Text>
            <Text style={styles.infoValue}>
              {formatBirthday(alumni.date_of_birth || alumni.dateOfBirth)}
            </Text>
          </View>

          {alumni.contact_number && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{alumni.contact_number}</Text>
            </View>
          )}

          {socialLinks.length > 0 && (
            <View style={styles.infoBlockNoBorder}>
              <Text style={styles.infoLabel}>Social Media</Text>
              <View style={styles.chipRow}>
                {socialLinks.map((link) =>
                  (() => {
                    const icon = getSocialIconMeta(link);
                    return (
                      <Pressable
                        key={String(link.id || link.url)}
                        style={styles.linkChip}
                        onPress={() => openExternalLink(link.url)}
                      >
                        <Ionicons
                          name={icon.name}
                          size={16}
                          color={icon.color}
                        />
                        <Text style={styles.linkChipText}>{icon.label}</Text>
                      </Pressable>
                    );
                  })(),
                )}
              </View>
            </View>
          )}
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Professional Information</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Current Position</Text>
            <Text style={styles.infoValue}>
              {alumni.current_position || "Not provided"}
            </Text>
          </View>

          {alumni.company && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{alumni.company}</Text>
            </View>
          )}

          {alumni.location && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{alumni.location}</Text>
            </View>
          )}
        </View>

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={18} color="#1d4ed8" />
              <Text style={styles.sectionTitle}>Skills</Text>
            </View>

            <View style={styles.chipRow}>
              {skills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>

          {achievements.length === 0 ? (
            <Text style={styles.emptyText}>No achievements yet.</Text>
          ) : (
            achievements.slice(0, 3).map((item) => (
              <Pressable
                key={item.id}
                style={styles.cardItem}
                onPress={() => navigation.navigate('AlumniAchievementDetail', { achievement: item })}
              >
                <Text style={styles.cardItemTitle}>
                  {item.title || "Untitled achievement"}
                </Text>
                {item.description ? (
                  <Text style={styles.cardItemDesc} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                ) : null}
                {item.date ? (
                  <Text style={styles.cardItemMeta}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        {/* Employment History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Employment History</Text>
          </View>

          {careers.length === 0 ? (
            <Text style={styles.emptyText}>No employment records yet.</Text>
          ) : (
            careers.slice(0, 3).map((item) => (
              <Pressable
                key={item.id}
                style={styles.cardItem}
                onPress={() => navigation.navigate('AlumniCareerDetail', { item })}
              >
                <View style={styles.cardItemHeaderRow}>
                  <Text style={styles.cardItemTitle}>
                    {item.job_title || "Position"}
                  </Text>
                  <Text style={styles.cardItemMeta}>
                    {item.start_date
                      ? new Date(item.start_date).toLocaleDateString()
                      : "N/A"}{" "}
                    -{" "}
                    {item.is_current
                      ? "Present"
                      : item.end_date
                        ? new Date(item.end_date).toLocaleDateString()
                        : "N/A"}
                  </Text>
                </View>
                <Text style={styles.companyLink}>
                  {item.company || "Company not set"}
                </Text>
                {item.description ? (
                  <Text style={styles.cardItemDesc} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        {/* Donations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Donations</Text>
          </View>

          {donations.length === 0 ? (
            <Text style={styles.emptyText}>No donations yet.</Text>
          ) : (
            donations.map((item) => (
              <Pressable
                key={item.id}
                style={styles.cardItem}
                onPress={() => navigation.navigate('AlumniDonationReceipt', { item })}
              >
                <View style={styles.cardItemHeaderRow}>
                  <Text style={styles.cardItemTitle}>
                    {item.purpose || "Donation"}
                  </Text>
                  <Text style={styles.cardItemMeta}>
                    {item.date
                      ? new Date(item.date).toLocaleDateString()
                      : "N/A"}
                  </Text>
                </View>
                <Text style={styles.donationAmount}>
                  PHP {Number(item.amount || 0).toLocaleString()}
                </Text>
                {item.description ? (
                  <Text style={styles.cardItemDesc} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  fullName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  role: {
    fontSize: 14,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  company: {
    fontSize: 13,
    color: "#64748b",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  infoGrid: {
    gap: 12,
  },
  gridItem: {
    gap: 4,
  },
  historyWrap: {
    gap: 8,
    marginTop: 2,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: "#dbe3f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    padding: 10,
    gap: 6,
  },
  historyLevel: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  batchChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  batchChipText: {
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 13,
  },
  infoBlock: {
    gap: 6,
    paddingBottom: 12,
  },
  infoBlockNoBorder: {
    gap: 6,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillChipText: {
    color: "#1e40af",
    fontSize: 13,
    fontWeight: "600",
  },
  linkChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkChipText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
  },
  cardItem: {
    borderWidth: 1,
    borderColor: "#dbe3f0",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  cardItemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardItemDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  cardItemMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  companyLink: {
    fontSize: 14,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  donationAmount: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  bioText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  errorDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  backButtonText: {
    color: "#1e3a8a",
    fontWeight: "600",
  },
});
