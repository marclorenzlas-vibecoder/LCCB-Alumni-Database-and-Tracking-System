import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function NotificationsStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="NotificationsScreen">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <NotificationsScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
