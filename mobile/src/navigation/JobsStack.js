import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScreenWrapper from './ScreenWrapper';
import JobsListScreen from '../screens/jobs/JobsListScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import JobApplicationScreen from '../screens/jobs/JobApplicationScreen';
import MyApplicationsScreen from '../screens/jobs/MyApplicationsScreen';

const Stack = createNativeStackNavigator();

export default function JobsStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="JobsList">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <JobsListScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="JobDetail">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <JobDetailScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="JobApplication">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <JobApplicationScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="MyApplications">
        {(props) => (
          <ScreenWrapper user={user} navigation={props.navigation}>
            <MyApplicationsScreen {...props} user={user} />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
