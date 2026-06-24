import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "../../components/PrimaryButton";
import ScreenContainer from "../../components/ScreenContainer";
import { authService } from "../../services/authService";
import { communityService } from "../../services/communityService";
import apiClient from "../../services/apiClient";
import { theme } from "../../theme";
import {
  areNotificationsEnabled,
  setNotificationEnabled,
} from "../../utils/notificationPreferences";

const SETTINGS_OPTIONS = [
  {
    key: "account",
    title: "Account",
    description: "Review your account details and open your full profile.",
    icon: "person-outline",
  },
  {
    key: "security",
    title: "Security",
    description: "Update your password and protect your account.",
    icon: "lock-closed-outline",
  },

  {
    key: "notifications",
    title: "Notifications",
    description: "Manage alerts for events, updates, and announcements.",
    icon: "notifications-outline",
  },
];

const getRoleLabel = (role) => {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "TEACHER") return "Faculty";
  if (normalized === "ADMIN") return "Administrator";
  return "Alumni";
};

const getStatusLabel = (user) => {
  if (user?.is_blocked) return { label: "Blocked", color: "#b91c1c" };
  if (String(user?.approval_status || "").toUpperCase() === "PENDING") {
    return { label: "Pending Approval", color: "#b45309" };
  }
  return { label: "Active", color: "#047857" };
};

function PillToggle({ enabled, onPress, disabled = false }) {
  const progress = useRef(new Animated.Value(enabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: enabled ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [enabled, progress]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#cbd5e1", theme.colors.primary],
  });

  const thumbTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24],
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={disabled ? styles.toggleMuted : null}
    >
      <Animated.View
        style={[styles.toggleTrack, { backgroundColor: trackColor }]}
      >
        <Animated.View
          style={[
            styles.toggleThumb,
            {
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function PreferenceRow({
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <PillToggle enabled={enabled} onPress={onToggle} disabled={disabled} />
    </View>
  );
}

function InfoTile({ label, value, valueColor }) {
  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function SettingsScreen({ navigation, user, setUser }) {
  const userId = user?.id;
  const statusMeta = getStatusLabel(user);
  const [activeSection, setActiveSection] = useState(null);

  // Admin/Teacher share the same role token due to backend normalisation
  const isAdmin = ['ADMIN', 'TEACHER'].includes(
    String(user?.role || '').toUpperCase()
  );

  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Granular preference state
  const [prefNotifyEvents, setPrefNotifyEvents] = useState(true);
  const [prefNotifyAchievements, setPrefNotifyAchievements] = useState(true);
  const [prefNotifyDonations, setPrefNotifyDonations] = useState(true);
  const [prefNotifyJobs, setPrefNotifyJobs] = useState(true);
  const [prefShowDonationToasts, setPrefShowDonationToasts] = useState(true);
  // Admin-only
  const [prefNotifyPendingRegistrations, setPrefNotifyPendingRegistrations] = useState(true);
  const [prefNotifyJobApplications, setPrefNotifyJobApplications] = useState(true);

  const activeMeta =
    SETTINGS_OPTIONS.find((option) => option.key === activeSection) || null;

  // Reset to the root option list every time the Settings screen comes into focus.
  useFocusEffect(
    React.useCallback(() => {
      setActiveSection(null);
    }, []),
  );

  // Intercept the hardware back button while Settings is focused.
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (!activeSection) return false;
        setActiveSection(null);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [activeSection]),
  );

  useEffect(() => {
    if (!userId) {
      setLoadingPreferences(false);
      return;
    }

    let mounted = true;

    const loadPreferences = async () => {
      setLoadingPreferences(true);
      try {
        const response = await apiClient.get(
          `/auth/notification-preference/${userId}`
        );
        const data = response.data;
        if (mounted) {
          setNotificationsEnabledState(data.notification_enabled ?? true);
          setPrefNotifyEvents(data.notify_events ?? true);
          setPrefNotifyAchievements(data.notify_achievements ?? true);
          setPrefNotifyDonations(data.notify_donations ?? true);
          setPrefNotifyJobs(data.notify_jobs ?? true);
          setPrefShowDonationToasts(data.show_donation_toasts ?? true);
          setPrefNotifyPendingRegistrations(data.notify_pending_registrations ?? true);
          setPrefNotifyJobApplications(data.notify_job_applications ?? true);
        }
      } catch (error) {
        // Fallback: read master switch from local storage
        try {
          const fallback = await areNotificationsEnabled(userId);
          if (mounted) setNotificationsEnabledState(Boolean(fallback));
        } catch (_) {}
        console.error(
          "Failed to load mobile settings preferences:",
          error?.message || error,
        );
      } finally {
        if (mounted) setLoadingPreferences(false);
      }
    };

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const persistUser = async (nextUser) => {
    setUser?.(nextUser);
    await authService.saveUser(nextUser);
  };

  const saveNotifications = async () => {
    if (!userId) {
      Alert.alert("Unavailable", "No account is currently loaded.");
      return;
    }

    setSavingNotifications(true);
    try {
      await authService.updateNotificationPreference(userId, {
        notificationEnabled: notificationsEnabled,
        promptShown: true,
        notifyEvents: prefNotifyEvents,
        notifyAchievements: prefNotifyAchievements,
        notifyDonations: prefNotifyDonations,
        notifyJobs: prefNotifyJobs,
        showDonationToasts: prefShowDonationToasts,
        ...(isAdmin && {
          notifyPendingRegistrations: prefNotifyPendingRegistrations,
          notifyJobApplications: prefNotifyJobApplications,
        }),
      });
      await setNotificationEnabled(userId, notificationsEnabled);

      const nextUser = {
        ...user,
        notification_enabled: notificationsEnabled,
        notificationEnabled: notificationsEnabled,
        notification_prompt_shown: true,
        notificationPromptShown: true,
      };
      await persistUser(nextUser);
      Alert.alert("Saved", "Notification preferences updated successfully.");
    } catch (error) {
      Alert.alert(
        "Unable to save",
        error?.response?.data?.error ||
          "Failed to update notification preferences.",
      );
    } finally {
      setSavingNotifications(false);
    }
  };

  const renderPanelHeader = (title, description, icon) => (
    <View style={styles.panelHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <>
            {renderPanelHeader(
              "Account",
              "Review your account identity and open your full profile when you need to edit details.",
              "person-outline",
            )}

            <View style={styles.infoGrid}>
              <InfoTile label="Username" value={user?.username || "Not set"} />
              <InfoTile label="Email" value={user?.email || "Not set"} />
              <InfoTile label="Role" value={getRoleLabel(user?.role)} />
              <InfoTile
                label="Account Status"
                value={statusMeta.label}
                valueColor={statusMeta.color}
              />
            </View>

            <Pressable
              style={styles.solidButton}
              onPress={() => navigation.navigate("MyProfileScreen")}
            >
              <Text style={styles.solidButtonText}>Open My Profile</Text>
            </Pressable>
          </>
        );

      case "security":
        return (
          <>
            {renderPanelHeader(
              "Security",
              "Keep your alumni account secure by updating your password regularly.",
              "lock-closed-outline",
            )}

            <View style={styles.infoNotice}>
              <Text style={styles.infoNoticeTitle}>Password Management</Text>
              <Text style={styles.infoNoticeText}>
                Open the password screen to verify your current password and set
                a new one securely.
              </Text>
            </View>

            <Pressable
              style={styles.solidButton}
              onPress={() => navigation.navigate("ChangePasswordScreen")}
            >
              <Text style={styles.solidButtonText}>Change Password</Text>
            </Pressable>
          </>
        );

      case "notifications":
        return (
          <>
            {renderPanelHeader(
              "Notifications",
              isAdmin
                ? "Manage exactly what admin alerts you want to receive about platform activity."
                : "Control how you stay informed about events, updates, and announcements.",
              "notifications-outline",
            )}

            {loadingPreferences ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>
                  Loading notification preferences...
                </Text>
              </View>
            ) : (
              <>
                <PreferenceRow
                  title="System Alerts (Master Switch)"
                  description="Enable or disable all real-time system notifications and alerts across the platform."
                  enabled={notificationsEnabled}
                  onToggle={() => setNotificationsEnabledState((prev) => !prev)}
                  disabled={savingNotifications}
                />

                <View style={styles.divider} />

                {isAdmin ? (
                  // Admin-specific toggles
                  <>
                    <PreferenceRow
                      title="Pending Registration Requests"
                      description="Get notified when a new alumnus submits a registration and is waiting for your approval."
                      enabled={notificationsEnabled && prefNotifyPendingRegistrations}
                      onToggle={() => setPrefNotifyPendingRegistrations((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                    <PreferenceRow
                      title="Job Applications"
                      description="Receive an alert when an alumnus applies to a job posting so you can review their application."
                      enabled={notificationsEnabled && prefNotifyJobApplications}
                      onToggle={() => setPrefNotifyJobApplications((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                    <PreferenceRow
                      title="Event Updates"
                      description="Get notified about new events, schedule changes, and reminders."
                      enabled={notificationsEnabled && prefNotifyEvents}
                      onToggle={() => setPrefNotifyEvents((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                  </>
                ) : (
                  // Alumni-specific toggles
                  <>
                    <PreferenceRow
                      title="Live Donation Toasts"
                      description="Show a popup alert when another alumnus makes a donation."
                      enabled={notificationsEnabled && prefShowDonationToasts}
                      onToggle={() => setPrefShowDonationToasts((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                    <PreferenceRow
                      title="Event Updates"
                      description="Get notified about new events, schedule changes, and reminders."
                      enabled={notificationsEnabled && prefNotifyEvents}
                      onToggle={() => setPrefNotifyEvents((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                    <PreferenceRow
                      title="Network Achievements"
                      description="Receive updates about alumni honors, promotions, and achievements."
                      enabled={notificationsEnabled && prefNotifyAchievements}
                      onToggle={() => setPrefNotifyAchievements((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                    <PreferenceRow
                      title="Job Opportunities"
                      description="Get notified when new jobs matching your profile are posted."
                      enabled={notificationsEnabled && prefNotifyJobs}
                      onToggle={() => setPrefNotifyJobs((p) => !p)}
                      disabled={savingNotifications || !notificationsEnabled}
                    />
                  </>
                )}

                <PrimaryButton
                  label={
                    savingNotifications ? "Saving..." : "Save Notifications"
                  }
                  onPress={saveNotifications}
                  disabled={savingNotifications}
                />
              </>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <Text style={styles.headerEyebrow}>SETTINGS</Text>
        <Text style={styles.headerTitle}>
          {activeMeta ? activeMeta.title : "Account Settings"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {activeMeta
            ? activeMeta.description
            : "Choose a settings category to manage your account preferences."}
        </Text>
      </View>

      {activeSection ? (
        <>
          <Pressable
            style={styles.backLink}
            onPress={() => setActiveSection(null)}
          >
            <Ionicons
              name="arrow-back"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.backLinkText}>Back to all settings</Text>
          </Pressable>

          <View style={styles.sectionCard}>{renderActiveSection()}</View>
        </>
      ) : (
        <View style={styles.optionsWrap}>
          {SETTINGS_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={styles.optionCard}
              onPress={() => setActiveSection(option.key)}
            >
              <View style={styles.optionCardLeft}>
                <View style={styles.optionIconWrap}>
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 6,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#64748b",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 22,
  },
  optionsWrap: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    padding: 16,
  },
  optionCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  optionDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: -8,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTextWrap: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoTile: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748b",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  infoNotice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 14,
    gap: 6,
  },
  infoNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  infoNoticeText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
  },
  solidButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  solidButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  preferenceCopy: {
    flex: 1,
    gap: 4,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  preferenceDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 999,
    padding: 2,
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleMuted: {
    opacity: 0.7,
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
  },
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#92400e",
  },
});
