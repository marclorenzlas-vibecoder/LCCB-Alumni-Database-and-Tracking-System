import { useEffect } from "react";
import { BackHandler } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import { navigationRef } from "../../App";

export default function AppBackHandler() {
  useEffect(() => {
    const onBackPress = () => {
      if (!navigationRef.isReady()) return false;

      const state = navigationRef.getRootState();
      const mainRoute = state?.routes?.[state.index ?? 0];

      // Not inside the authenticated Main shell — let the OS handle it.
      if (!mainRoute || mainRoute.name !== "Main") return false;

      const drawerState = mainRoute.state;
      if (!drawerState) return true;

      const currentTab = drawerState.routes[drawerState.index ?? 0];
      if (!currentTab) return true;

      const stackDepth = currentTab.state?.routes?.length ?? 1;

      // Still have internal stack depth inside this tab (e.g. Settings > ChangePassword).
      // Let React Navigation pop the top screen naturally.
      if (stackDepth > 1) return false;

      // Already at the root of the Home tab — block the back button so the app stays here.
      if (currentTab.name === "Home") return true;

      // At the root of any other drawer tab → jump to Home.
      // DrawerActions.jumpTo does NOT push a new history entry, so there is nothing
      // to "go back" to — repeated back presses will stay on Home permanently.
      navigationRef.dispatch(DrawerActions.jumpTo("Home"));
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
