import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

export interface CategorySpendItem {
  id: string;
  name: string;
  amountPaisa: number;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface ChartCardProps {
  title: string;
  totalPaisa: number;
  categories: CategorySpendItem[];
  onSelectCategory?: (categoryId: string) => void;
  style?: ViewStyle;
}

const DEFAULT_CATEGORY_COLORS = [
  '#059669', // Emerald
  '#0284C7', // Sky
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Teal
  '#6366F1', // Indigo
  '#F97316', // Orange
];

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  totalPaisa,
  categories,
  onSelectCategory,
  style,
}) => {
  const { colors, isDark } = useTheme();

  if (categories.length === 0 || totalPaisa <= 0) {
    return null;
  }

  // Sort highest first
  const sorted = [...categories].sort((a, b) => b.amountPaisa - a.amountPaisa);
  const topCategories = sorted.slice(0, 5);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isDark ? colors.surfaceSubdued : colors.primaryLight,
              },
            ]}
          >
            <Ionicons name="pie-chart" size={15} color={colors.primary} />
          </View>
          <BengaliText
            variant="bodyBold"
            color={colors.text}
            numberOfLines={2}
            style={styles.headerTitle}
          >
            {title}
          </BengaliText>
        </View>

        <View
          style={[
            styles.totalBadge,
            {
              backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <BengaliText variant="caption" color={colors.textSecondary} weight="700">
            মোট: {MoneyUtil.formatBengaliCurrency(totalPaisa)}
          </BengaliText>
        </View>
      </View>

      {/* Segmented multi-colored bar */}
      <View style={[styles.segmentBarContainer, { backgroundColor: isDark ? colors.surfaceSubdued : '#E2E8F0' }]}>
        {topCategories.map((cat, idx) => {
          const pct = Math.max(1, Math.round((cat.amountPaisa / totalPaisa) * 100));
          const catColor = cat.color || DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length];
          return (
            <View
              key={cat.id}
              style={[
                styles.segmentSlice,
                {
                  flex: pct,
                  backgroundColor: catColor,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Category breakdown items */}
      <View style={styles.breakdownList}>
        {topCategories.map((cat, idx) => {
          const pct = Math.round((cat.amountPaisa / totalPaisa) * 100);
          const catColor = cat.color || DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length];

          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={onSelectCategory ? 0.7 : 1}
              onPress={() => onSelectCategory && onSelectCategory(cat.id)}
              disabled={!onSelectCategory}
              style={styles.categoryItem}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.dot, { backgroundColor: catColor }]} />
                <BengaliText
                  variant="caption"
                  color={colors.text}
                  numberOfLines={1}
                  weight="600"
                  style={styles.categoryName}
                >
                  {cat.name}
                </BengaliText>
              </View>

              <View style={styles.categoryRight}>
                <BengaliText variant="caption" color={colors.textSecondary} weight="700">
                  {MoneyUtil.formatBengaliCurrency(cat.amountPaisa)}
                </BengaliText>

                <View
                  style={[
                    styles.pctBadge,
                    {
                      backgroundColor: `${catColor}18`,
                    },
                  ]}
                >
                  <BengaliText
                    variant="caption"
                    color={catColor}
                    weight="800"
                    style={{ fontSize: 10.5 }}
                  >
                    {MoneyUtil.toBengaliNumber(pct)}%
                  </BengaliText>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14.5,
    flex: 1,
  },
  totalBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  segmentSlice: {
    height: '100%',
  },
  breakdownList: {
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    flex: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pctBadge: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
});
