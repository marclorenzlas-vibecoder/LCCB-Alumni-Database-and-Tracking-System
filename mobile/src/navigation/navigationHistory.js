// Navigation history is no longer used.
// All back navigation is handled by the global middleware in utils/backNavigation.js.
// These stubs prevent import errors if referenced from outside the navigation tree.

export function getActiveNavigationEntry() { return null; }
export function recordNavigationState() {}
export function popPreviousNavigationEntry() { return null; }
export function clearNavigationHistory() {}
export function navigateToMainEntry() {}
export function getHomeFallbackEntry() { return null; }
