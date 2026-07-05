import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import DonationsScreen from '../screens/donations/DonationsScreen';
import DonationDetailScreen from '../screens/donations/DonationDetailScreen';
import AdminCampaignReceiptsScreen from '../screens/donations/AdminCampaignReceiptsScreen';

const Stack = createNativeStackNavigator();

export default function DonationsStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="DonationsList">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <DonationsScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="DonationDetail">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <DonationDetailScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="AdminCampaignReceipts">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AdminCampaignReceiptsScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
