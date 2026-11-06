import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from './BengaliText';
import {
  PredefinedCategory,
  PREDEFINED_EXPENSE_CATEGORIES,
  PREDEFINED_INCOME_CATEGORIES,
} from '../constants/expenseCategories';
import { useTheme } from '../theme/ThemeContext';

interface CategoryPickerProps {
  type: 'EXPENSE' | 'INCOME';
  selectedCategoryId?: string;
  onSelectCategory: (category: PredefinedCategory) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  type,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const { colors, isDark } = useTheme();
  const categories =
    type === 'EXPENSE' ? PREDEFINED_EXPENSE_CATEGORIES : PREDEFINED_INCOME_CATEGORIES;

  return (
    <View style={styles.container}>
      <BengaliText variant="caption" color={colors.textMuted} style={styles.label}>
        ক্যাটাগরি বাছাই করুন:
      </BengaliText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                {
                  borderColor: isSelected
                    ? cat.color
                    : isDark ? colors.borderStrong : colors.border,
                  backgroundColor: isSelected
                    ? isDark ? `${cat.color}25` : `${cat.color}15`
                    : isDark ? colors.surface : colors.surfaceSubdued,
                },
              ]}
              onPress={() => onSelectCategory(cat)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isSelected ? cat.color : `${cat.color}18` },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? '#ffffff' : cat.color}
                />
              </View>
              <BengaliText
                variant="caption"
                color={isSelected ? cat.color : colors.textSecondary}
                style={[styles.chipText, isSelected && { fontWeight: '700' }]}
              >
                {cat.name}
              </BengaliText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  scrollList: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
  },
});
