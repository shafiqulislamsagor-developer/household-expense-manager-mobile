import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: any;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'সমস্যা দেখা দিয়েছে',
  message,
  onRetry,
  style,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#3B1515' : '#FEF2F2',
          borderColor: isDark ? '#7F1D1D' : '#FECACA',
        },
        style,
      ]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle" size={32} color={colors.danger} />
      </View>

      <BengaliText
        variant="h3"
        color={colors.danger}
        align="center"
        weight="700"
        style={styles.title}
      >
        {title}
      </BengaliText>

      <BengaliText
        variant="body"
        color={isDark ? '#FECACA' : '#991B1B'}
        align="center"
        style={styles.message}
      >
        {message}
      </BengaliText>

      {onRetry && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRetry}
          style={[styles.retryBtn, { backgroundColor: colors.danger }]}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <BengaliText variant="bodyBold" color="#FFFFFF">
            আবার চেষ্টা করুন
          </BengaliText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    marginBottom: 6,
    fontSize: 16,
  },
  message: {
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 290,
    fontSize: 13,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
});
