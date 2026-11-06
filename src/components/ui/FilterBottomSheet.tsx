import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { BengaliText } from '../BengaliText';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { RadioButton } from './RadioButton';
import { useTheme } from '../../theme/ThemeContext';
import { PREDEFINED_EXPENSE_CATEGORIES, PredefinedCategory } from '../../constants/expenseCategories';

export interface FilterState {
  category?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  paymentSource?: 'ALL' | 'FUND' | 'OUT_OF_POCKET';
}

export interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  showPaymentSource?: boolean;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  showPaymentSource = false,
}) => {
  const { colors } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    filters.category
  );
  const [selectedSort, setSelectedSort] = useState<
    'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
  >(filters.sortBy || 'date_desc');
  const [selectedSource, setSelectedSource] = useState<'ALL' | 'FUND' | 'OUT_OF_POCKET'>(
    filters.paymentSource || 'ALL'
  );

  const handleReset = () => {
    setSelectedCategory(undefined);
    setSelectedSort('date_desc');
    setSelectedSource('ALL');
  };

  const handleApply = () => {
    onApply({
      category: selectedCategory,
      sortBy: selectedSort,
      paymentSource: showPaymentSource ? selectedSource : undefined,
    });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="ফিল্টার ও সাজানো">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Sort Options */}
        <View style={styles.section}>
          <BengaliText variant="bodyBold" color={colors.text} style={styles.sectionTitle}>
            সাজানোর ক্রম
          </BengaliText>

          <RadioButton
            label="নতুন থেকে পুরাতন তারিখ"
            selected={selectedSort === 'date_desc'}
            onSelect={() => setSelectedSort('date_desc')}
          />
          <RadioButton
            label="পুরাতন থেকে নতুন তারিখ"
            selected={selectedSort === 'date_asc'}
            onSelect={() => setSelectedSort('date_asc')}
          />
          <RadioButton
            label="বেশি টাকা থেকে কম টাকা"
            selected={selectedSort === 'amount_desc'}
            onSelect={() => setSelectedSort('amount_desc')}
          />
          <RadioButton
            label="কম টাকা থেকে বেশি টাকা"
            selected={selectedSort === 'amount_asc'}
            onSelect={() => setSelectedSort('amount_asc')}
          />
        </View>

        {/* Payment Source Options (for household expenses) */}
        {showPaymentSource && (
          <View style={styles.section}>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.sectionTitle}>
              পরিশোধের উৎস
            </BengaliText>

            <RadioButton
              label="সব ধরনের পরিশোধ"
              selected={selectedSource === 'ALL'}
              onSelect={() => setSelectedSource('ALL')}
            />
            <RadioButton
              label="মেসের মূল ফান্ড থেকে"
              selected={selectedSource === 'FUND'}
              onSelect={() => setSelectedSource('FUND')}
            />
            <RadioButton
              label="সদস্যের নিজস্ব পকেট থেকে"
              selected={selectedSource === 'OUT_OF_POCKET'}
              onSelect={() => setSelectedSource('OUT_OF_POCKET')}
            />
          </View>
        )}

        {/* Category Filters */}
        <View style={styles.section}>
          <BengaliText variant="bodyBold" color={colors.text} style={styles.sectionTitle}>
            ক্যাটাগরি অনুযায়ী ফিল্টার
          </BengaliText>

          <View style={styles.categoryWrap}>
            <TouchableOpacity
              onPress={() => setSelectedCategory(undefined)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: !selectedCategory ? colors.primary : colors.surfaceSubdued,
                  borderColor: !selectedCategory ? colors.primary : colors.border,
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={!selectedCategory ? '#FFFFFF' : colors.text}
                weight={!selectedCategory ? '700' : '500'}
              >
                সব ক্যাটাগরি
              </BengaliText>
            </TouchableOpacity>

            {PREDEFINED_EXPENSE_CATEGORIES.map((cat: PredefinedCategory) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(isSelected ? undefined : cat.name)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSubdued,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : cat.color}
                    style={{ marginRight: 6 }}
                  />
                  <BengaliText
                    variant="caption"
                    color={isSelected ? '#FFFFFF' : colors.text}
                    weight={isSelected ? '700' : '500'}
                  >
                    {cat.name}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <SecondaryButton
            title="রিসেট"
            onPress={handleReset}
            style={styles.btn}
          />
          <PrimaryButton
            title="প্রয়োগ করুন"
            onPress={handleApply}
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 450,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
  },
});
