import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { BottomSheet } from '../ui/BottomSheet';
import { MonthlyFinancialStatement } from '../../types';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  statement: MonthlyFinancialStatement | null;
}

export const MonthEndStatementModal: React.FC<Props> = ({
  visible,
  onClose,
  statement,
}) => {
  const { colors, isDark } = useTheme();

  if (!statement) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`${statement.year} সালের ${statement.month} মাসের আর্থিক বিবরণী`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Net Savings & Net Worth Hero */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: colors.primary }]}>
          <View style={styles.heroRow}>
            <View>
              <BengaliText style={[styles.heroLabel, { color: colors.textSecondary }]}>
                মাসের মোট নীট সঞ্চয় (Net Savings)
              </BengaliText>
              <BengaliText
                style={[
                  styles.heroValue,
                  { color: statement.netSavingsPaisa >= 0 ? colors.success : colors.danger },
                ]}
              >
                {MoneyUtil.formatBengaliCurrency(statement.netSavingsPaisa)}
              </BengaliText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <BengaliText style={[styles.heroLabel, { color: colors.textSecondary }]}>
                সমাপনী নীট সম্পদ (Net Worth)
              </BengaliText>
              <BengaliText style={[styles.heroValue, { color: colors.primary }]}>
                {MoneyUtil.formatBengaliCurrency(statement.closingNetWorthPaisa)}
              </BengaliText>
            </View>
          </View>
        </View>

        {/* 1. Income Section */}
        <View style={[styles.sectionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={16} color={colors.success} style={{ marginRight: 6 }} />
            <BengaliText style={[styles.sectionTitle, { color: colors.text }]}>
              মোট উপার্জিত আয়
            </BengaliText>
            <BengaliText style={[styles.sectionTotal, { color: colors.success }]}>
              {MoneyUtil.formatBengaliCurrency(statement.income.totalPaisa)}
            </BengaliText>
          </View>

          {statement.income.sources.length === 0 ? (
            <BengaliText style={[styles.emptyNote, { color: colors.textSecondary }]}>
              এই মাসে কোনো আয়ের এন্ট্রি পাওয়া যায়নি।
            </BengaliText>
          ) : (
            statement.income.sources.map((s, idx) => (
              <View key={idx} style={styles.itemRow}>
                <BengaliText style={[styles.itemTitle, { color: colors.text }]}>{s.title}</BengaliText>
                <BengaliText style={[styles.itemAmount, { color: colors.text }]}>
                  {MoneyUtil.formatBengaliCurrency(s.amountPaisa)}
                </BengaliText>
              </View>
            ))
          )}
        </View>

        {/* 2. Expense Section */}
        <View style={[styles.sectionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-down" size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <BengaliText style={[styles.sectionTitle, { color: colors.text }]}>
              মোট ব্যয় বা খরচ
            </BengaliText>
            <BengaliText style={[styles.sectionTotal, { color: colors.danger }]}>
              {MoneyUtil.formatBengaliCurrency(statement.expenses.totalPaisa)}
            </BengaliText>
          </View>

          <View style={styles.itemRow}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>ব্যক্তিগত খরচ</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.text }]}>
              {MoneyUtil.formatBengaliCurrency(statement.expenses.personalExpensesPaisa)}
            </BengaliText>
          </View>
          <View style={styles.itemRow}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>পারিবারিক খরচ</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.text }]}>
              {MoneyUtil.formatBengaliCurrency(statement.expenses.familyExpensesPaisa)}
            </BengaliText>
          </View>
          <View style={styles.itemRow}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>পারিবারিক চাঁদা প্রদান</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.text }]}>
              {MoneyUtil.formatBengaliCurrency(statement.expenses.householdContributionsPaisa)}
            </BengaliText>
          </View>
          {statement.expenses.interestExpensesPaisa > 0 && (
            <View style={styles.itemRow}>
              <BengaliText style={[styles.itemTitle, { color: colors.text }]}>ধারের সুদ বাবদ খরচ</BengaliText>
              <BengaliText style={[styles.itemAmount, { color: colors.danger }]}>
                {MoneyUtil.formatBengaliCurrency(statement.expenses.interestExpensesPaisa)}
              </BengaliText>
            </View>
          )}
        </View>

        {/* 3. Debt & Receivables Summary */}
        <View style={[styles.sectionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="swap-vertical" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <BengaliText style={[styles.sectionTitle, { color: colors.text }]}>
              ধার ও ঋণের অবস্থা
            </BengaliText>
          </View>

          <View style={styles.itemRow}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>অন্যকে মোট প্রদত্ত ঋণ</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.text }]}>
              {MoneyUtil.formatBengaliCurrency(statement.receivables.totalLentPaisa)}
            </BengaliText>
          </View>
          <View style={styles.itemRow}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>অন্যের কাছ থেকে আদায় হয়েছে</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.success }]}>
              {MoneyUtil.formatBengaliCurrency(statement.receivables.totalReceivedBackPaisa)}
            </BengaliText>
          </View>
          <View style={[styles.itemRow, styles.subTotalRow]}>
            <BengaliText style={[styles.subTotalLabel, { color: colors.text }]}>অবশিষ্ট বকেয়া পাওনা</BengaliText>
            <BengaliText style={[styles.subTotalValue, { color: colors.success }]}>
              {MoneyUtil.formatBengaliCurrency(statement.receivables.remainingReceivablePaisa)}
            </BengaliText>
          </View>

          <View style={[styles.itemRow, { marginTop: 10 }]}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>অন্যের থেকে মোট ধার গ্রহণ</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.text }]}>
              {MoneyUtil.formatBengaliCurrency(statement.payables.totalBorrowedPaisa)}
            </BengaliText>
          </View>
          <View style={styles.itemRow}>
            <BengaliText style={[styles.itemTitle, { color: colors.text }]}>ধার বাবদ পরিশোধ করা হয়েছে</BengaliText>
            <BengaliText style={[styles.itemAmount, { color: colors.danger }]}>
              {MoneyUtil.formatBengaliCurrency(statement.payables.totalRepaidPaisa)}
            </BengaliText>
          </View>
          <View style={[styles.itemRow, styles.subTotalRow]}>
            <BengaliText style={[styles.subTotalLabel, { color: colors.text }]}>অবশিষ্ট বকেয়া দেনা</BengaliText>
            <BengaliText style={[styles.subTotalValue, { color: colors.danger }]}>
              {MoneyUtil.formatBengaliCurrency(statement.payables.remainingPayablePaisa)}
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
  heroCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F040',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyNote: {
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemTitle: {
    fontSize: 12,
  },
  itemAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
  subTotalRow: {
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F040',
  },
  subTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  subTotalValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
