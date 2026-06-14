import { CommonActions } from '@react-navigation/native';

const navigationHistory = [];
const MAX_HISTORY = 50;

const createEntryKey = (entry) => `${entry.drawerName}:${entry.screenName || ''}`;

export function getActiveNavigationEntry(rootState) {
  const rootRoute = rootState?.routes?.[rootState.index ?? 0];
  if (!rootRoute || rootRoute.name !== 'Main') return null;

  const drawerState = rootRoute.state;
  const drawerRoute = drawerState?.routes?.[drawerState.index ?? 0];
  if (!drawerRoute?.name) return null;

  const stackState = drawerRoute.state;
  const stackRoute = stackState?.routes?.[stackState.index ?? 0];

  const entry = {
    drawerName: drawerRoute.name,
    screenName: stackRoute?.name || null,
  };

  return {
    ...entry,
    key: createEntryKey(entry),
  };
}

export function recordNavigationState(rootState) {
  const entry = getActiveNavigationEntry(rootState);
  if (!entry) {
    navigationHistory.length = 0;
    return;
  }

  const lastEntry = navigationHistory[navigationHistory.length - 1];
  if (lastEntry?.key === entry.key) return;

  navigationHistory.push(entry);
  if (navigationHistory.length > MAX_HISTORY) {
    navigationHistory.shift();
  }
}

export function popPreviousNavigationEntry(rootState) {
  const currentEntry = getActiveNavigationEntry(rootState);

  while (
    navigationHistory.length > 0 &&
    currentEntry &&
    navigationHistory[navigationHistory.length - 1]?.key === currentEntry.key
  ) {
    navigationHistory.pop();
  }

  return navigationHistory.pop() || null;
}

export function clearNavigationHistory() {
  navigationHistory.length = 0;
}

export function navigateToMainEntry(navigationRef, entry) {
  if (!navigationRef?.isReady?.() || !entry?.drawerName) return;

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Main',
      params: {
        screen: entry.drawerName,
        params: entry.screenName ? { screen: entry.screenName } : undefined,
      },
    })
  );
}

export function getHomeFallbackEntry() {
  return {
    drawerName: 'Home',
    screenName: 'HomeScreen',
    key: 'Home:HomeScreen',
  };
}
