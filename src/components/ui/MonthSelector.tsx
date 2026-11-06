import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { isTransactionMonthClosed } from '../../utils/closedMonth';
import { useTheme } from '../../theme/ThemeContext';

export interface MonthSelectorProps {
  selectedYear: number;
  selectedMonth: number; // 1-12
  onSelectYearMonth: (year: number, month: number) => void;
  closedMonths?: Array<{ year: number; month: number }>;
  showAllOption?: boolean;
  isAllSelected?: boolean;
  onSelectAll?: () => void;
  style?: any;
}

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedYear,
  selectedMonth,
  onSelectYearMonth,
  closedMonths = [],
  showAllOption = false,
  isAllSelected = false,
  onSelectAll,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onSelectYearMonth(selectedYear - 1, 12);
    } else {
      onSelectYearMonth(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onSelectYearMonth(selectedYear + 1, 1);
    } else {
      onSelectYearMonth(selectedYear, selectedMonth + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onSelectYearMonth(now.getFullYear(), now.getMonth() + 1);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);
  };

  const isClosed = isTransactionMonthClosed(
    `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
    closedMonths
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.navRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePrevMonth}
          style={[
            styles.arrowBtn,
            {
              backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCurrentMonth}
          style={styles.labelContainer}
        >
          <View style={styles.monthTitleRow}>
            <BengaliText variant="h3" color={colors.text} weight="700">
              {BENGALI_MONTHS[selectedMonth - 1]} {MoneyUtil.toBengaliNumber(selectedYear)}
            </BengaliText>
            {isClosed ? (
              <View
                style={[
                  styles.closedBadge,
                  {
                    backgroundColor: isDark ? '#374151' : '#F1F5F9',
                    borderColor: isDark ? '#6B7280' : '#CBD5E1',
                  },
                ]}
              >
                <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                <BengaliText
                  variant="caption"
                  color={colors.textMuted}
                  weight="700"
                  style={{ fontSize: 10, marginLeft: 3 }}
                >
                  ক্লোজড
                </BengaliText>
              </View>
            ) : isCurrentMonth() ? (
              <View style={[styles.currentBadge, { backgroundColor: colors.accentLight }]}>
                <BengaliText
                  variant="caption"
                  color={colors.accent}
                  weight="700"
                  style={{ fontSize: 10 }}
                >
                  বর্তমান
                </BengaliText>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNextMonth}
          style={[
            styles.arrowBtn,
            {
              backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {showAllOption && onSelectAll && (
        <View style={styles.allRow}>
          <TouchableOpacity
            onPress={onSelectAll}
            style={[
              styles.allChip,
              {
                backgroundColor: isAllSelected ? colors.primary : isDark ? colors.surfaceSubdued : colors.secondaryLight,
              },
            ]}
          >
            <BengaliText
              variant="caption"
              color={isAllSelected ? '#FFFFFF' : colors.textSecondary}
              weight="700"
            >
              সব মাসের হিসাব দেখুন
            </BengaliText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  currentBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  allRow: {
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  allChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
