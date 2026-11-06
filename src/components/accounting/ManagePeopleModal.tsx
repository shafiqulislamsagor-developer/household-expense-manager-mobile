import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { BottomSheet } from '../ui/BottomSheet';
import { TextInput } from '../ui/TextInput';
import { AmountInput } from '../ui/AmountInput';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Person, PersonRelationshipType } from '../../types';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  people: Person[];
  onCreatePerson: (data: {
    name: string;
    phone?: string;
    relationship: PersonRelationshipType;
    address?: string;
    notes?: string;
    openingReceivableTaka?: string;
    openingPayableTaka?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const RELATIONSHIPS: Array<{
  type: PersonRelationshipType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { type: 'FAMILY', label: 'পরিবার', icon: 'home-outline' },
  { type: 'FRIEND', label: 'বন্ধু', icon: 'people-outline' },
  { type: 'RELATIVE', label: 'আত্মীয়', icon: 'heart-outline' },
  { type: 'CUSTOMER', label: 'গ্রাহক / কাস্টমার', icon: 'briefcase-outline' },
  { type: 'OTHER', label: 'অন্যান্য', icon: 'person-outline' },
];

export const ManagePeopleModal: React.FC<Props> = ({
  visible,
  onClose,
  people,
  onCreatePerson,
  isSubmitting = false,
}) => {
  const { colors, isDark } = useTheme();

  const [mode, setMode] = useState<'LIST' | 'CREATE'>('LIST');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<PersonRelationshipType>('FRIEND');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingReceivableTaka, setOpeningReceivableTaka] = useState('');
  const [openingPayableTaka, setOpeningPayableTaka] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreatePerson({
      name: name.trim(),
      phone: phone.trim(),
      relationship,
      address: address.trim(),
      notes: notes.trim(),
      openingReceivableTaka,
      openingPayableTaka,
    });
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setOpeningReceivableTaka('');
    setOpeningPayableTaka('');
    setMode('LIST');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setMode('LIST');
        onClose();
      }}
      title={mode === 'LIST' ? 'পরিচিত ব্যক্তি ও আর্থিক হিসেব' : 'নতুন ব্যক্তি যুক্ত করুন'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {mode === 'LIST' ? (
          <>
            <View style={styles.topRow}>
              <BengaliText style={[styles.subTitle, { color: colors.textSecondary }]}>
                যাদের সাথে আপনার লেনদেন, ঋণ বা ধারের হিসেব রয়েছে
              </BengaliText>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => setMode('CREATE')}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <BengaliText style={[styles.addBtnText, { color: colors.primary }]}>নতুন ব্যক্তি</BengaliText>
              </TouchableOpacity>
            </View>

            {people.length === 0 ? (
              <BengaliText style={[styles.emptyText, { color: colors.textSecondary }]}>
                এখনো কোনো পরিচিত ব্যক্তি তালিকাভুক্ত করা হয়নি।
              </BengaliText>
            ) : (
              people.map((p) => (
                <View
                  key={p._id}
                  style={[styles.personCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.avatarWrap, { backgroundColor: colors.secondaryLight }]}>
                    <Ionicons name="person" size={18} color={colors.secondary} />
                  </View>

                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.nameRow}>
                      <BengaliText style={[styles.personName, { color: colors.text }]}>{p.name}</BengaliText>
                      <View style={[styles.relBadge, { backgroundColor: colors.primaryLight }]}>
                        <BengaliText style={[styles.relText, { color: colors.primary }]}>{p.relationship}</BengaliText>
                      </View>
                    </View>
                    {p.phone ? (
                      <BengaliText style={[styles.personPhone, { color: colors.textSecondary }]}>
                        ফোন: {p.phone}
                      </BengaliText>
                    ) : null}
                  </View>

                  <View style={styles.balanceCol}>
                    {p.currentReceivablePaisa > 0 && (
                      <BengaliText style={[styles.recBalance, { color: colors.success }]}>
                        পাওনা: {MoneyUtil.formatBengaliCurrency(p.currentReceivablePaisa)}
                      </BengaliText>
                    )}
                    {p.currentPayablePaisa > 0 && (
                      <BengaliText style={[styles.payBalance, { color: colors.danger }]}>
                        দেনা: {MoneyUtil.formatBengaliCurrency(p.currentPayablePaisa)}
                      </BengaliText>
                    )}
                    {p.currentReceivablePaisa === 0 && p.currentPayablePaisa === 0 && (
                      <BengaliText style={[styles.zeroBalance, { color: colors.textSecondary }]}>
                        হিসাব সমান
                      </BengaliText>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <TextInput
              label="ব্যক্তির নাম"
              value={name}
              onChangeText={setName}
              placeholder="যেমন: রহিম সাহেব, করিম ভাই"
            />

            <TextInput
              label="মোবাইল নম্বর (ঐচ্ছিক)"
              value={phone}
              onChangeText={setPhone}
              placeholder="যেমন: 01712345678"
              keyboardType="phone-pad"
            />

            {/* Relationship */}
            <BengaliText style={[styles.inputLabel, { color: colors.textSecondary }]}>
              সম্পর্কের ধরণ
            </BengaliText>
            <View style={styles.typeGrid}>
              {RELATIONSHIPS.map((r) => {
                const isSelected = relationship === r.type;
                return (
                  <TouchableOpacity
                    key={r.type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setRelationship(r.type)}
                  >
                    <Ionicons
                      name={r.icon}
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
                      {r.label}
                    </BengaliText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              label="ঠিকানা (ঐচ্ছিক)"
              value={address}
              onChangeText={setAddress}
              placeholder="ঠিকানা বা এলাকা"
            />

            <AmountInput
              label="পূর্বের প্রারম্ভিক পাওনা (থাকলে)"
              value={openingReceivableTaka}
              onChangeTaka={setOpeningReceivableTaka}
              placeholder="0.00"
            />

            <AmountInput
              label="পূর্বের প্রারম্ভিক দেনা (থাকলে)"
              value={openingPayableTaka}
              onChangeTaka={setOpeningPayableTaka}
              placeholder="0.00"
            />

            <TextInput
              label="মন্তব্য (ঐচ্ছিক)"
              value={notes}
              onChangeText={setNotes}
              placeholder="ব্যক্তি সম্পর্কিত কোনো বিশেষ তথ্য"
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
                  title="ব্যক্তি যুক্ত করুন"
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
  emptyText: {
    fontSize: 12,
    paddingVertical: 12,
    textAlign: 'center',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
  },
  relBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  relText: {
    fontSize: 9,
    fontWeight: '700',
  },
  personPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  recBalance: {
    fontSize: 12,
    fontWeight: '700',
  },
  payBalance: {
    fontSize: 12,
    fontWeight: '700',
  },
  zeroBalance: {
    fontSize: 11,
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
