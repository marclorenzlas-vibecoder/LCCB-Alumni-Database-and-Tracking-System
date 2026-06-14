import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import JobManagementScreen from '../screens/admin/JobManagementScreen';
import PendingApprovalsScreen from '../screens/admin/PendingApprovalsScreen';
import OfficerManagementScreen from '../screens/admin/OfficerManagementScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="AdminHub">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <AdminHubScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="JobManagement">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <JobManagementScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="PendingApprovals">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <PendingApprovalsScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="OfficerManagement">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <OfficerManagementScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
