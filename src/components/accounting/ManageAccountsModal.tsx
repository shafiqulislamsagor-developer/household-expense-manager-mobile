import React, { useState } from 'react';
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
  accounts: FinancialAccount[];
  onCreateAccount: (data: {
    name: string;
    type: 'CASH' | 'BANK' | 'MOBILE_BANKING' | 'SAVINGS' | 'OTHER';
    accountNumber?: string;
    bankName?: string;
    openingBalanceTaka: string;
    notes?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const ACCOUNT_TYPES: Array<{
  type: 'CASH' | 'BANK' | 'MOBILE_BANKING' | 'SAVINGS' | 'OTHER';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { type: 'CASH', label: 'ক্যাশ ইন হ্যান্ড', icon: 'cash-outline' },
  { type: 'BANK', label: 'ব্যাংক অ্যাকাউন্ট', icon: 'business-outline' },
  { type: 'MOBILE_BANKING', label: 'মোবাইল ব্যাংকিং (বিকাশ/নগদ)', icon: 'phone-portrait-outline' },
  { type: 'SAVINGS', label: 'সঞ্চয় বা ডিপিএস', icon: 'save-outline' },
  { type: 'OTHER', label: 'অন্যান্য অ্যাকাউন্ট', icon: 'wallet-outline' },
];

export const ManageAccountsModal: React.FC<Props> = ({
  visible,
  onClose,
  accounts,
  onCreateAccount,
  isSubmitting = false,
}) => {
  const { colors, isDark } = useTheme();

  const [mode, setMode] = useState<'LIST' | 'CREATE'>('LIST');
  const [name, setName] = useState('');
  const [type, setType] = useState<'CASH' | 'BANK' | 'MOBILE_BANKING' | 'SAVINGS' | 'OTHER'>('CASH');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalanceTaka, setOpeningBalanceTaka] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreateAccount({
      name: name.trim(),
      type,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      openingBalanceTaka,
      notes: notes.trim(),
    });
    setName('');
    setBankName('');
    setAccountNumber('');
    setOpeningBalanceTaka('');
    setNotes('');
    setMode('LIST');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setMode('LIST');
        onClose();
      }}
      title={mode === 'LIST' ? 'আর্থিক অ্যাকাউন্টসমূহ' : 'নতুন অ্যাকাউন্ট তৈরি'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {mode === 'LIST' ? (
          <>
            <View style={styles.topRow}>
              <BengaliText style={[styles.subTitle, { color: colors.textSecondary }]}>
                আপনার সক্রিয় ব্যাংক, ক্যাশ ও ওয়ালেট অ্যাকাউন্টসমূহ
              </BengaliText>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => setMode('CREATE')}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <BengaliText style={[styles.addBtnText, { color: colors.primary }]}>নতুন অ্যাকাউন্ট</BengaliText>
              </TouchableOpacity>
            </View>

            {accounts.map((acc) => (
              <View
                key={acc._id}
                style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.accIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons
                    name={
                      acc.type === 'CASH'
                        ? 'cash-outline'
                        : acc.type === 'BANK'
                        ? 'business-outline'
                        : acc.type === 'MOBILE_BANKING'
                        ? 'phone-portrait-outline'
                        : 'wallet-outline'
                    }
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <BengaliText style={[styles.accName, { color: colors.text }]}>{acc.name}</BengaliText>
                  <BengaliText style={[styles.accMeta, { color: colors.textSecondary }]}>
                    {acc.bankName ? `${acc.bankName} • ` : ''}
                    {acc.accountNumber ? `হিসাব: ${acc.accountNumber} • ` : ''}
                    {acc.type}
                  </BengaliText>
                </View>

                <BengaliText style={[styles.accBalance, { color: colors.primary }]}>
                  {MoneyUtil.formatBengaliCurrency(acc.currentBalancePaisa)}
                </BengaliText>
              </View>
            ))}
          </>
        ) : (
          <>
            {/* Account Type Grid */}
            <BengaliText style={[styles.inputLabel, { color: colors.textSecondary }]}>
              অ্যাকাউন্টের ধরণ নির্বাচন করুন
            </BengaliText>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((t) => {
                const isSelected = type === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setType(t.type)}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={isSelected ? '#FFFFFF' : colors.text}
                      style={{ marginRight: 4 }}
                    />
                    <BengaliText
                      style={[
                        styles.typeChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {t.label}
                    </BengaliText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              label="অ্যাকাউন্টের নাম"
              value={name}
              onChangeText={setName}
              placeholder="যেমন: ডাচ বাংলা ব্যাংক স্যালারি অ্যাকাউন্ট"
            />

            {(type === 'BANK' || type === 'SAVINGS') && (
              <TextInput
                label="ব্যাংকের নাম"
                value={bankName}
                onChangeText={setBankName}
                placeholder="যেমন: DBBL, City Bank, Brac Bank"
              />
            )}

            {(type === 'BANK' || type === 'MOBILE_BANKING') && (
              <TextInput
                label="অ্যাকাউন্ট বা মোবাইল নম্বর (ঐচ্ছিক)"
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="যেমন: 123-456-789 বা 017xxxxxxxx"
              />
            )}

            <AmountInput
              label="প্রারম্ভিক ব্যালেন্স (Opening Balance)"
              value={openingBalanceTaka}
              onChangeTaka={setOpeningBalanceTaka}
              placeholder="0.00"
            />

            <TextInput
              label="মন্তব্য (ঐচ্ছিক)"
              value={notes}
              onChangeText={setNotes}
              placeholder="অ্যাকাউন্ট সম্পর্কিত অতিরিক্ত তথ্য"
            />

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setMode('LIST')}
              >
                <BengaliText style={{ color: colors.textSecondary, fontWeight: '600' }}>বাতিল</BengaliText>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="অ্যাকাউন্ট যুক্ত করুন"
                  onPress={handleCreate}
                  loading={isSubmitting}
                  disabled={!name.trim()}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 12,
    flex: 1,
    paddingRight: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  accIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accName: {
    fontSize: 14,
    fontWeight: '700',
  },
  accMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  accBalance: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
