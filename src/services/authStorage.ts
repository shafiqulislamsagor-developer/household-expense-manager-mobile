import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'household_access_token';
const REFRESH_TOKEN_KEY = 'household_refresh_token';
const APP_PIN_KEY = 'household_app_lock_pin';
const USER_INFO_KEY = 'household_cached_user';

export class AuthStorage {
  public static async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  public static async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public static async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public static async clearTokens(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_INFO_KEY);
    } catch {
      // ignore
    }
  }

  public static async setAppPin(pin: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(APP_PIN_KEY, pin);
      return;
    }
    await SecureStore.setItemAsync(APP_PIN_KEY, pin);
  }

  public static async getAppPin(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(APP_PIN_KEY);
    }
    try {
      return await SecureStore.getItemAsync(APP_PIN_KEY);
    } catch {
      return null;
    }
  }

  public static async removeAppPin(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(APP_PIN_KEY);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(APP_PIN_KEY);
    } catch {
      // ignore
    }
  }

  public static async setUserInfo(user: any): Promise<void> {
    const json = JSON.stringify(user);
    if (Platform.OS === 'web') {
      localStorage.setItem(USER_INFO_KEY, json);
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, json);
  }

  public static async getUserInfo(): Promise<any | null> {
    try {
      const val =
        Platform.OS === 'web'
          ? localStorage.getItem(USER_INFO_KEY)
          : await SecureStore.getItemAsync(USER_INFO_KEY);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  public static async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem('household_theme_mode', mode);
      return;
    }
    try {
      await SecureStore.setItemAsync('household_theme_mode', mode);
    } catch {
      // ignore
    }
  }

  public static async getThemeMode(): Promise<'light' | 'dark' | 'system' | null> {
    try {
      const val =
        Platform.OS === 'web'
          ? localStorage.getItem('household_theme_mode')
          : await SecureStore.getItemAsync('household_theme_mode');
      if (val === 'light' || val === 'dark' || val === 'system') {
        return val;
      }
      return null;
    } catch {
      return null;
    }
  }
}

