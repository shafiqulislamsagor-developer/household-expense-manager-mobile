import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from './BengaliText';
import { MoneyUtil } from '../utils/money';
import { useTheme } from '../theme/ThemeContext';

export interface TransactionItemProps {
  title: string;
  category?: string;
  date: string;
  amountPaisa: number;
  type: 'EXPENSE' | 'INCOME' | 'SETTLEMENT' | 'REQUEST';
  status?: string;
  subtitle?: string;
  isLocked?: boolean;
  lockedReason?: string;
  paidFromFund?: boolean;
  paidByName?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  title,
  category,
  date,
  amountPaisa,
  type,
  status,
  subtitle,
  isLocked = false,
  lockedReason = 'এই মাসের হিসাব ইতিমধ্যে ক্লোজ করা হয়েছে, পরিবর্তন বা ডিলিট করা সম্ভব নয়।',
  paidFromFund,
  paidByName,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();

  const isIncome = type === 'INCOME';
  const isExpense = type === 'EXPENSE';
  const isRequest = type === 'REQUEST';

  const iconName: keyof typeof Ionicons.glyphMap = isIncome
    ? 'arrow-down-circle'
    : isExpense
    ? 'arrow-up-circle'
    : isRequest
    ? 'time-outline'
    : 'swap-horizontal';

  const iconColor = isIncome
    ? colors.accent
    : isExpense
    ? colors.danger
    : isRequest
    ? colors.warning
    : colors.primary;

  const displayDate = date.includes('T') ? date.split('T')[0] : date;

  const handleEditPress = () => {
    if (isLocked) {
      Alert.alert('হিসাব লক করা', lockedReason);
      return;
    }
    if (onEdit) onEdit();
  };

  const handleDeletePress = () => {
    if (isLocked) {
      Alert.alert('হিসাব লক করা', lockedReason);
      return;
    }
    if (onDelete) onDelete();
  };

  const getStatusBadgeConfig = () => {
    if (status === 'APPROVED') {
      return { text: 'অনুমোদিত', bg: isDark ? '#064E3B' : '#ECFDF5', color: isDark ? '#34D399' : '#059669' };
    }
    if (status === 'REJECTED') {
      return { text: 'বাতিল', bg: isDark ? '#7F1D1D' : '#FEF2F2', color: isDark ? '#F87171' : '#DC2626' };
    }
    if (status === 'PENDING') {
      return { text: 'অপেক্ষমান', bg: isDark ? '#78350F' : '#FFFBEB', color: isDark ? '#FBBF24' : '#D97706' };
    }
    return null;
  };

  const statusBadge = getStatusBadgeConfig();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
          borderLeftColor: isIncome ? colors.accent : isExpense ? colors.danger : colors.primary,
        },
        isLocked && {
          backgroundColor: isDark ? colors.surfaceSubdued : '#F8FAFC',
          opacity: 0.92,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? `${iconColor}22` : `${iconColor}14`,
          },
        ]}
      >
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>

      <View style={styles.details}>
        <View style={styles.titleRow}>
          <BengaliText
            variant="bodyBold"
            color={colors.text}
            numberOfLines={1}
            style={styles.titleText}
          >
            {title}
          </BengaliText>

          {isLocked && (
            <View
              style={[
                styles.lockedBadge,
                {
                  backgroundColor: isDark ? '#374151' : '#FEF3C7',
                  borderColor: isDark ? '#6B7280' : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="lock-closed" size={10} color={isDark ? '#E5E7EB' : '#B45309'} />
              <BengaliText
                variant="caption"
                color={isDark ? '#E5E7EB' : '#B45309'}
                style={styles.lockedText}
              >
                লকড
              </BengaliText>
            </View>
          )}

          {statusBadge && (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <BengaliText
                variant="caption"
                color={statusBadge.color}
                style={styles.statusText}
              >
                {statusBadge.text}
              </BengaliText>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <BengaliText variant="caption" color={colors.textMuted} style={styles.dateText}>
            {MoneyUtil.toBengaliNumber(displayDate)}
          </BengaliText>

          {category && (
            <View
              style={[
                styles.categoryTag,
                {
                  backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={colors.textSecondary}
                style={styles.categoryText}
              >
                {category}
              </BengaliText>
            </View>
          )}

          {paidFromFund !== undefined && (
            <View
              style={[
                styles.fundTag,
                {
                  backgroundColor: paidFromFund
                    ? isDark ? '#0C4A6E' : '#E0F2FE'
                    : isDark ? '#312E81' : '#EEF2FF',
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={paidFromFund ? colors.info : '#6366F1'}
                style={styles.fundText}
              >
                {paidFromFund ? 'ফান্ড' : paidByName || 'নিজস্ব'}
              </BengaliText>
            </View>
          )}
        </View>

        {subtitle && (
          <BengaliText variant="caption" color={colors.textLight} numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </BengaliText>
        )}
      </View>

      <View style={styles.rightSection}>
        <BengaliText
          variant="h3"
          color={isIncome ? colors.accent : isExpense ? colors.danger : colors.text}
          weight="700"
          style={styles.amountText}
        >
          {isIncome ? '+' : isExpense ? '-' : ''}
          {MoneyUtil.formatBengaliCurrency(amountPaisa)}
        </BengaliText>

        {(onEdit || onDelete) && (
          <View style={styles.actionsRow}>
            {onEdit && (
              <TouchableOpacity
                onPress={handleEditPress}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                  },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name={isLocked ? 'lock-closed-outline' : 'create-outline'}
                  size={14}
                  color={isLocked ? colors.textLight : colors.primary}
                />
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                onPress={handleDeletePress}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isDark ? '#3B1515' : '#FEF2F2',
                  },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name={isLocked ? 'lock-closed-outline' : 'trash-outline'}
                  size={14}
                  color={isLocked ? colors.textLight : colors.danger}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    borderLeftWidth: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    flex: 1,
    fontSize: 14,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    marginLeft: 6,
  },
  lockedText: {
    fontSize: 9.5,
    marginLeft: 2,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  dateText: {
    fontSize: 11.5,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fundTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  fundText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
