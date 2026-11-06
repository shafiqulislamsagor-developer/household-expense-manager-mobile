import { Platform } from 'react-native';

const getDevApiUrl = () => {
  // If set in environment:
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Default production fallback
  return 'https://household-expense-manager-backend.vercel.app/api/v1';
};

export const API_BASE_URL = getDevApiUrl();

export const COLORS = {
  primary: '#0F2942', // Deep Midnight Navy
  primaryDark: '#0A1C2E',
  primaryLight: '#EBF3FA',
  secondary: '#1E293B', // Slate 800
  accent: '#059669', // Emerald 600
  danger: '#DC2626', // Red 600
  warning: '#D97706', // Amber 600
  success: '#059669', // Emerald 600
  background: '#F8FAFC', // Slate 50 Neutral Canvas
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
};
