import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export type StatusType =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'FUND_PAID'
  | 'OUT_OF_POCKET';

export interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'APPROVED':
      case 'VERIFIED':
      case 'ACTIVE':
        return {
          label: status === 'ACTIVE' ? 'সক্রিয়' : status === 'VERIFIED' ? 'যাচাইকৃত' : 'অনুমোদিত',
          icon: 'checkmark-circle' as const,
          bg: isDark ? '#064E3B' : '#ECFDF5',
          border: isDark ? '#059669' : '#A7F3D0',
          text: isDark ? '#34D399' : '#059669',
        };
      case 'PENDING':
        return {
          label: 'অপেক্ষমান',
          icon: 'time' as const,
          bg: isDark ? '#78350F' : '#FFFBEB',
          border: isDark ? '#D97706' : '#FDE68A',
          text: isDark ? '#FBBF24' : '#D97706',
        };
      case 'REJECTED':
      case 'INACTIVE':
        return {
          label: status === 'INACTIVE' ? 'নিষ্ক্রিয়' : 'বাতিল',
          icon: 'close-circle' as const,
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
          border: isDark ? '#DC2626' : '#FECACA',
          text: isDark ? '#F87171' : '#DC2626',
        };
      case 'CLOSED':
        return {
          label: 'হিসাব বন্ধ',
          icon: 'lock-closed' as const,
          bg: isDark ? '#374151' : '#F1F5F9',
          border: isDark ? '#6B7280' : '#CBD5E1',
          text: isDark ? '#E5E7EB' : '#475569',
        };
      case 'FUND_PAID':
        return {
          label: 'কমন ফান্ড',
          icon: 'wallet' as const,
          bg: isDark ? '#0C4A6E' : '#F0F9FF',
          border: isDark ? '#0284C7' : '#BAE6FD',
          text: isDark ? '#38BDF8' : '#0284C7',
        };
      case 'OUT_OF_POCKET':
        return {
          label: 'সদস্যের পকেট',
          icon: 'person' as const,
          bg: isDark ? '#312E81' : '#EEF2FF',
          border: isDark ? '#6366F1' : '#C7D2FE',
          text: isDark ? '#A5B4FC' : '#4F46E5',
        };
      default:
        return {
          label: status,
          icon: 'ellipse' as const,
          bg: isDark ? colors.surfaceSubdued : colors.secondaryLight,
          border: colors.border,
          text: colors.textSecondary,
        };
    }
  };

  const cfg = getStatusConfig();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingVertical: isSm ? 2.5 : 4,
          paddingHorizontal: isSm ? 7 : 10,
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={cfg.icon}
          size={isSm ? 11 : 13}
          color={cfg.text}
          style={{ marginRight: 4 }}
        />
      )}
      <BengaliText
        variant="caption"
        color={cfg.text}
        style={[
          styles.text,
          { fontSize: isSm ? 10.5 : 12 },
        ]}
      >
        {cfg.label}
      </BengaliText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    lineHeight: 15,
  },
});
