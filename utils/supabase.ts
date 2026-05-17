import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  '';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (AppState.currentState !== 'active') {
      console.log('[Supabase] SecureStore.getItem skipped — app not active');
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.log('[Supabase] SecureStore.getItem error', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (AppState.currentState !== 'active') {
      console.log('[Supabase] SecureStore.setItem skipped — app not active');
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.log('[Supabase] SecureStore.setItem error', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (AppState.currentState !== 'active') {
      console.log('[Supabase] SecureStore.removeItem skipped — app not active');
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.log('[Supabase] SecureStore.removeItem error', e);
    }
  },
};

// Web: use localStorage; Native: use SecureStore
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : ExpoSecureStoreAdapter;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
