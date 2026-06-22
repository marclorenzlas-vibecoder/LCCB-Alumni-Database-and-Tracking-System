import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
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
import AdminStack from "./AdminStack";
import { isTeacher } from "../utils/auth";

const Drawer = createDrawerNavigator();

const iconForRoute = (routeName, focused) => {
  const map = {
    Home: focused ? "home" : "home-outline",
    Events: focused ? "calendar" : "calendar-outline",
    Employment: focused ? "briefcase" : "briefcase-outline",
    Alumni: focused ? "people-circle" : "people-circle-outline",
    Achievements: focused ? "trophy" : "trophy-outline",
    Donations: focused ? "heart" : "heart-outline",
    Notifications: focused ? "notifications" : "notifications-outline",
    Settings: focused ? "settings" : "settings-outline",
    MyProfile: focused ? "person" : "person-outline",
    ChangePassword: focused ? "lock-closed" : "lock-closed-outline",
    Admin: focused ? "settings" : "settings-outline",
  };
  return map[routeName] || "ellipse-outline";
};

function CustomDrawerContent(props) {
  const { state, navigation, descriptors, user } = props;
  const insets = useSafeAreaInsets();

  const topGroup = ["Home", "Alumni", "Events", "Achievements", "Employment", "Donations"];
  const bottomGroupOrder = [
    "Notifications",
    "Settings",
    "Admin",
  ];

  const routeNames = state.routes.map((route) => route.name);

  const rootStackScreen = {
    Home: "HomeScreen",
    Events: "EventsList",
    Employment: "JobsList",
    Alumni: "AlumniDirectory",
    Donations: "DonationsList",
    Admin: "AdminHub",
    Settings: "SettingsScreen",
    Notifications: "NotificationsScreen",
    Achievements: "AchievementsScreen",
  };

  const handleDrawerNavigate = (routeName) => {
    navigation.dispatch(DrawerActions.closeDrawer());

    const rootScreen = rootStackScreen[routeName] || null;
    setTimeout(() => {
      navigateToDrawerRoute(navigation, routeName, rootScreen);
    }, 50);
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
      <DrawerItem
        key={route.key}
        label={label}
        focused={focused}
        onPress={() => handleDrawerNavigate(route.name)}
        style={[styles.drawerItem, focused && styles.drawerItemActive]}
        labelStyle={[styles.drawerLabel, { color }]}
        icon={({ size }) => (
          <Ionicons
            name={iconForRoute(route.name, focused)}
            size={20}
            color={color}
          />
        )}
      />
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
      <View style={styles.profileSection}>
        <View style={styles.avatarWrap}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.profileName}>{user?.username || "Alumni"}</Text>
        <Text style={styles.profileRole}>
          {isTeacher(user) ? "Teacher / Staff" : "Alumni Member"}
        </Text>
      </View>

      <View style={styles.menuSection}>{topGroup.map(renderItem)}</View>

      <View style={styles.divider} />

      <View style={styles.menuSection}>
        {bottomGroupOrder
          .filter((name) => routeNames.includes(name))
          .map(renderItem)}
      </View>
    </DrawerContentScrollView>
  );
}

export default function MainTabs({ user, setUser }) {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} user={user} />}
      style={{ backgroundColor: "#ffffff" }}
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: "#ffffff" },
        drawerType: "slide",
        drawerActiveTintColor: "#ffffff",
        drawerInactiveTintColor: "#bfdbfe",
        drawerActiveBackgroundColor: "rgba(255, 255, 255, 0.14)",
        drawerStyle: {
          width: 280,
          backgroundColor: "#1e40af",
        },
        overlayColor: "rgba(0, 0, 0, 0.4)",
        drawerIcon: ({ focused, color, size }) => (
          <Ionicons
            name={iconForRoute(route.name, focused)}
            size={20}
            color={color}
          />
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
      {isTeacher(user) ? (
        <Drawer.Screen name="Admin" options={{ headerShown: false }}>
          {(props) => <AdminStack {...props} user={user} />}
        </Drawer.Screen>
      ) : null}
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
    paddingBottom: 20,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 8,
  },
  avatarWrap: {
    marginBottom: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  profileName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileRole: {
    color: "rgba(191, 219, 254, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  menuSection: {
    marginTop: 4,
    marginBottom: 2,
  },
  drawerItem: {
    borderRadius: 10,
    marginHorizontal: 10,
    marginVertical: 1,
  },
  drawerItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  drawerLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: -2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 20,
    marginVertical: 10,
  },
});
