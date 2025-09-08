import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth } from './firebase';

// Auto-pick localhost for sim/emulator; allow override via Expo extra
const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEFAULT_BASE = `http://${LOCALHOST}:4000`;

const BASE_URL =
  Constants?.expoConfig?.extra?.API_BASE ||
  Constants?.manifest?.extra?.API_BASE || // older Expo
  DEFAULT_BASE;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Attach Firebase ID token when signed in
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
