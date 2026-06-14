export function navigateToDrawerRoute(navigation, routeName, rootScreen = null) {
  if (!navigation || !routeName) return;

  let current = navigation;
  while (current) {
    const state = current.getState?.();
    if (state?.routeNames?.includes?.(routeName)) {
      const activeRoute = state.routes?.[state.index ?? 0];
      const activeStack = activeRoute?.state;
      const activeScreen = activeStack?.routes?.[activeStack.index ?? 0]?.name || null;
      const alreadyAtTarget = activeRoute?.name === routeName;
      const alreadyAtRoot = alreadyAtTarget && (!rootScreen || activeScreen === rootScreen);

      if (alreadyAtRoot) return;

      current.navigate(routeName, rootScreen ? { screen: rootScreen } : undefined);
      return;
    }

    current = current.getParent?.();
  }

  navigation.navigate(routeName, rootScreen ? { screen: rootScreen } : undefined);
}
