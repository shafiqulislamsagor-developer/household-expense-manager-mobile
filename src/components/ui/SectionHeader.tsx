import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  actionText?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  count,
  actionText,
  actionIcon,
  onActionPress,
  style,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Left Column: Title + Count Badge, with Subtitle underneath */}
      <View style={styles.leftCol}>
        <View style={styles.titleAndCountRow}>
          <BengaliText
            variant="h3"
            color={colors.text}
            weight="700"
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </BengaliText>

          {count !== undefined && (
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                  borderColor: isDark ? colors.borderStrong : colors.border,
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={colors.textSecondary}
                weight="700"
                style={styles.countText}
              >
                {MoneyUtil.toBengaliNumber(count)}টি
              </BengaliText>
            </View>
          )}
        </View>

        {subtitle && (
          <BengaliText
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={styles.subtitle}
          >
            {subtitle}
          </BengaliText>
        )}
      </View>

      {/* Right Column: Action Button */}
      {actionText && onActionPress && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onActionPress}
          style={styles.actionBtn}
        >
          <BengaliText
            variant="caption"
            color={colors.primary}
            weight="700"
            style={styles.actionText}
          >
            {actionText}
          </BengaliText>
          <Ionicons
            name={actionIcon || 'chevron-forward'}
            size={14}
            color={colors.primary}
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  leftCol: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  titleAndCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  title: {
    fontSize: 15.5,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    lineHeight: 15,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionText: {
    fontSize: 12.5,
  },
});
