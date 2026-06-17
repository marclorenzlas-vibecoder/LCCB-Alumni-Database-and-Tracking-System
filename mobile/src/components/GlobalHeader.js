import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_ORIGIN } from "../config/api";
import { imageUrl } from "../utils/formatters";
import { navigateToDrawerRoute } from "../navigation/drawerNavigation";

export function GlobalHeader({ user, navigation }) {
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);

  const firstName =
    user?.alumni?.firstName ||
    user?.alumni?.first_name ||
    user?.username ||
    "A";
  const initial = String(firstName).trim().charAt(0).toUpperCase() || "A";
  const profileImage = imageUrl(user?.profile_image, API_ORIGIN);

  const sendFeedback = () => {
    setShowMenu(false);
    Alert.alert(
      "Feedback",
      "Thanks for your feedback. Please share your concerns with the admin team.",
    );
  };

  return (
    <View>
      {showMenu ? (
        <Pressable style={styles.backdrop} onPress={() => setShowMenu(false)} />
      ) : null}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={styles.hamburgerBtn}
        >
          <Ionicons name="menu" size={28} color="#0f172a" />
        </Pressable>

        <Text style={styles.title}>LCCB Alumni</Text>

        <View style={styles.rightGroup}>
          <Pressable
            onPress={() =>
              navigateToDrawerRoute(navigation, "Settings", "SettingsScreen")
            }
            style={styles.avatarBtn}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setShowMenu((prev) => !prev)}
            style={styles.dotsBtn}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#0f172a" />
          </Pressable>
          {showMenu ? (
            <View style={styles.dropdown}>
              <Pressable onPress={sendFeedback} style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Send Feedback</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    overflow: "visible",
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
    textAlign: "center",
    marginRight: 44,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  dotsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    zIndex: 998,
  },
  dropdown: {
    position: "absolute",
    top: 44,
    right: 0,
    minWidth: 180,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 999,
    zIndex: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: "visible",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default GlobalHeader;
