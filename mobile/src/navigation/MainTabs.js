import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imageUrl } from "../utils/formatters";
import { API_ORIGIN } from "../config/api";
import { navigateToDrawerRoute } from "./drawerNavigation";
import EventsStack from "./EventsStack";
import JobsStack from "./JobsStack";
import AlumniStack from "./AlumniStack";
import DonationsStack from "./DonationsStack";
import HomeStack from "./HomeStack";
import AchievementsStack from "./AchievementsStack";
import NotificationsStack from "./NotificationsStack";
import SettingsStack from "./SettingsStack";
import { showPendingReceiptAlert, subscribePendingDonationReceipt } from "../utils/donationReceiptGuard";
import { authService } from "../services/authService";

const Drawer = createDrawerNavigator();
const AlumniLogo = require("../../assets/alumnilogo2.png");

const iconForRoute = (routeName, focused) => {
  const map = {
    Home: focused ? "home" : "home-outline",
    Events: focused ? "calendar" : "calendar-outline",
    Employment: focused ? "briefcase" : "briefcase-outline",
    Alumni: focused ? "people" : "people-outline",
    Achievements: focused ? "sparkles" : "sparkles-outline",
    Notifications: focused ? "notifications" : "notifications-outline",
    Settings: focused ? "settings" : "settings-outline",
    MyProfile: focused ? "person" : "person-outline",
    ChangePassword: focused ? "lock-closed" : "lock-closed-outline",
  };
  return map[routeName] || "ellipse-outline";
};

const RouteIcon = ({ routeName, focused, color, size = 20 }) => {
  if (routeName === "Donations") {
    return (
      <View
        style={[
          styles.donationIconCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={[
            styles.donationIconText,
            {
              color,
              fontSize: size * 0.58,
              lineHeight: size * 0.68,
            },
          ]}
        >
          $
        </Text>
      </View>
    );
  }

  return (
    <Ionicons
      name={iconForRoute(routeName, focused)}
      size={size}
      color={color}
    />
  );
};

function CustomDrawerContent(props) {
  const { state, navigation, descriptors, user, setUser, receiptNavigationBlocked } = props;
  const insets = useSafeAreaInsets();

  const topGroup = ["Home", "Alumni", "Events", "Achievements", "Employment", "Donations"];
  const bottomGroupOrder = [
    "Notifications",
    "Settings",
  ];

  const routeNames = state.routes.map((route) => route.name);

  const rootStackScreen = {
    Home: "HomeScreen",
    Events: "EventsList",
    Employment: "JobsList",
    Alumni: "AlumniDirectory",
    Donations: "DonationsList",
    Settings: "SettingsScreen",
    Notifications: "NotificationsScreen",
    Achievements: "AchievementsScreen",
  };

  const handleDrawerNavigate = (routeName) => {
    if (receiptNavigationBlocked) {
      navigation.dispatch(DrawerActions.closeDrawer());
      showPendingReceiptAlert();
      return;
    }

    navigation.dispatch(DrawerActions.closeDrawer());

    const rootScreen = rootStackScreen[routeName] || null;
    setTimeout(() => {
      navigateToDrawerRoute(navigation, routeName, rootScreen);
    }, 50);
  };

  const handleLogout = () => {
    if (receiptNavigationBlocked) {
      navigation.dispatch(DrawerActions.closeDrawer());
      showPendingReceiptAlert();
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          navigation.dispatch(DrawerActions.closeDrawer());
          await authService.logout();
          setUser(null);
        },
      },
    ]);
  };

  const profileImage = imageUrl(user?.profile_image, API_ORIGIN);
  const initials = (user?.username || "U").charAt(0).toUpperCase();

  const renderItem = (routeName) => {
    const index = state.routes.findIndex((route) => route.name === routeName);
    if (index < 0) return null;

    const route = state.routes[index];
    const focused = state.index === index;
    const color = focused ? "#ffffff" : "#bfdbfe";
    const options = descriptors[route.key]?.options || {};
    const label = options.title || route.name;

    return (
      <Pressable
        key={route.key}
        onPress={() => handleDrawerNavigate(route.name)}
        style={[styles.drawerItem, focused && styles.drawerItemActive]}
      >
        <View style={[styles.iconTrack, focused && styles.iconTrackActive]}>
          <RouteIcon routeName={route.name} focused={focused} size={20} color={color} />
        </View>
        <Text style={[styles.drawerLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContent,
        { paddingTop: insets.top + 12 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandSection}>
        <Image source={AlumniLogo} style={styles.brandLogo} resizeMode="contain" />
        <View style={styles.brandTextWrap}>
          <Text style={styles.brandTitle}>LCCB ALUMNI</Text>
          <Text style={styles.brandSub}>CONNECTING EXCELLENCE</Text>
        </View>
      </View>

      <View style={styles.profileSection}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.profileTextWrap}>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.username || "Alumni"}
          </Text>
          <Text style={styles.profileRole}>
            Alumni Member
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Main</Text>
      <View style={styles.menuSection}>{topGroup.map(renderItem)}</View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuSection}>
        {bottomGroupOrder
          .filter((name) => routeNames.includes(name))
          .map(renderItem)}
        <Pressable onPress={handleLogout} style={[styles.drawerItem, styles.logoutItem]}>
          <View style={[styles.iconTrack, styles.logoutIconTrack]}>
            <Ionicons name="log-out-outline" size={20} color="#fecaca" />
          </View>
          <Text style={[styles.drawerLabel, styles.logoutLabel]} numberOfLines={1}>
            Logout
          </Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

export default function MainTabs({ user, setUser }) {
  const [receiptNavigationBlocked, setReceiptNavigationBlocked] = useState(false);

  useEffect(() => {
    return subscribePendingDonationReceipt(setReceiptNavigationBlocked);
  }, []);

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          user={user}
          setUser={setUser}
          receiptNavigationBlocked={receiptNavigationBlocked}
        />
      )}
      style={{ backgroundColor: "#ffffff" }}
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: "#ffffff" },
        drawerType: "front",
        drawerActiveTintColor: "#ffffff",
        drawerInactiveTintColor: "#bfdbfe",
        drawerStyle: {
          width: 268,
          backgroundColor: "#1e40af",
        },
        overlayColor: "rgba(15, 23, 42, 0.46)",
        swipeEnabled: !receiptNavigationBlocked,
        swipeEdgeWidth: receiptNavigationBlocked ? 0 : 52,
        drawerIcon: ({ focused, color }) => (
          <RouteIcon routeName={route.name} focused={focused} size={20} color={color} />
        ),
      })}
    >
      <Drawer.Screen name="Home" options={{ headerShown: false }}>
        {(props) => <HomeStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Events" options={{ headerShown: false }}>
        {(props) => <EventsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen
        name="Employment"
        options={{ title: "Employment", headerShown: false }}
      >
        {(props) => <JobsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen
        name="Alumni"
        options={{ title: "Alumni", headerShown: false }}
      >
        {(props) => <AlumniStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Achievements" options={{ headerShown: false }}>
        {(props) => <AchievementsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen
        name="Donations"
        options={{ title: "Donations", headerShown: false }}
      >
        {(props) => <DonationsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Notifications" options={{ headerShown: false }}>
        {(props) => <NotificationsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Settings" options={{ headerShown: false }}>
        {(props) => <SettingsStack {...props} user={user} setUser={setUser} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flexGrow: 1,
    paddingBottom: 18,
    backgroundColor: "#1e40af",
  },
  brandSection: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(191, 219, 254, 0.22)",
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  brandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  brandSub: {
    marginTop: 1,
    color: "#bfdbfe",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(191, 219, 254, 0.18)",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.42)",
  },
  avatarFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  profileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  profileRole: {
    marginTop: 2,
    color: "#bfdbfe",
    fontSize: 11,
    fontWeight: "600",
  },
  sectionLabel: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
    color: "rgba(191, 219, 254, 0.62)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  menuSection: {
    marginBottom: 2,
  },
  drawerItem: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 1,
    paddingHorizontal: 10,
  },
  drawerItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.2)",
  },
  iconTrack: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTrackActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  logoutItem: {
    marginTop: 2,
  },
  logoutIconTrack: {
    backgroundColor: "rgba(239, 68, 68, 0.14)",
  },
  logoutLabel: {
    color: "#fecaca",
  },
  donationIconCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.8,
  },
  donationIconText: {
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  drawerLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(191, 219, 254, 0.18)",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 0,
  },
});
