import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';
import { MoneyUtil } from '../../utils/money';

export interface BalanceCardProps {
  balancePaisa: number; // positive = receivable, negative = payable, 0 = settled
  title?: string;
  onActionPress?: () => void;
  actionTitle?: string;
  style?: ViewStyle;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balancePaisa,
  title = 'বর্তমান ব্যালেন্সের অবস্থা',
  onActionPress,
  actionTitle,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const isReceivable = balancePaisa > 0;
  const isPayable = balancePaisa < 0;

  const cardBorderColor = isReceivable
    ? colors.success
    : isPayable
    ? colors.danger
    : isDark
    ? colors.borderStrong
    : colors.border;

  const statusBg = isReceivable
    ? isDark ? '#05966915' : '#ECFDF5'
    : isPayable
    ? isDark ? '#DC262615' : '#FEF2F2'
    : isDark ? colors.surfaceSubdued : colors.secondaryLight;

  const statusColor = isReceivable
    ? colors.success
    : isPayable
    ? colors.danger
    : colors.textMuted;

  const statusText = isReceivable
    ? 'আপনি মেসের ফান্ড বা সদস্যদের থেকে পাবেন'
    : isPayable
    ? 'আপনাকে মেসের ফান্ডে পরিশোধ করতে হবে'
    : 'আপনার কোনো দেনা বা পাওনা নেই (হিসাব শূন্য)';

  const iconName: any = isReceivable
    ? 'arrow-down-circle-outline'
    : isPayable
    ? 'arrow-up-circle-outline'
    : 'checkmark-circle-outline';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: cardBorderColor,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBadge}>
          <BengaliText variant="caption" color={colors.textLight} weight="600">
            {title}
          </BengaliText>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: statusBg }]}>
          <Ionicons name={iconName} size={20} color={statusColor} />
        </View>
      </View>

      <View style={styles.amountRow}>
        <BengaliText
          variant="display"
          weight="800"
          color={statusColor}
        >
          {isPayable ? '-' : isReceivable ? '+' : ''}
          {MoneyUtil.formatBengaliCurrency(Math.abs(balancePaisa))}
        </BengaliText>
      </View>

      <View style={[styles.statusBanner, { backgroundColor: statusBg }]}>
        <BengaliText variant="caption" color={statusColor} weight="600">
          {statusText}
        </BengaliText>
      </View>

      {onActionPress && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onActionPress}
          style={[styles.actionBtn, { borderColor: statusColor }]}
        >
          <BengaliText variant="caption" color={statusColor} weight="700">
            {actionTitle || (isPayable ? 'পরিশোধ সম্পন্ন করুন' : 'সেটেলমেন্ট দেখুন')}
          </BengaliText>
          <Ionicons name="arrow-forward" size={14} color={statusColor} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountRow: {
    marginVertical: 10,
  },
  statusBanner: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 12,
  },
});
