import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface BengaliTextProps extends TextProps {
  variant?:
    | 'display'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'body'
    | 'bodyBold'
    | 'caption'
    | 'label'
    | 'currency';
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: '400' | '500' | '600' | '700' | '800';
}

export const BengaliText: React.FC<BengaliTextProps> = ({
  variant = 'body',
  color,
  align = 'left',
  weight,
  style,
  children,
  ...props
}) => {
  const { colors } = useTheme();

  const textColor = color || colors.text;

  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        {
          color: textColor,
          textAlign: align,
          ...(weight ? { fontWeight: weight } : {}),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    includeFontPadding: false,
    letterSpacing: 0.15,
  },
  display: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  h4: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  currency: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
});
