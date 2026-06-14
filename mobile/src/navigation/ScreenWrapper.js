import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GlobalHeader } from '../components/GlobalHeader';

export default function ScreenWrapper({ children, user, navigation }) {
  return (
    <View style={styles.container}>
      <GlobalHeader user={user} navigation={navigation} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
