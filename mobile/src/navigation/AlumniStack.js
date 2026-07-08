import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import AlumniDirectoryScreen from '../screens/community/AlumniDirectoryScreen';
import AlumniDetailScreen from '../screens/community/AlumniDetailScreen';
import AlumniChatScreen from '../screens/community/AlumniChatScreen';
import AchievementDetailScreen from '../screens/community/AchievementDetailScreen';
import CareerDetailScreen from '../screens/community/CareerDetailScreen';
import DonationReceiptScreen from '../screens/donations/DonationReceiptScreen';

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
      <Stack.Screen name="AlumniChat">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AlumniChatScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="AlumniAchievementDetail">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AchievementDetailScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="AlumniCareerDetail">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <CareerDetailScreen {...props} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="AlumniDonationReceipt">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <DonationReceiptScreen {...props} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
