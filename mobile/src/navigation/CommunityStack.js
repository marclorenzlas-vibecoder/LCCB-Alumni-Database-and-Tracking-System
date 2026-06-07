import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CommunityHubScreen from '../screens/community/CommunityHubScreen';
import AlumniDirectoryScreen from '../screens/community/AlumniDirectoryScreen';
import AchievementsScreen from '../screens/community/AchievementsScreen';
import CareersScreen from '../screens/community/CareersScreen';
import DonationsScreen from '../screens/community/DonationsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function CommunityStack({ user }) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityHub"
        options={({ navigation }) => ({
          title: 'Community',
          headerLeft: () => (
            <Pressable onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ paddingRight: 10 }}>
              <Ionicons name="menu" size={28} color="#0f172a" />
            </Pressable>
          )
        })}
      >
        {(props) => <CommunityHubScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="AlumniDirectory" options={{ title: 'Alumni Directory' }}>
        {(props) => <AlumniDirectoryScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Achievements" options={{ title: 'Achievements' }}>
        {(props) => <AchievementsScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Careers" options={{ title: 'Career Journey' }}>
        {(props) => <CareersScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Donations" options={{ title: 'Donations' }}>
        {(props) => <DonationsScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Notifications" options={{ title: 'Notifications' }}>
        {(props) => <NotificationsScreen {...props} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
