import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { authService } from '../services/authService';
import { realtimeClient } from '../services/realtimeClient';
import { registerAuthErrorHandler } from '../services/apiClient';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

const centerStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center'
};

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    registerAuthErrorHandler((message) => {
      Alert.alert('Session Expired', message, [
        { text: 'OK', onPress: () => setUser(null) }
      ]);
    });
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await authService.loadSession();
        if (session.user) {
          setUser(session.user);
          // Set isLoading false right away so UI appears instantly using cached session user
          setIsLoading(false);
          
          // Fetch fresh user in background
          try {
            const freshUser = await authService.getUser(session.user.id);
            if (freshUser) {
              setUser(freshUser);
              await authService.saveUser(freshUser);
            }
          } catch (e) {
             console.warn("Could not fetch fresh user details in background", e);
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const refreshCurrentUser = async () => {
      try {
        const freshUser = await authService.getUser(user.id);
        if (freshUser) {
          setUser(freshUser);
          await authService.saveUser(freshUser);
        }
      } catch (error) {
        console.error('Failed to refresh mobile session user from realtime event:', error?.message || error);
      }
    };

    const unsubProfile = realtimeClient.subscribe('profile.updated', (payload) => {
      if (!payload?.userId || Number(payload.userId) === Number(user.id)) {
        refreshCurrentUser();
      }
    });

    const unsubAlumni = realtimeClient.subscribe('alumni.updated', (payload) => {
      const currentAlumniId = user?.alumni?.id;
      if (!currentAlumniId || !payload?.alumniId) return;
      if (Number(payload.alumniId) === Number(currentAlumniId)) {
        refreshCurrentUser();
      }
    });

    const unsubDonation = realtimeClient.subscribe('notification.created', (payload) => {
      if (payload?.type === 'DONATION' && payload?.senderName) {
        Alert.alert('New Donation', `${payload.senderName} donated ${payload.amountLabel || ''} to ${payload.campaignName || 'a campaign'}.`, [{ text: 'OK' }]);
      }
    });

    return () => {
      unsubProfile();
      unsubAlumni();
      unsubDonation();
    };
  }, [user?.id, user?.alumni?.id]);

  if (isLoading) {
    return (
      <View style={centerStyle}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  const approvalStatus = String(user?.approval_status || '').toUpperCase();
  const blocked = user?.is_blocked || false;

  if (user && (approvalStatus === 'PENDING' || approvalStatus === 'REJECTED' || blocked)) {
    return (
      <View style={centerStyle}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 10 }}>Account Status</Text>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>
          {blocked ? 'Your account is blocked. Contact your administrator.' : `Your account is ${approvalStatus}.`}
        </Text>
        <Pressable
          style={{ backgroundColor: '#0f766e', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
          onPress={async () => {
            await authService.logout();
            setUser(null);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Back to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        cardStyle: { backgroundColor: '#ffffff' },
        headerTitleAlign: 'left',
        headerTitleStyle: {
          color: '#111827',
          fontSize: 28,
          fontWeight: '500'
        },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#ffffff' }
      }}
    >
      {user ? (
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {(props) => <MainTabs {...props} user={user} setUser={setUser} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            options={{
              title: 'Login',
              headerBackVisible: false,
              headerLeft: () => null
            }}
          >
            {(props) => <LoginScreen {...props} setUser={setUser} />}
          </Stack.Screen>
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: 'Register',
              headerBackVisible: false,
              headerLeft: () => null
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
