import { handleGlobalBackNavigation } from "./backNavigation";

export function safeGoBack(navigation) {
  handleGlobalBackNavigation(navigation);
}

export default safeGoBack;
