import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import AppBackHandler from "./src/navigation/AppBackHandler";
import { navigationRef } from "./src/navigation/navigationRef";

export { navigationRef };

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <AppNavigator />
      <AppBackHandler />
    </NavigationContainer>
  );
}
