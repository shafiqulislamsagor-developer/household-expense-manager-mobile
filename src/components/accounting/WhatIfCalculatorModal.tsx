import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { BottomSheet } from '../ui/BottomSheet';
import { MoneyUtil } from '../../utils/money';
import { WhatIfProjection } from '../../types';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  projection: WhatIfProjection | null;
}

export const WhatIfCalculatorModal: React.FC<Props> = ({
  visible,
  onClose,
  projection,
}) => {
  const { colors, isDark } = useTheme();

  if (!projection) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="কী হতো যদি? (What-If সিমুলেটর)">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <BengaliText style={[styles.description, { color: colors.textSecondary }]}>
          আপনার বর্তমান আর্থিক তারল্য, সমস্ত দেনা পরিশোধ এবং সব পাওনা আদায় হওয়ার পর আপনার অবস্থান কেমন হবে তা নিম্নে তাৎক্ষণিকভাবে হিসেব করা হয়েছে।
        </BengaliText>

        {/* Current Available Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <BengaliText style={[styles.cardTitle, { color: colors.text }]}>
                বর্তমান উপলব্ধ ব্যালেন্স
              </BengaliText>
              <BengaliText style={[styles.cardSub, { color: colors.textSecondary }]}>
                (ক্যাশ + ব্যাংক + মোবাইল ব্যাংকিং)
              </BengaliText>
            </View>
            <BengaliText style={[styles.cardAmount, { color: colors.primary }]}>
              {MoneyUtil.formatBengaliCurrency(projection.currentAvailableMoneyPaisa)}
            </BengaliText>
          </View>
        </View>

        {/* Projection 1: After Paying Everyone */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1C1917' : '#FEF2F2',
              borderColor: projection.afterPayingEveryonePaisa < 0 ? colors.danger : colors.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trending-down" size={20} color={colors.danger} />
            </View>
            <View style={styles.cardInfo}>
              <BengaliText style={[styles.cardTitle, { color: colors.text }]}>
                সমস্ত দেনা শোধ করার পর স্থিতি
              </BengaliText>
              <BengaliText style={[styles.cardSub, { color: colors.textSecondary }]}>
                (বর্তমান - মোট বকেয়া দেনা: {MoneyUtil.formatBengaliCurrency(projection.totalPayablePaisa)})
              </BengaliText>
            </View>
            <BengaliText
              style={[
                styles.cardAmount,
                { color: projection.afterPayingEveryonePaisa < 0 ? colors.danger : colors.text },
              ]}
            >
              {MoneyUtil.formatBengaliCurrency(projection.afterPayingEveryonePaisa)}
            </BengaliText>
          </View>

          {projection.isDeficit && (
            <View style={[styles.alertBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="warning" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <BengaliText style={[styles.alertText, { color: colors.danger }]}>
                সতর্কতা: আপনার বর্তমান জমার চেয়ে দেনার পরিমাণ বেশি! দ্রুত ব্যালেন্স সমন্বয় করুন।
              </BengaliText>
            </View>
          )}
        </View>

        {/* Projection 2: After Receiving All Debt */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#064E3B20' : '#ECFDF5',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
            <View style={styles.cardInfo}>
              <BengaliText style={[styles.cardTitle, { color: colors.text }]}>
                সমস্ত পাওনা আদায় হওয়ার পর
              </BengaliText>
              <BengaliText style={[styles.cardSub, { color: colors.textSecondary }]}>
                (বর্তমান + মোট প্রাপ্য: {MoneyUtil.formatBengaliCurrency(projection.totalReceivablePaisa)})
              </BengaliText>
            </View>
            <BengaliText style={[styles.cardAmount, { color: colors.success }]}>
              {MoneyUtil.formatBengaliCurrency(projection.afterReceivingAllMoneyPaisa)}
            </BengaliText>
          </View>
        </View>

        {/* Projection 3: Fully Settled Position */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
              borderColor: colors.primary,
              borderWidth: 1.5,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="checkmark-done-circle" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <BengaliText style={[styles.cardTitle, { color: colors.primary, fontWeight: '700' }]}>
                সম্পূর্ণ নিষ্পত্তির পর চূড়ান্ত স্থিতি
              </BengaliText>
              <BengaliText style={[styles.cardSub, { color: colors.textSecondary }]}>
                (সব দেনা পরিশোধ ও সব পাওনা আদায়ের পর)
              </BengaliText>
            </View>
            <BengaliText style={[styles.cardAmount, { color: colors.primary, fontWeight: '700' }]}>
              {MoneyUtil.formatBengaliCurrency(projection.fullySettledPositionPaisa)}
            </BengaliText>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  alertText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
