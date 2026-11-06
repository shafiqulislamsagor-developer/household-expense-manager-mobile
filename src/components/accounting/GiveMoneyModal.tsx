import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { BottomSheet } from '../ui/BottomSheet';
import { TextInput } from '../ui/TextInput';
import { AmountInput } from '../ui/AmountInput';
import { PrimaryButton } from '../ui/PrimaryButton';
import { FinancialAccount, Person, TransactionFlowType } from '../../types';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    accountId: string;
    personId?: string | null;
    flowType: TransactionFlowType;
    amountTaka: string;
    purpose?: string;
    notes?: string;
    dueDate?: string | null;
  }) => Promise<void>;
  accounts: FinancialAccount[];
  people: Person[];
  isSubmitting?: boolean;
}

const FLOW_TYPES: Array<{
  type: TransactionFlowType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  sub: string;
}> = [
  {
    type: 'LOAN',
    label: 'ধার / ঋণ প্রদান',
    icon: 'hand-left-outline',
    color: '#0284C7',
    sub: 'ব্যয় হবে না, পাওনা হিসেবে রেকর্ড হবে',
  },
  {
    type: 'ADVANCE',
    label: 'অগ্রিম প্রদান',
    icon: 'arrow-forward-circle-outline',
    color: '#0D9488',
    sub: 'পরবর্তীতে সমন্বয়যোগ্য ব্যালেন্স',
  },
  {
    type: 'GIFT',
    label: 'উপহার / দান',
    icon: 'gift-outline',
    color: '#E11D48',
    sub: 'ব্যক্তিগত ব্যয় হিসেবে গণ্য হবে',
  },
  {
    type: 'FAMILY_EXPENSE',
    label: 'পারিবারিক ব্যয়',
    icon: 'home-outline',
    color: '#D97706',
    sub: 'পরিবারের সরাসরি খরচে প্রদান',
  },
  {
    type: 'HOUSEHOLD_CONTRIBUTION',
    label: 'পারিবারিক চাঁদা',
    icon: 'wallet-outline',
    color: '#059669',
    sub: 'পারিবারিক ফান্ডে জমা হবে',
  },
  {
    type: 'OTHER',
    label: 'অন্যান্য প্রদান',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#64748B',
    sub: 'সাধারণ টাকা প্রদান',
  },
];

export const GiveMoneyModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  accounts,
  people,
  isSubmitting = false,
}) => {
  const { colors, isDark } = useTheme();

  const [flowType, setFlowType] = useState<TransactionFlowType>('LOAN');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [amountTaka, setAmountTaka] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDateDays, setDueDateDays] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0]._id);
      }
      if (people.length > 0 && !selectedPersonId) {
        setSelectedPersonId(people[0]._id);
      }
      setAmountTaka('');
      setPurpose('');
      setNotes('');
      setDueDateDays(null);
    }
  }, [visible, accounts, people]);

  const handleSubmit = async () => {
    if (!selectedAccountId || !amountTaka || parseFloat(amountTaka) <= 0) {
      return;
    }

    let dueDateStr: string | null = null;
    if (dueDateDays) {
      dueDateStr = new Date(Date.now() + dueDateDays * 86400000).toISOString();
    }

    await onSubmit({
      accountId: selectedAccountId,
      personId: selectedPersonId || null,
      flowType,
      amountTaka,
      purpose,
      notes,
      dueDate: dueDateStr,
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="টাকা প্রদান করুন">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Flow Type Selector */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          প্রদানের ধরণ নির্বাচন করুন
        </BengaliText>
        <View style={styles.flowGrid}>
          {FLOW_TYPES.map((ft) => {
            const isSelected = flowType === ft.type;
            return (
              <TouchableOpacity
                key={ft.type}
                style={[
                  styles.flowCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#1E293B'
                        : '#F0F9FF'
                      : colors.surface,
                    borderColor: isSelected ? ft.color : colors.border,
                  },
                ]}
                onPress={() => setFlowType(ft.type)}
                activeOpacity={0.7}
              >
                <View style={[styles.flowIconWrap, { backgroundColor: `${ft.color}18` }]}>
                  <Ionicons name={ft.icon} size={18} color={ft.color} />
                </View>
                <BengaliText
                  style={[
                    styles.flowLabel,
                    { color: isSelected ? ft.color : colors.text, fontWeight: isSelected ? '700' : '600' },
                  ]}
                >
                  {ft.label}
                </BengaliText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Informational Hint about Selected Flow Type */}
        <View style={[styles.hintBox, { backgroundColor: isDark ? '#1C1917' : '#F8FAFC', borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <BengaliText style={[styles.hintText, { color: colors.textSecondary }]}>
            {FLOW_TYPES.find((f) => f.type === flowType)?.sub}
          </BengaliText>
        </View>

        {/* Source Account Selector */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          টাকা কাটার অ্যাকাউন্ট (ক্যাশ / ব্যাংক / বিকাশ)
        </BengaliText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc._id;
            return (
              <TouchableOpacity
                key={acc._id}
                style={[
                  styles.accountChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedAccountId(acc._id)}
              >
                <BengaliText
                  style={[
                    styles.accountChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {acc.name} ({MoneyUtil.formatBengaliCurrency(acc.currentBalancePaisa)})
                </BengaliText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Person Selector (for LOAN, ADVANCE, GIFT, etc.) */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          কাকে দিচ্ছেন? (ব্যক্তি / পরিচিতজন)
        </BengaliText>
        {people.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {people.map((p) => {
              const isSelected = selectedPersonId === p._id;
              return (
                <TouchableOpacity
                  key={p._id}
                  style={[
                    styles.accountChip,
                    {
                      backgroundColor: isSelected ? colors.secondary : colors.surface,
                      borderColor: isSelected ? colors.secondary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedPersonId(p._id)}
                >
                  <BengaliText
                    style={[
                      styles.accountChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {p.name}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <BengaliText style={[styles.subHint, { color: colors.textSecondary }]}>
            কোনো ব্যক্তি যুক্ত নেই। আপনি 'অন্যান্য' মেন্যু থেকে পরিচিত ব্যক্তি যুক্ত করতে পারেন।
          </BengaliText>
        )}

        {/* Amount Input */}
        <AmountInput
          label="টাকার পরিমাণ (৳)"
          value={amountTaka}
          onChangeTaka={setAmountTaka}
          placeholder="0.00"
        />

        {/* Purpose / Title */}
        <TextInput
          label="উদ্দেশ্য বা বিবরণ"
          value={purpose}
          onChangeText={setPurpose}
          placeholder="যেমন: ব্যবসায়িক প্রয়োজনে ধার"
        />

        {/* Due Date Option (if LOAN or ADVANCE) */}
        {(flowType === 'LOAN' || flowType === 'ADVANCE') && (
          <View style={styles.dueWrap}>
            <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              ফেরতের সম্ভাব্য সময় (মেয়াদ)
            </BengaliText>
            <View style={styles.dueGrid}>
              {[
                { days: 7, label: '৭ দিন' },
                { days: 15, label: '১৫ দিন' },
                { days: 30, label: '১ মাস' },
                { days: 90, label: '৩ মাস' },
              ].map((d) => {
                const isSelected = dueDateDays === d.days;
                return (
                  <TouchableOpacity
                    key={d.days}
                    style={[
                      styles.dueChip,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setDueDateDays(isSelected ? null : d.days)}
                  >
                    <BengaliText
                      style={[
                        styles.dueChipText,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {d.label}
                    </BengaliText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.btnWrap}>
          <PrimaryButton
            title="টাকা প্রদান নিশ্চিত করুন"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!amountTaka || parseFloat(amountTaka) <= 0 || !selectedAccountId}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  flowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flowCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  flowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  flowLabel: {
    fontSize: 12,
    flex: 1,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    flex: 1,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dueWrap: {
    marginTop: 8,
  },
  dueGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  dueChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dueChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnWrap: {
    marginTop: 18,
  },
});
