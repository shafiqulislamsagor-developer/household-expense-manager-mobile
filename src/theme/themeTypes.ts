import { TextStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Brand & Identity Tokens (FINTECH SPEC)
  primary: string;         // Light: #173B67 | Dark: #6B9FE8
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;

  secondary: string;       // Light: #0F9D78 | Dark: #34C99A
  secondaryLight: string;

  accent: string;          // Light: #F4A340 | Dark: #F5B95F
  accentDark: string;
  accentLight: string;

  // Background & Surfaces
  background: string;      // Light: #F5F7FB | Dark: #0B1220
  backgroundSecondary: string;
  surface: string;         // Light: #FFFFFF | Dark: #151F30
  surfaceElevated: string; // Light: #FFFFFF | Dark: #1C293B
  surfaceSubdued: string;
  surfaceHighlight: string;

  // Borders & Dividers
  border: string;          // Light: #E4EAF1 | Dark: #29374A
  borderLight: string;
  borderStrong: string;
  divider: string;         // Light: #E8EDF3 | Dark: #263447

  // Text Tokens
  text: string;            // Light: #172B4D | Dark: #F1F5F9 (Primary Text)
  textPrimary: string;     // Alias to text for strict compliance
  textSecondary: string;   // Light: #526174 | Dark: #AAB8CA
  textMuted: string;       // Light: #8492A6 | Dark: #8090A5
  textLight: string;
  textInverse: string;

  // Status & Financial Feedback Colors
  success: string;         // Light: #16A36A | Dark: #34C99A (Income / Receivable)
  successLight: string;
  successDark: string;

  error: string;           // Light: #E05252 | Dark: #FF7373 (Expense / Payable)
  danger: string;          // Alias to error for backward compatibility
  dangerLight: string;
  dangerDark: string;

  warning: string;         // Light: #E9A23B | Dark: #F5B95F (Pending)
  warningLight: string;
  warningDark: string;

  info: string;            // Light: #3979C9 | Dark: #75A8EF (Information)
  infoLight: string;
  infoDark: string;

  neutral: string;         // #64748B

  // Hero Card Gradient/Mesh
  heroBackground: string;
  heroText: string;
  heroTextMuted: string;
  heroAccent: string;

  // Tab & Navigation
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Overlays
  overlay: string;
}

export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
}
