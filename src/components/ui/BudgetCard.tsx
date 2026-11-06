import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

export interface BudgetCardProps {
  title?: string;
  budgetPaisa: number;
  spentPaisa: number;
  onEditBudget?: () => void;
  style?: any;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  title = 'মাসিক বাজেট ও খরচ',
  budgetPaisa,
  spentPaisa,
  onEditBudget,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const hasBudget = budgetPaisa > 0;
  const percentage = hasBudget ? Math.round((spentPaisa / budgetPaisa) * 100) : 0;
  const remainingPaisa = Math.max(0, budgetPaisa - spentPaisa);
  const isOverBudget = spentPaisa > budgetPaisa;
  const isNearBudget = percentage >= 80 && !isOverBudget;

  const getStatusColor = () => {
    if (isOverBudget) return colors.danger;
    if (isNearBudget) return colors.warning;
    return colors.accent;
  };

  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Ionicons name="speedometer-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <BengaliText variant="h3" color={colors.text} weight="700">
            {title}
          </BengaliText>
        </View>

        {onEditBudget && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditBudget}
            style={[
              styles.editBtn,
              {
                backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
              },
            ]}
          >
            <Ionicons name="create-outline" size={14} color={colors.primary} />
            <BengaliText
              variant="caption"
              color={colors.primary}
              weight="700"
              style={{ marginLeft: 4, fontSize: 11.5 }}
            >
              {hasBudget ? 'বাজেট পরিবর্তন' : 'বাজেট সেট করুন'}
            </BengaliText>
          </TouchableOpacity>
        )}
      </View>

      {hasBudget ? (
        <>
          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, percentage)}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>

          {/* Details Row */}
          <View style={styles.detailsRow}>
            <View>
              <BengaliText variant="caption" color={colors.textMuted}>
                খরচ হয়েছে
              </BengaliText>
              <BengaliText variant="bodyBold" color={statusColor}>
                {MoneyUtil.formatBengaliCurrency(spentPaisa)} ({MoneyUtil.toBengaliNumber(percentage)}%)
              </BengaliText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <BengaliText variant="caption" color={colors.textMuted}>
                {isOverBudget ? 'অতিরিক্ত খরচ' : 'অবশিষ্ট বাজেট'}
              </BengaliText>
              <BengaliText
                variant="bodyBold"
                color={isOverBudget ? colors.danger : colors.accent}
              >
                {MoneyUtil.formatBengaliCurrency(
                  isOverBudget ? spentPaisa - budgetPaisa : remainingPaisa
                )}
              </BengaliText>
            </View>
          </View>

          {/* Alerts */}
          {isOverBudget ? (
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: isDark ? '#3B1515' : '#FEF2F2',
                  borderColor: isDark ? '#7F1D1D' : '#FECACA',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <BengaliText variant="caption" color={colors.danger} weight="600">
                সতর্কতা: নির্ধারিত মাসিক বাজেট অতিক্রম করেছে!
              </BengaliText>
            </View>
          ) : isNearBudget ? (
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: isDark ? '#3B2406' : '#FFFBEB',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="warning" size={16} color={colors.warning} style={{ marginRight: 6 }} />
              <BengaliText variant="caption" color={colors.warning} weight="600">
                সতর্কতা: বাজেটের ৮০% এর বেশি খরচ হয়ে গেছে।
              </BengaliText>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyBudgetBox}>
          <BengaliText variant="body" color={colors.textMuted} align="center">
            এই মাসের কোনো বাজেট নির্ধারণ করা হয়নি। বাজেট সেট করে খরচ নিয়ন্ত্রণে রাখুন।
          </BengaliText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  progressTrack: {
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4.5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyBudgetBox: {
    paddingVertical: 10,
  },
});
