import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from './BengaliText';
import { MoneyUtil } from '../utils/money';
import { useTheme } from '../theme/ThemeContext';

export interface MetricCardProps {
  title: string;
  amountPaisa?: number;
  customDisplayValue?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  isHero?: boolean;
  onPress?: () => void;
  style?: any;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  amountPaisa = 0,
  customDisplayValue,
  icon,
  color,
  subtitle,
  isHero = false,
  onPress,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const activeColor = color || colors.primary;
  const isPositive = amountPaisa > 0;
  const isNegative = amountPaisa < 0;

  const valueColor = isHero
    ? '#34D399'
    : isNegative
    ? colors.danger
    : isPositive
    ? activeColor
    : colors.text;

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: isHero
            ? isDark ? '#111C2D' : '#0F2942'
            : isDark ? colors.surface : colors.surface,
          borderColor: isHero
            ? isDark ? '#1E3A5F' : '#173D63'
            : isDark ? colors.borderStrong : colors.border,
        },
        isHero ? styles.heroCard : styles.normalCard,
        style,
      ]}
    >
      {/* Top Accent for normal cards */}
      {!isHero && <View style={[styles.accentStrip, { backgroundColor: activeColor }]} />}

      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <BengaliText
            variant="caption"
            color={isHero ? '#93C5FD' : colors.textMuted}
            style={[styles.titleText, isHero && styles.heroTitleText]}
            numberOfLines={1}
            weight="600"
          >
            {title}
          </BengaliText>

          <View
            style={[
              styles.iconWrapper,
              isHero
                ? styles.heroIconWrapper
                : {
                    backgroundColor: isDark ? `${activeColor}25` : `${activeColor}14`,
                    borderColor: `${activeColor}28`,
                  },
            ]}
          >
            <Ionicons
              name={icon}
              size={isHero ? 20 : 17}
              color={isHero ? '#34D399' : activeColor}
            />
          </View>
        </View>

        <BengaliText
          variant={isHero ? 'h1' : 'h2'}
          color={valueColor}
          style={[styles.amount, isHero && styles.heroAmount]}
          numberOfLines={1}
          adjustsFontSizeToFit
          weight="800"
        >
          {customDisplayValue ?? MoneyUtil.formatBengaliCurrency(amountPaisa)}
        </BengaliText>

        {subtitle ? (
          <View
            style={[
              styles.subtitleBadge,
              {
                backgroundColor: isHero
                  ? 'rgba(255, 255, 255, 0.12)'
                  : isDark ? colors.surfaceSubdued : colors.secondaryLight,
              },
            ]}
          >
            <BengaliText
              variant="caption"
              color={isHero ? '#A7F3D0' : colors.textMuted}
              numberOfLines={1}
              style={{ fontSize: 11, fontWeight: '600' }}
            >
              {subtitle}
            </BengaliText>
          </View>
        ) : null}
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1.2,
  },
  heroCard: {
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  normalCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  accentStrip: {
    height: 3,
    width: '100%',
  },
  contentContainer: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleText: {
    fontSize: 12,
    flex: 1,
    marginRight: 6,
  },
  heroTitleText: {
    fontSize: 13,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroIconWrapper: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  amount: {
    fontSize: 17,
    marginVertical: 4,
  },
  heroAmount: {
    fontSize: 24,
    lineHeight: 32,
  },
  subtitleBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
});
