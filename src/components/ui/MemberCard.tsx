import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { BengaliText } from '../BengaliText';
import { ProfileAvatar } from './ProfileAvatar';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '../../theme/ThemeContext';
import { MoneyUtil } from '../../utils/money';

export interface MemberCardProps {
  id: string;
  name: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'HOME_ADMIN' | 'HOME_USER';
  balancePaisa?: number; // positive = receivable (gets back), negative = payable (owes)
  isActive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  name,
  phone,
  role,
  balancePaisa,
  isActive = true,
  onPress,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const isReceivable = (balancePaisa ?? 0) > 0;
  const isPayable = (balancePaisa ?? 0) < 0;
  const isSettled = balancePaisa === 0;

  const roleLabel =
    role === 'SUPER_ADMIN'
      ? 'সুপার অ্যাডমিন'
      : role === 'HOME_ADMIN'
      ? 'অ্যাডমিন'
      : 'সদস্য';

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <ProfileAvatar name={name} role={role} size="md" isActive={isActive} />

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <BengaliText variant="bodyBold" color={colors.text} numberOfLines={1}>
              {name}
            </BengaliText>
            {!isActive && (
              <StatusBadge status="INACTIVE" style={{ marginLeft: 6 }} />
            )}
          </View>

          <View style={styles.metaRow}>
            <BengaliText variant="caption" color={colors.textMuted}>
              {phone}
            </BengaliText>
            <View style={[styles.dot, { backgroundColor: colors.borderStrong }]} />
            <BengaliText
              variant="caption"
              color={role === 'HOME_ADMIN' ? colors.primary : colors.textLight}
              weight="600"
            >
              {roleLabel}
            </BengaliText>
          </View>
        </View>

        {balancePaisa !== undefined && (
          <View style={styles.balanceCol}>
            {isReceivable && (
              <>
                <BengaliText variant="caption" color={colors.success} weight="700">
                  পাবেন
                </BengaliText>
                <BengaliText variant="bodyBold" color={colors.success}>
                  +{MoneyUtil.formatBengaliCurrency(balancePaisa)}
                </BengaliText>
              </>
            )}
            {isPayable && (
              <>
                <BengaliText variant="caption" color={colors.danger} weight="700">
                  দিতে হবে
                </BengaliText>
                <BengaliText variant="bodyBold" color={colors.danger}>
                  -{MoneyUtil.formatBengaliCurrency(Math.abs(balancePaisa))}
                </BengaliText>
              </>
            )}
            {isSettled && (
              <>
                <BengaliText variant="caption" color={colors.textLight} weight="600">
                  হিসাব
                </BengaliText>
                <BengaliText variant="bodyBold" color={colors.textLight}>
                  ০ ৳
                </BengaliText>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 6,
  },
  balanceCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
});
