import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import AchievementsScreen from '../screens/community/AchievementsScreen';

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
    </Stack.Navigator>
  );
}
