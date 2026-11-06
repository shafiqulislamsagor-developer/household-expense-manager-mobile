import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

export interface FinancialSummaryCardProps {
  title: string;
  amountPaisa: number;
  customValue?: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'hero' | 'income' | 'expense' | 'balance' | 'default';
  onPress?: () => void;
  trend?: {
    percentage: number;
    isUp: boolean;
    text?: string;
  };
  style?: ViewStyle;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  title,
  amountPaisa,
  customValue,
  subtitle,
  icon,
  variant = 'default',
  onPress,
  trend,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const isHero = variant === 'hero';

  const getThemeConfig = () => {
    switch (variant) {
      case 'hero':
        return {
          bg: isDark ? '#111C2D' : '#0F2942',
          border: isDark ? '#1E3A5F' : '#173D63',
          titleColor: '#93C5FD',
          amountColor: '#FFFFFF',
          iconBg: 'rgba(52, 211, 153, 0.15)',
          iconColor: '#34D399',
          subtitleBg: 'rgba(255, 255, 255, 0.12)',
          subtitleColor: '#A7F3D0',
        };
      case 'income':
        return {
          bg: isDark ? colors.surface : '#FFFFFF',
          border: isDark ? colors.borderStrong : colors.border,
          titleColor: colors.textMuted,
          amountColor: colors.accent,
          iconBg: isDark ? `${colors.accent}25` : `${colors.accent}14`,
          iconColor: colors.accent,
          subtitleBg: isDark ? `${colors.accent}20` : colors.accentLight,
          subtitleColor: colors.accent,
        };
      case 'expense':
        return {
          bg: isDark ? colors.surface : '#FFFFFF',
          border: isDark ? colors.borderStrong : colors.border,
          titleColor: colors.textMuted,
          amountColor: colors.danger,
          iconBg: isDark ? `${colors.danger}25` : `${colors.danger}14`,
          iconColor: colors.danger,
          subtitleBg: isDark ? `${colors.danger}20` : colors.dangerLight,
          subtitleColor: colors.danger,
        };
      case 'balance':
        const isPositive = amountPaisa >= 0;
        const color = isPositive ? colors.accent : colors.danger;
        return {
          bg: isDark ? colors.surface : '#FFFFFF',
          border: isDark ? colors.borderStrong : colors.border,
          titleColor: colors.textMuted,
          amountColor: color,
          iconBg: isDark ? `${color}25` : `${color}14`,
          iconColor: color,
          subtitleBg: isDark ? `${color}20` : `${color}12`,
          subtitleColor: color,
        };
      case 'default':
      default:
        return {
          bg: isDark ? colors.surface : '#FFFFFF',
          border: isDark ? colors.borderStrong : colors.border,
          titleColor: colors.textMuted,
          amountColor: colors.text,
          iconBg: isDark ? `${colors.primary}25` : `${colors.primary}12`,
          iconColor: colors.primary,
          subtitleBg: isDark ? colors.surfaceSubdued : colors.backgroundSecondary,
          subtitleColor: colors.textSecondary,
        };
    }
  };

  const cfg = getThemeConfig();

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
        isHero ? styles.heroCard : styles.standardCard,
        style,
      ]}
    >
      {/* Decorative top accent for hero */}
      {isHero && <View style={styles.heroGlowAccent} />}

      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <BengaliText
            variant="caption"
            color={cfg.titleColor}
            weight="600"
            numberOfLines={1}
            style={styles.titleText}
          >
            {title}
          </BengaliText>
        </View>

        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: cfg.iconBg,
              width: isHero ? 38 : 34,
              height: isHero ? 38 : 34,
              borderRadius: isHero ? 11 : 9,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={isHero ? 20 : 18}
            color={cfg.iconColor}
          />
        </View>
      </View>

      {/* Main Monetary Figure */}
      <BengaliText
        variant={isHero ? 'display' : 'h2'}
        color={cfg.amountColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.amountText,
          isHero && styles.heroAmountText,
        ]}
      >
        {customValue ?? MoneyUtil.formatBengaliCurrency(amountPaisa)}
      </BengaliText>

      {/* Subtitle / Trend Badge */}
      {(subtitle || trend) && (
        <View style={styles.bottomRow}>
          {subtitle ? (
            <View
              style={[
                styles.subtitleBadge,
                {
                  backgroundColor: cfg.subtitleBg,
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={cfg.subtitleColor}
                weight="600"
                numberOfLines={1}
                style={styles.subtitleText}
              >
                {subtitle}
              </BengaliText>
            </View>
          ) : null}

          {trend && (
            <View style={styles.trendRow}>
              <Ionicons
                name={trend.isUp ? 'trending-up' : 'trending-down'}
                size={14}
                color={trend.isUp ? colors.accent : colors.danger}
              />
              <BengaliText
                variant="caption"
                color={trend.isUp ? colors.accent : colors.danger}
                weight="700"
                style={{ marginLeft: 3 }}
              >
                {MoneyUtil.toBengaliNumber(trend.percentage)}% {trend.text || ''}
              </BengaliText>
            </View>
          )}
        </View>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCard: {
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  standardCard: {
    minHeight: 126,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  heroGlowAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#34D399',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleArea: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontWeight: '800',
    marginVertical: 4,
    letterSpacing: 0.3,
  },
  heroAmountText: {
    fontSize: 28,
    lineHeight: 36,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subtitleBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  subtitleText: {
    fontSize: 11,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
