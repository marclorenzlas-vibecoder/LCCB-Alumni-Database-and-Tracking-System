import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import SettingsScreen from '../screens/profile/SettingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export default function SettingsStack({ user, setUser }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="SettingsScreen">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <SettingsScreen {...props} user={user} setUser={setUser} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="MyProfileScreen">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <ProfileScreen {...props} user={user} setUser={setUser} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="ChangePasswordScreen">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <ChangePasswordScreen {...props} user={user} setUser={setUser} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
