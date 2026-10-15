import "react-native-gesture-handler";
import React from "react";
import { LogBox } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import AppBackHandler from "./src/navigation/AppBackHandler";
import { navigationRef } from "./src/navigation/navigationRef";

LogBox.ignoreLogs([
  "setLayoutAnimationEnabledExperimental",
  "[apiClient] auth error received",
]);

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
