import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import {
  LIGHT_THEME,
  DARK_THEME,
  ThemeColors,
  ThemeMode,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  ANIMATION,
} from './tokens';
import { AuthStorage } from '../services/authStorage';

export interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  typography: typeof TYPOGRAPHY;
  shadows: typeof SHADOWS;
  animation: typeof ANIMATION;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;
    async function loadTheme() {
      try {
        const saved = await AuthStorage.getThemeMode();
        if (isMounted && saved) {
          setThemeModeState(saved);
        }
      } catch {
        // Fallback to system default
      }
    }
    loadTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AuthStorage.setThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [themeMode, setThemeMode]);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? DARK_THEME : LIGHT_THEME;
  }, [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      spacing: SPACING,
      radius: RADIUS,
      typography: TYPOGRAPHY,
      shadows: SHADOWS,
      animation: ANIMATION,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeMode: 'light',
      isDark: false,
      colors: LIGHT_THEME,
      spacing: SPACING,
      radius: RADIUS,
      typography: TYPOGRAPHY,
      shadows: SHADOWS,
      animation: ANIMATION,
      setThemeMode: async () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};
