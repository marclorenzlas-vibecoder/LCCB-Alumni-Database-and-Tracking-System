import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import AlumniDirectoryScreen from '../screens/community/AlumniDirectoryScreen';
import AlumniDetailScreen from '../screens/community/AlumniDetailScreen';

const Stack = createNativeStackNavigator();

export default function AlumniStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="AlumniDirectory">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AlumniDirectoryScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="AlumniDetail">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AlumniDetailScreen {...props} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
