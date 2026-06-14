import "react-native-gesture-handler";
import React from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import AppBackHandler from "./src/navigation/AppBackHandler";

export const navigationRef = createNavigationContainerRef();

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <AppNavigator />
      <AppBackHandler />
    </NavigationContainer>
  );
}
