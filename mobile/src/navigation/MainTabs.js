import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/HomeScreen';
import EventsStack from './EventsStack';
import JobsStack from './JobsStack';
import AlumniStack from './AlumniStack';
import AchievementsScreen from '../screens/community/AchievementsScreen';
import DonationsStack from './DonationsStack';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminStack from './AdminStack';
import { isTeacher } from '../utils/auth';

const Drawer = createDrawerNavigator();

function HeaderBrand() {
  return (
    <View style={styles.headerBrandWrap}>
      <Text style={styles.headerBrandStrong}>LCCB</Text>
      <Text style={styles.headerBrandSoft}> Alumni</Text>
    </View>
  );
}

function HeaderRight({ user, navigation }) {
  const firstName = user?.alumni?.firstName || user?.alumni?.first_name || user?.username || 'A';
  const initial = String(firstName).trim().charAt(0).toUpperCase() || 'A';
  const [showMenu, setShowMenu] = React.useState(false);

  const sendFeedback = () => {
    setShowMenu(false);
    Alert.alert('Feedback', 'Thanks for your feedback. Please share your concerns with the admin team.');
  };

  return (
    <View style={styles.headerRightWrap}>
      <Pressable
        onPress={() => navigation.navigate('Profile')}
        style={styles.headerAvatar}
      >
        <Text style={styles.headerAvatarText}>{initial}</Text>
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

const iconForRoute = (routeName, focused) => {
  const map = {
    Home: focused ? 'home' : 'home-outline',
    Events: focused ? 'calendar' : 'calendar-outline',
    Employment: focused ? 'briefcase' : 'briefcase-outline',
    Alumni: focused ? 'people-circle' : 'people-circle-outline',
    Achievements: focused ? 'trophy' : 'trophy-outline',
    Donations: focused ? 'heart' : 'heart-outline',
    Notifications: focused ? 'notifications' : 'notifications-outline',
    Profile: focused ? 'person' : 'person-outline',
    Admin: focused ? 'settings' : 'settings-outline'
  };
  return map[routeName] || 'ellipse-outline';
};

function CustomDrawerContent(props) {
  const { state, navigation, descriptors } = props;
  const insets = useSafeAreaInsets();

  const topGroup = ['Notifications', 'Profile'];
  const bottomGroupOrder = ['Home', 'Events', 'Employment', 'Alumni', 'Achievements', 'Donations', 'Admin'];

  const routeNames = state.routes.map((route) => route.name);

  const rootStackScreen = {
    Events: 'EventsList',
    Employment: 'JobsList',
    Alumni: 'AlumniDirectory',
    Donations: 'DonationsList',
    Admin: 'AdminHub'
  };

  const handleDrawerNavigate = (routeName) => {
    const rootScreen = rootStackScreen[routeName];
    if (rootScreen) {
      navigation.navigate(routeName, { screen: rootScreen });
      return;
    }
    navigation.navigate(routeName);
  };

  const renderItem = (routeName) => {
    const index = state.routes.findIndex((route) => route.name === routeName);
    if (index < 0) return null;

    const route = state.routes[index];
    const focused = state.index === index;
    const color = focused ? '#ffffff' : '#dbeafe';
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
        icon={({ size }) => <Ionicons name={iconForRoute(route.name, focused)} size={size} color={color} />}
      />
    );
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerContent, { paddingTop: insets.top + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.brand}>Alumni Network</Text>

      {topGroup.map(renderItem)}

      <View style={styles.divider} />

      {bottomGroupOrder.filter((name) => routeNames.includes(name)).map(renderItem)}
    </DrawerContentScrollView>
  );
}

export default function MainTabs({ user, setUser }) {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff'
        },
        headerTintColor: '#0f172a',
        headerShadowVisible: false,
        headerTitle: () => <HeaderBrand />,
        headerRight: () => <HeaderRight user={user} navigation={navigation} />,
        drawerType: 'front',
        drawerActiveTintColor: '#ffffff',
        drawerInactiveTintColor: '#dbeafe',
        drawerActiveBackgroundColor: 'rgba(255, 255, 255, 0.16)',
        drawerStyle: {
          width: 270,
          backgroundColor: '#1d4ed8'
        },
        drawerIcon: ({ focused, color, size }) => (
          <Ionicons name={iconForRoute(route.name, focused)} size={size} color={color} />
        )
      })}
    >
      <Drawer.Screen name="Notifications" options={{ title: 'Notifications' }}>
        {(props) => <NotificationsScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Profile" options={{ title: 'Profile' }}>
        {(props) => <ProfileScreen {...props} user={user} setUser={setUser} />}
      </Drawer.Screen>
      <Drawer.Screen name="Home" options={{ title: 'Home' }}>
        {(props) => <DashboardScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Events" options={{ headerShown: false }}>
        {(props) => <EventsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Employment" options={{ title: 'Employment', headerShown: false }}>
        {(props) => <JobsStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Alumni" options={{ title: 'Alumni', headerShown: false }}>
        {(props) => <AlumniStack {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Achievements" options={{ title: 'Achievements' }}>
        {(props) => <AchievementsScreen {...props} user={user} />}
      </Drawer.Screen>
      <Drawer.Screen name="Donations" options={{ title: 'Donations', headerShown: false }}>
        {(props) => <DonationsStack {...props} user={user} />}
      </Drawer.Screen>
      {isTeacher(user) ? (
        <Drawer.Screen name="Admin" options={{ headerShown: false }}>
          {(props) => <AdminStack {...props} user={user} />}
        </Drawer.Screen>
      ) : null}
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    paddingBottom: 24
  },
  brand: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  drawerItem: {
    borderRadius: 12,
    marginHorizontal: 10,
    marginVertical: 2
  },
  drawerItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)'
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: -2
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(219, 234, 254, 0.45)',
    marginHorizontal: 16,
    marginVertical: 12
  },
  headerBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerBrandStrong: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800'
  },
  headerBrandSoft: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800'
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#84cc16',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15
  },
  headerDotsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  feedbackMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 210,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  feedbackMenuItem: {
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  feedbackMenuText: {
    color: '#e5e7eb',
    fontSize: 17,
    fontWeight: '600'
  }
});
