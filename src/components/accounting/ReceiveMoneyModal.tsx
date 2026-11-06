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
    description?: string;
    notes?: string;
  }) => Promise<void>;
  accounts: FinancialAccount[];
  people: Person[];
  isSubmitting?: boolean;
  initialPersonId?: string | null;
  initialFlowType?: TransactionFlowType;
}

const RECEIVE_TYPES: Array<{
  type: TransactionFlowType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  sub: string;
}> = [
  {
    type: 'INCOME',
    label: 'নতুন আয় / ইনকাম',
    icon: 'cash-outline',
    color: '#059669',
    sub: 'বেতন, ব্যবসা বা অন্য কোনো উপার্জিত আয়',
  },
  {
    type: 'LOAN_REPAYMENT',
    label: 'প্রদত্ত ঋণ ফেরত',
    icon: 'checkmark-circle-outline',
    color: '#0284C7',
    sub: 'কাউকে দেয়া টাকা ফেরত (নতুন আয় হিসেবে গণ্য হবে না)',
  },
  {
    type: 'ADVANCE_REFUND',
    label: 'অগ্রিম টাকা ফেরত',
    icon: 'return-down-back-outline',
    color: '#0D9488',
    sub: 'পূর্বে দেয়া অগ্রিমের অব্যবহৃত অংশ ফেরত',
  },
  {
    type: 'FAMILY_REFUND',
    label: 'পারিবারিক খরচের রিফান্ড',
    icon: 'refresh-circle-outline',
    color: '#8B5CF6',
    sub: 'পারিবারিক খরচ থেকে বেঁচে যাওয়া টাকা ফেরত',
  },
  {
    type: 'OTHER_RECEIPT',
    label: 'অন্যান্য প্রাপ্তি',
    icon: 'receipt-outline',
    color: '#64748B',
    sub: 'সাধারণ টাকা গ্রহণ',
  },
];

export const ReceiveMoneyModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  accounts,
  people,
  isSubmitting = false,
  initialPersonId = null,
  initialFlowType = 'INCOME',
}) => {
  const { colors, isDark } = useTheme();

  const [flowType, setFlowType] = useState<TransactionFlowType>(initialFlowType);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [amountTaka, setAmountTaka] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setFlowType(initialFlowType);
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0]._id);
      }
      setSelectedPersonId(initialPersonId || (people.length > 0 ? people[0]._id : ''));
      setAmountTaka('');
      setDescription('');
      setNotes('');
    }
  }, [visible, accounts, people, initialPersonId, initialFlowType]);

  const handleSubmit = async () => {
    if (!selectedAccountId || !amountTaka || parseFloat(amountTaka) <= 0) {
      return;
    }

    await onSubmit({
      accountId: selectedAccountId,
      personId: selectedPersonId || null,
      flowType,
      amountTaka,
      description,
      notes,
    });
  };

  const isPersonRequired = flowType === 'LOAN_REPAYMENT' || flowType === 'ADVANCE_REFUND';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="টাকা গ্রহণ / জমা করুন">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Flow Type Selector */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          টাকা প্রাপ্তির ধরণ
        </BengaliText>
        <View style={styles.flowGrid}>
          {RECEIVE_TYPES.map((rt) => {
            const isSelected = flowType === rt.type;
            return (
              <TouchableOpacity
                key={rt.type}
                style={[
                  styles.flowCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#064E3B20'
                        : '#ECFDF5'
                      : colors.surface,
                    borderColor: isSelected ? rt.color : colors.border,
                  },
                ]}
                onPress={() => setFlowType(rt.type)}
                activeOpacity={0.7}
              >
                <View style={[styles.flowIconWrap, { backgroundColor: `${rt.color}18` }]}>
                  <Ionicons name={rt.icon} size={18} color={rt.color} />
                </View>
                <BengaliText
                  style={[
                    styles.flowLabel,
                    { color: isSelected ? rt.color : colors.text, fontWeight: isSelected ? '700' : '600' },
                  ]}
                >
                  {rt.label}
                </BengaliText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Informational Hint about Selected Flow Type */}
        <View style={[styles.hintBox, { backgroundColor: isDark ? '#1C1917' : '#F8FAFC', borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <BengaliText style={[styles.hintText, { color: colors.textSecondary }]}>
            {RECEIVE_TYPES.find((r) => r.type === flowType)?.sub}
          </BengaliText>
        </View>

        {/* Destination Account Selector */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          কোথায় জমা হবে? (ক্যাশ / ব্যাংক / বিকাশ)
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

        {/* Person Selector (if applicable) */}
        {isPersonRequired && (
          <>
            <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              কার কাছ থেকে ফেরত পাচ্ছেন? (ঋণগ্রহীতা)
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
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
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
                        {p.name} {p.currentReceivablePaisa > 0 ? `(পাওনা: ${MoneyUtil.formatBengaliCurrency(p.currentReceivablePaisa)})` : ''}
                      </BengaliText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <BengaliText style={[styles.subHint, { color: colors.textSecondary }]}>
                কোনো ঋণগ্রহীতা ব্যক্তি তালিকাভুক্ত নেই।
              </BengaliText>
            )}
          </>
        )}

        {/* Amount Input */}
        <AmountInput
          label="টাকার পরিমাণ (৳)"
          value={amountTaka}
          onChangeTaka={setAmountTaka}
          placeholder="0.00"
        />

        {/* Description / Source */}
        <TextInput
          label="আয় বা প্রাপ্তির বিবরণ"
          value={description}
          onChangeText={setDescription}
          placeholder={flowType === 'INCOME' ? 'যেমন: মাসিক বেতন বা ফ্রিল্যান্সিং' : 'যেমন: ঋণের কিস্তি ফেরত'}
        />

        <View style={styles.btnWrap}>
          <PrimaryButton
            title="টাকা গ্রহণ নিশ্চিত করুন"
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
  btnWrap: {
    marginTop: 18,
  },
});
