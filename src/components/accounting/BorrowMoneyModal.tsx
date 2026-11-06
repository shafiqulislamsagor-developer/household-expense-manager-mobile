import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { BottomSheet } from '../ui/BottomSheet';
import { TextInput } from '../ui/TextInput';
import { AmountInput } from '../ui/AmountInput';
import { PrimaryButton } from '../ui/PrimaryButton';
import { FinancialAccount, Person } from '../../types';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    accountId: string;
    personId: string;
    amountTaka: string;
    purpose?: string;
    notes?: string;
    dueDate?: string | null;
  }) => Promise<void>;
  accounts: FinancialAccount[];
  people: Person[];
  isSubmitting?: boolean;
}

export const BorrowMoneyModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  accounts,
  people,
  isSubmitting = false,
}) => {
  const { colors, isDark } = useTheme();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [amountTaka, setAmountTaka] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDateDays, setDueDateDays] = useState<number | null>(30);

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
      setDueDateDays(30);
    }
  }, [visible, accounts, people]);

  const handleSubmit = async () => {
    if (!selectedAccountId || !selectedPersonId || !amountTaka || parseFloat(amountTaka) <= 0) {
      return;
    }

    let dueDateStr: string | null = null;
    if (dueDateDays) {
      dueDateStr = new Date(Date.now() + dueDateDays * 86400000).toISOString();
    }

    await onSubmit({
      accountId: selectedAccountId,
      personId: selectedPersonId,
      amountTaka,
      purpose,
      notes,
      dueDate: dueDateStr,
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="ধার বা ঋণ গ্রহণ">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={[styles.hintBox, { backgroundColor: isDark ? '#1C1917' : '#FEF3C720', borderColor: '#F59E0B' }]}>
          <Ionicons name="information-circle" size={16} color="#D97706" style={{ marginRight: 6 }} />
          <BengaliText style={[styles.hintText, { color: colors.textSecondary }]}>
            ধার গ্রহণ করলে আপনার ক্যাশ/ব্যাংক ব্যালেন্স বাড়বে এবং উক্ত ব্যক্তির নিকট আপনার দায় (Payable) বৃদ্ধি পাবে। এটি কিন্তু আপনার নতুন কোনো আয় নয়।
          </BengaliText>
        </View>

        {/* Lender Person Selector */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          কার কাছ থেকে ধার নিচ্ছেন? (ঋণদাতা)
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
                    {p.name} ({p.relationship})
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <BengaliText style={[styles.subHint, { color: colors.danger }]}>
            ধার নিতে প্রথমে অন্তত একজন ব্যক্তি/পরিচিতজনকে তালিকাভুক্ত করুন।
          </BengaliText>
        )}

        {/* Destination Account */}
        <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          টাকা কোন অ্যাকাউন্টে জমা হয়েছে?
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
                    backgroundColor: isSelected ? colors.secondary : colors.surface,
                    borderColor: isSelected ? colors.secondary : colors.border,
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

        {/* Amount Input */}
        <AmountInput
          label="ধারের পরিমাণ (৳)"
          value={amountTaka}
          onChangeTaka={setAmountTaka}
          placeholder="0.00"
        />

        {/* Purpose */}
        <TextInput
          label="ধারের কারণ বা উদ্দেশ্য"
          value={purpose}
          onChangeText={setPurpose}
          placeholder="যেমন: জরুরি চিকিৎসার প্রয়োজনে ধার"
        />

        {/* Due Days */}
        <View style={styles.dueWrap}>
          <BengaliText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            পরিশোধের প্রতিশ্রুত সময় (মেয়াদ)
          </BengaliText>
          <View style={styles.dueGrid}>
            {[
              { days: 7, label: '৭ দিন' },
              { days: 15, label: '১৫ দিন' },
              { days: 30, label: '১ মাস' },
              { days: 60, label: '২ মাস' },
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

        <View style={styles.btnWrap}>
          <PrimaryButton
            title="ধার গ্রহণ নিশ্চিত করুন"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!amountTaka || parseFloat(amountTaka) <= 0 || !selectedAccountId || !selectedPersonId}
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
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  hintText: {
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
  subHint: {
    fontSize: 12,
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
