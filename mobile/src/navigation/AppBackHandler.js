import { useEffect } from "react";
import { BackHandler } from "react-native";
import { navigationRef } from "../../App";
import { handleGlobalBackNavigation, getStackDepth } from "../utils/backNavigation";

export default function AppBackHandler() {
  useEffect(() => {
    const onBackPress = () => {
      if (!navigationRef.isReady()) return false;

      const state = navigationRef.getRootState();
      const mainRoute = state?.routes?.[state.index ?? 0];

      if (!mainRoute || mainRoute.name !== "Main") return false;

      const drawerState = mainRoute.state;
      if (!drawerState) return true;

      const currentTab = drawerState.routes[drawerState.index ?? 0];
      if (!currentTab) return true;

      const stackDepth = getStackDepth();

      // Still have internal stack depth — let React Navigation pop naturally
      if (stackDepth > 1) return false;

      // At the root of a tab — apply global middleware
      handleGlobalBackNavigation(undefined);
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, []);

  return null;
}
