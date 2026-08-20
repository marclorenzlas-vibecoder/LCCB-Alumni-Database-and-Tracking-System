import Constants from 'expo-constants';

const FALLBACK_HOST = '192.168.0.39';
const FALLBACK_PORT = '5001';

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const debuggerHost = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:${FALLBACK_PORT}/api`;
  }

  return `http://${FALLBACK_HOST}:${FALLBACK_PORT}/api`;
};

export const API_BASE_URL = getBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
