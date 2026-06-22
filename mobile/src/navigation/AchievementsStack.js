import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import AchievementsScreen from '../screens/community/AchievementsScreen';
import AchievementDetailScreen from '../screens/community/AchievementDetailScreen';

const Stack = createNativeStackNavigator();

export default function AchievementsStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="AchievementsScreen">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AchievementsScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="AchievementDetail">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AchievementDetailScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
