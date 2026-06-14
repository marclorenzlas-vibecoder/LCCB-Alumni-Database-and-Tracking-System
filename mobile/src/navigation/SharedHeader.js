import React from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_ORIGIN } from "../config/api";
import { imageUrl } from "../utils/formatters";
import { navigateToDrawerRoute } from "./drawerNavigation";

export function HeaderBrand() {
  return (
    <View style={styles.headerBrandWrap}>
      <Text style={styles.headerBrandStrong}>LCCB</Text>
      <Text style={styles.headerBrandSoft}> Alumni</Text>
    </View>
  );
}

export function HeaderRight({ user, navigation }) {
  const firstName =
    user?.alumni?.firstName ||
    user?.alumni?.first_name ||
    user?.username ||
    "A";
  const initial = String(firstName).trim().charAt(0).toUpperCase() || "A";
  const [showMenu, setShowMenu] = React.useState(false);
  const profileImage = imageUrl(user?.profile_image, API_ORIGIN);

  const sendFeedback = () => {
    setShowMenu(false);
    Alert.alert(
      "Feedback",
      "Thanks for your feedback. Please share your concerns with the admin team.",
    );
  };

  return (
    <View style={styles.headerRightWrap}>
      <Pressable
        onPress={() =>
          navigateToDrawerRoute(navigation, "Settings", "SettingsScreen")
        }
        style={styles.headerAvatar}
      >
        {profileImage ? (
          <Image
            source={{ uri: profileImage }}
            style={styles.headerAvatarImage}
          />
        ) : (
          <Text style={styles.headerAvatarText}>{initial}</Text>
        )}
      </Pressable>
      <Pressable
        onPress={() => setShowMenu((prev) => !prev)}
        style={styles.headerDotsBtn}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#0f172a" />
      </Pressable>
      {showMenu ? (
        <View style={styles.feedbackMenu}>
          <Pressable onPress={sendFeedback} style={styles.feedbackMenuItem}>
            <Text style={styles.feedbackMenuText}>Send feedback</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBrandStrong: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  headerBrandSoft: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "400",
  },
  headerRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#84cc16",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerAvatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  headerDotsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 210,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  feedbackMenuItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  feedbackMenuText: {
    color: "#e5e7eb",
    fontSize: 17,
    fontWeight: "600",
  },
});
