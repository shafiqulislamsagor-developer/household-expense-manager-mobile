import React from 'react';
import { View, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { ReceivableItem, PayableItem } from '../../types';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  receivables: ReceivableItem[];
  payables: PayableItem[];
  onReceiveRepayment: (item: ReceivableItem) => void;
  onPayDebt: (item: PayableItem) => void;
}

export const ReceivablesPayablesCard: React.FC<Props> = ({
  receivables,
  payables,
  onReceiveRepayment,
  onPayDebt,
}) => {
  const { colors, isDark } = useTheme();

  const handleSendReminder = async (item: ReceivableItem) => {
    const personName = item.person?.name || 'পরিচিতজন';
    const amountStr = MoneyUtil.formatBengaliCurrency(item.remainingReceivablePaisa);
    const message = `আসসালামু আলাইকুম ${personName}, আশা করি ভালো আছেন। আপনার কাছে পাওনা ${amountStr} এর হিসেবটি স্মরণ করিয়ে দিতে মেসেজ পাঠালাম। সম্ভব হলে দ্রুত পরিশোধ করার অনুরোধ রইল। ধন্যবাদ!`;

    try {
      await Share.share({
        message,
        title: 'পাওনা টাকার তাগাদা',
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* 1. Receivables: যাদের কাছে টাকা পাবো */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="arrow-down-circle" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <BengaliText style={[styles.sectionTitle, { color: colors.text }]}>
              যাদের কাছে টাকা পাবো (প্রাপ্য ঋণ)
            </BengaliText>
            <BengaliText style={[styles.sectionSub, { color: colors.textSecondary }]}>
              মোট পাওনা: {MoneyUtil.formatBengaliCurrency(receivables.reduce((s, r) => s + r.remainingReceivablePaisa, 0))}
            </BengaliText>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
            <BengaliText style={[styles.countText, { color: colors.primary }]}>
              {receivables.length} জন
            </BengaliText>
          </View>
        </View>

        {receivables.length === 0 ? (
          <BengaliText style={[styles.emptyText, { color: colors.textSecondary }]}>
            বর্তমানে কারো কাছে কোনো টাকা পাওনা নেই।
          </BengaliText>
        ) : (
          receivables.map((r) => (
            <View
              key={r._id}
              style={[
                styles.itemRow,
                { borderTopColor: isDark ? colors.borderStrong : colors.border },
              ]}
            >
              <View style={styles.itemInfo}>
                <View style={styles.nameRow}>
                  <BengaliText style={[styles.personName, { color: colors.text }]}>
                    {r.person?.name || 'অজ্ঞাত ব্যক্তি'}
                  </BengaliText>
                  {r.isOverdue && (
                    <View style={styles.overdueBadge}>
                      <BengaliText style={styles.overdueText}>মেয়াদোত্তীর্ণ</BengaliText>
                    </View>
                  )}
                </View>
                <BengaliText style={[styles.itemSub, { color: colors.textSecondary }]}>
                  {r.purpose || 'প্রদত্ত ঋণ'} • {new Date(r.date).toLocaleDateString('bn-BD')}
                </BengaliText>
              </View>

              <View style={styles.actionCol}>
                <BengaliText style={[styles.amountText, { color: colors.success }]}>
                  {MoneyUtil.formatBengaliCurrency(r.remainingReceivablePaisa)}
                </BengaliText>
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#25D36620', borderColor: '#25D366' }]}
                    onPress={() => handleSendReminder(r)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={12} color="#16A34A" />
                    <BengaliText style={[styles.smallBtnText, { color: '#16A34A' }]}>
                      তাগাদা
                    </BengaliText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => onReceiveRepayment(r)}
                  >
                    <Ionicons name="cash-outline" size={12} color={colors.primary} />
                    <BengaliText style={[styles.smallBtnText, { color: colors.primary }]}>
                      ফেরত নিন
                    </BengaliText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 2. Payables: যাদের টাকা দিতে হবে */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="arrow-up-circle" size={18} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <BengaliText style={[styles.sectionTitle, { color: colors.text }]}>
              যাদের টাকা দিতে হবে (বকেয়া দেনা)
            </BengaliText>
            <BengaliText style={[styles.sectionSub, { color: colors.textSecondary }]}>
              মোট দেনা: {MoneyUtil.formatBengaliCurrency(payables.reduce((s, p) => s + p.remainingPayablePaisa, 0))}
            </BengaliText>
          </View>
          <View style={[styles.countBadge, { backgroundColor: '#FEE2E2' }]}>
            <BengaliText style={[styles.countText, { color: colors.danger }]}>
              {payables.length} জন
            </BengaliText>
          </View>
        </View>

        {payables.length === 0 ? (
          <BengaliText style={[styles.emptyText, { color: colors.textSecondary }]}>
            বর্তমানে কারো নিকট কোনো ঋণ বা দেনা নেই।
          </BengaliText>
        ) : (
          payables.map((p) => (
            <View
              key={p._id}
              style={[
                styles.itemRow,
                { borderTopColor: isDark ? colors.borderStrong : colors.border },
              ]}
            >
              <View style={styles.itemInfo}>
                <View style={styles.nameRow}>
                  <BengaliText style={[styles.personName, { color: colors.text }]}>
                    {p.lender?.name || 'অজ্ঞাত ব্যক্তি'}
                  </BengaliText>
                  {p.isOverdue && (
                    <View style={styles.overdueBadge}>
                      <BengaliText style={styles.overdueText}>মেয়াদোত্তীর্ণ</BengaliText>
                    </View>
                  )}
                </View>
                <BengaliText style={[styles.itemSub, { color: colors.textSecondary }]}>
                  {p.purpose || 'গৃহীত ধার'} • {new Date(p.date).toLocaleDateString('bn-BD')}
                </BengaliText>
              </View>

              <View style={styles.actionCol}>
                <BengaliText style={[styles.amountText, { color: colors.danger }]}>
                  {MoneyUtil.formatBengaliCurrency(p.remainingPayablePaisa)}
                </BengaliText>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#FEE2E2', borderColor: colors.danger, alignSelf: 'flex-end', marginTop: 4 }]}
                  onPress={() => onPayDebt(p)}
                >
                  <Ionicons name="card-outline" size={12} color={colors.danger} />
                  <BengaliText style={[styles.smallBtnText, { color: colors.danger }]}>
                    পরিশোধ করুন
                  </BengaliText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    fontSize: 13,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  overdueText: {
    fontSize: 9,
    color: '#DC2626',
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
