import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import JobManagementScreen from '../screens/admin/JobManagementScreen';
import PendingApprovalsScreen from '../screens/admin/PendingApprovalsScreen';
import OfficerManagementScreen from '../screens/admin/OfficerManagementScreen';

const Stack = createNativeStackNavigator();

function HeaderRight({ user, navigation }) {
  const firstName = user?.alumni?.firstName || user?.alumni?.first_name || user?.username || 'A';
  const initial = String(firstName).trim().charAt(0).toUpperCase() || 'A';
  const [showMenu, setShowMenu] = React.useState(false);

  const sendFeedback = () => {
    setShowMenu(false);
    Alert.alert('Feedback', 'Thanks for your feedback. Please share your concerns with the admin team.');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, position: 'relative' }}>
      <Pressable onPress={() => navigation.navigate('Profile')} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#84cc16', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>{initial}</Text>
      </Pressable>
      <Pressable onPress={() => setShowMenu((prev) => !prev)} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="ellipsis-vertical" size={18} color="#0f172a" />
      </Pressable>
      {showMenu ? (
        <View style={{ position: 'absolute', top: 40, right: 0, minWidth: 210, borderRadius: 12, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', elevation: 8 }}>
          <Pressable onPress={sendFeedback} style={{ paddingVertical: 13, paddingHorizontal: 16 }}>
            <Text style={{ color: '#e5e7eb', fontSize: 17, fontWeight: '600' }}>Send feedback</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function AdminStack({ user }) {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#0f172a',
        headerShadowVisible: false,
        headerRight: () => <HeaderRight user={user} navigation={navigation} />
      })}
    >
      <Stack.Screen
        name="AdminHub"
        options={({ navigation }) => ({
          title: 'LCCB Alumni',
          headerLeft: () => (
            <Pressable onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ paddingRight: 10 }}>
              <Ionicons name="menu" size={28} color="#0f172a" />
            </Pressable>
          )
        })}
      >
        {(props) => <AdminHubScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="JobManagement" options={{ title: 'Manage Jobs' }}>
        {(props) => <JobManagementScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="PendingApprovals" options={{ title: 'Pending Approvals' }}>
        {(props) => <PendingApprovalsScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="OfficerManagement" options={{ title: 'Officer Management' }}>
        {(props) => <OfficerManagementScreen {...props} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
