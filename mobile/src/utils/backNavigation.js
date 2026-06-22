import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '../../App';

const MAIN_DIRECTORY_TABS = ['Home', 'Alumni', 'Events', 'Employment', 'Donations'];

export function getCurrentDrawerName() {
  if (!navigationRef.isReady()) return null;
  const state = navigationRef.getRootState();
  const mainRoute = state?.routes?.[state.index ?? 0];
  if (!mainRoute || mainRoute.name !== 'Main') return null;
  const drawerState = mainRoute.state;
  const drawerRoute = drawerState?.routes?.[drawerState.index ?? 0];
  return drawerRoute?.name || null;
}

export function getStackDepth() {
  if (!navigationRef.isReady()) return 0;
  const state = navigationRef.getRootState();
  const mainRoute = state?.routes?.[state.index ?? 0];
  if (!mainRoute || mainRoute.name !== 'Main') return 0;
  const drawerState = mainRoute.state;
  const currentTab = drawerState?.routes?.[drawerState.index ?? 0];
  return currentTab?.state?.routes?.length ?? 0;
}

export function handleGlobalBackNavigation(navigation) {
  const currentScreen = getCurrentDrawerName();
  const stackDepth = getStackDepth();

  // Nested screen inside a tab stack — standard pop
  if (stackDepth > 1) {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
  }

  // At the root of a tab
  if (MAIN_DIRECTORY_TABS.includes(currentScreen)) {
    // RULE A: Main Directory Root Safeguard
    if (currentScreen !== 'Home') {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Home' } }],
        })
      );
    }
    // Home: do nothing (lock)
  } else {
    // RULE B: Non-main tab root or sub-page — goBack or fallback to Home
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigationRef.dispatch(
        CommonActions.navigate({ name: 'Main', params: { screen: 'Home' } })
      );
    }
  }
}
