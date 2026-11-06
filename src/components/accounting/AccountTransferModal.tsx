import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { BottomSheet } from '../ui/BottomSheet';
import { TextInput } from '../ui/TextInput';
import { AmountInput } from '../ui/AmountInput';
import { PrimaryButton } from '../ui/PrimaryButton';
import { FinancialAccount } from '../../types';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    fromAccountId: string;
    toAccountId: string;
    amountTaka: string;
    notes?: string;
  }) => Promise<void>;
  accounts: FinancialAccount[];
  isSubmitting?: boolean;
}

export const AccountTransferModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  accounts,
  isSubmitting = false,
}) => {
  const { colors, isDark } = useTheme();

  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amountTaka, setAmountTaka] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible && accounts.length >= 2) {
      setFromAccountId(accounts[0]._id);
      setToAccountId(accounts[1]._id);
      setAmountTaka('');
      setNotes('');
    }
  }, [visible, accounts]);

  const handleSubmit = async () => {
    if (
      !fromAccountId ||
      !toAccountId ||
      fromAccountId === toAccountId ||
      !amountTaka ||
      parseFloat(amountTaka) <= 0
    ) {
      return;
    }

    await onSubmit({
      fromAccountId,
      toAccountId,
      amountTaka,
      notes,
    });
  };

  const fromAccount = accounts.find((a) => a._id === fromAccountId);
  const toAccount = accounts.find((a) => a._id === toAccountId);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="অ্যাকাউন্ট ফান্ড ট্রান্সফার">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Double-counting prevention banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: colors.primary }]}>
          <Ionicons name="swap-horizontal" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <BengaliText style={[styles.bannerText, { color: colors.text }]}>
            নিজের এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে স্থানান্তরে কোনো আয় বা ব্যয় সৃষ্টি হয় না। আপনার মোট উপলব্ধ তহবিল অপরিবর্তিত থাকে।
          </BengaliText>
        </View>

        {/* Source Account (From) */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          কোন অ্যাকাউন্ট থেকে টাকা কাটবে? (উৎস)
        </BengaliText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {accounts.map((acc) => {
            const isSelected = fromAccountId === acc._id;
            return (
              <TouchableOpacity
                key={`from-${acc._id}`}
                style={[
                  styles.accountChip,
                  {
                    backgroundColor: isSelected ? colors.danger : colors.surface,
                    borderColor: isSelected ? colors.danger : colors.border,
                  },
                ]}
                onPress={() => setFromAccountId(acc._id)}
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

        {/* Destination Account (To) */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          কোন অ্যাকাউন্টে টাকা জমা হবে? (গন্তব্য)
        </BengaliText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {accounts.map((acc) => {
            const isSelected = toAccountId === acc._id;
            const isSame = fromAccountId === acc._id;
            return (
              <TouchableOpacity
                key={`to-${acc._id}`}
                disabled={isSame}
                style={[
                  styles.accountChip,
                  {
                    backgroundColor: isSelected ? colors.success : colors.surface,
                    borderColor: isSelected ? colors.success : colors.border,
                    opacity: isSame ? 0.35 : 1,
                  },
                ]}
                onPress={() => setToAccountId(acc._id)}
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

        {/* Amount Input */}
        <AmountInput
          label="স্থানান্তরের পরিমাণ (৳)"
          value={amountTaka}
          onChangeTaka={setAmountTaka}
          placeholder="0.00"
        />

        {/* Visual Preview */}
        {fromAccount && toAccount && amountTaka && parseFloat(amountTaka) > 0 && (
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.previewRow}>
              <BengaliText style={[styles.previewLabel, { color: colors.textSecondary }]}>
                {fromAccount.name} থেকে কর্তন:
              </BengaliText>
              <BengaliText style={[styles.previewValue, { color: colors.danger }]}>
                -৳{amountTaka}
              </BengaliText>
            </View>
            <View style={styles.previewRow}>
              <BengaliText style={[styles.previewLabel, { color: colors.textSecondary }]}>
                {toAccount.name} এ জমা:
              </BengaliText>
              <BengaliText style={[styles.previewValue, { color: colors.success }]}>
                +৳{amountTaka}
              </BengaliText>
            </View>
          </View>
        )}

        {/* Notes */}
        <TextInput
          label="মন্তব্য (ঐচ্ছিক)"
          value={notes}
          onChangeText={setNotes}
          placeholder="যেমন: ব্যাংক থেকে এটিএম ক্যাশ উত্তোলন"
        />

        <View style={styles.btnWrap}>
          <PrimaryButton
            title="স্থানান্তর সম্পন্ন করুন"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={
              !amountTaka ||
              parseFloat(amountTaka) <= 0 ||
              !fromAccountId ||
              !toAccountId ||
              fromAccountId === toAccountId
            }
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  bannerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
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
  previewCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  previewLabel: {
    fontSize: 12,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnWrap: {
    marginTop: 18,
  },
});
