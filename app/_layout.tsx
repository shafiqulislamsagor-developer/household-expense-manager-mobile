import '../src/utils/cryptoPolyfill';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Provider, useDispatch } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, AppDispatch } from '../src/store';
import { setAuth, setLocked, setLoading, logout } from '../src/store/authSlice';
import { setSyncStatus } from '../src/store/syncSlice';
import { AuthStorage } from '../src/services/authStorage';
import { LocalDbService } from '../src/database/sqlite';
import { SyncEngine } from '../src/sync/syncEngine';
import { ApiClient } from '../src/services/apiClient';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize SQLite database
        await LocalDbService.init();

        // Check authentication & app lock
        const token = await AuthStorage.getAccessToken();
        const user = await AuthStorage.getUserInfo();
        const pin = await AuthStorage.getAppPin();

        if (token && user) {
          dispatch(
            setAuth({
              user,
              token,
              hasPin: !!pin,
            })
          );

          if (pin) {
            dispatch(setLocked(true));
          }
        }

        // Initialize offline-to-online sync engine
        await SyncEngine.init();

        // Subscribe to sync status updates
        SyncEngine.subscribe((status, pendingCount) => {
          dispatch(setSyncStatus({ status, pendingCount }));
        });
      } catch (e) {
        console.error('App preparation error:', e);
      } finally {
        dispatch(setLoading(false));
        setIsReady(true);
      }
    }

    ApiClient.setOnUnauthorized(() => {
      dispatch(logout());
    });

    prepare();

    return () => {
      SyncEngine.destroy();
    };
  }, [dispatch]);

  if (!isReady) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <AppInitializer>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="lock" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="super-admin/index"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
            </AppInitializer>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
