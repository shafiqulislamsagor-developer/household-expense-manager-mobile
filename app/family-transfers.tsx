import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../src/store';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { FinancialSummaryCard } from '../src/components/ui/FinancialSummaryCard';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { EmptyState } from '../src/components/ui/EmptyState';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { AmountInput } from '../src/components/ui/AmountInput';
import { TextInput } from '../src/components/ui/TextInput';
import { ApiClient } from '../src/services/apiClient';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';

interface FamilyTransferItem {
  _id: string;
  fromUserId: { _id: string; name: string; relationship?: string };
  toUserId: { _id: string; name: string; relationship?: string };
  fromAccountId: { _id: string; name: string; type: string };
  toAccountId: { _id: string; name: string; type: string };
  amountPaisa: number;
  date: string;
  purpose: string;
  status: 'CONFIRMED' | 'RETURNED' | 'CANCELLED';
  unspentRemainingPaisa: number;
  note?: string;
}

const PURPOSE_OPTIONS = [
  { value: 'GROCERY_BUDGET', label: 'বাজার খরচ', icon: 'cart-outline', desc: 'বাজার বা কেনাকাটার জন্য অগ্রিম অর্থ' },
  { value: 'MEDICAL_BUDGET', label: 'চিকিৎসা খরচ', icon: 'medkit-outline', desc: 'ওষুধ বা ডাক্তার খরচের জন্য' },
  { value: 'POCKET_MONEY', label: 'পকেট মানি', icon: 'cash-outline', desc: 'সন্তান বা পরিবারের সদস্যের হাতখরচ' },
  { value: 'FAMILY_SUPPORT', label: 'পারিবারিক সহায়তা', icon: 'heart-outline', desc: 'পরিবারের সদস্যকে সাধারণ আর্থিক সাহায্য' },
  { value: 'CUSTODY_HANDOVER', label: 'খরচের দায়িত্ব হস্তান্তর', icon: 'wallet-outline', desc: 'গৃহস্থালির ব্যয়ের দায়িত্ব রক্ষাকবচ' },
  { value: 'OTHER', label: 'অন্যান্য স্থানান্তর', icon: 'swap-horizontal-outline', desc: 'অন্যান্য অভ্যন্তরীণ লেনদেন' },
];

export default function FamilyTransfersScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transfers, setTransfers] = useState<FamilyTransferItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Transfer Modal
  const [transferModal, setTransferModal] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [amountTaka, setAmountTaka] = useState('');
  const [purpose, setPurpose] = useState('GROCERY_BUDGET');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Return Unused Cash Modal
  const [returnModal, setReturnModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<FamilyTransferItem | null>(null);
  const [returnAmountTaka, setReturnAmountTaka] = useState('');
  const [returnAccountId, setReturnAccountId] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, memRes, accRes] = await Promise.all([
        ApiClient.listFamilyTransfers(),
        ApiClient.getHouseholdMembers(),
        ApiClient.getAccounts(),
      ]);

      if (txRes?.success && Array.isArray(txRes.data)) {
        setTransfers(txRes.data);
      }
      if (memRes?.success && Array.isArray(memRes.data)) {
        setMembers(memRes.data);
      }
      if (accRes?.success && Array.isArray(accRes.data)) {
        setAccounts(accRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'ডাটা লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenTransfer = () => {
    setAmountTaka('');
    setNote('');
    setPurpose('GROCERY_BUDGET');
    if (members.length > 0) {
      const otherMember = members.find((m) => m._id !== user?.id) || members[0];
      setRecipientUserId(otherMember?._id || '');
    }
    if (accounts.length > 0) {
      setSourceAccountId(accounts[0]._id);
    }
    setTransferModal(true);
  };

  const handleSubmitTransfer = async () => {
    const num = parseFloat(amountTaka);
    if (isNaN(num) || num <= 0) {
      showToast('সঠিক টাকার পরিমাণ দিন', 'warning');
      return;
    }
    if (!recipientUserId) {
      showToast('প্রাপক সদস্য নির্বাচন করুন', 'warning');
      return;
    }
    if (!sourceAccountId) {
      showToast('প্রেরক অ্যাকাউন্ট নির্বাচন করুন', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await ApiClient.transferFamilyMoney({
        toUserId: recipientUserId,
        fromAccountId: sourceAccountId,
        amountPaisa: MoneyUtil.takaToPaisa(num),
        purpose,
        note: note.trim() || undefined,
      });

      if (res?.success) {
        showToast('টাকা সফলভাবে স্থানান্তর হয়েছে', 'success');
        setTransferModal(false);
        loadData();
      } else {
        showToast(res?.message || 'স্থানান্তর ব্যর্থ হয়েছে', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'স্থানান্তর ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReturn = (item: FamilyTransferItem) => {
    setSelectedTransfer(item);
    setReturnAmountTaka(MoneyUtil.paisaToTaka(item.unspentRemainingPaisa).toString());
    setReturnAccountId(item.fromAccountId?._id || accounts[0]?._id || '');
    setReturnNote('');
    setReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!selectedTransfer) return;
    const num = parseFloat(returnAmountTaka);
    if (isNaN(num) || num <= 0) {
      showToast('সঠিক টাকার পরিমাণ দিন', 'warning');
      return;
    }
    const maxPaisa = selectedTransfer.unspentRemainingPaisa;
    const returnPaisa = MoneyUtil.takaToPaisa(num);
    if (returnPaisa > maxPaisa) {
      showToast(`সর্বোচ্চ ফেরতযোগ্য: ${MoneyUtil.formatBengaliCurrency(maxPaisa)}`, 'warning');
      return;
    }

    try {
      setIsSubmittingReturn(true);
      const res = await ApiClient.returnUnusedCash(selectedTransfer._id, {
        amountPaisa: returnPaisa,
        targetAccountId: returnAccountId || undefined,
        note: returnNote.trim() || undefined,
      });

      if (res?.success) {
        showToast('অব্যবহৃত টাকা মূল অ্যাকাউন্টে ফেরত দেওয়া হয়েছে', 'success');
        setReturnModal(false);
        loadData();
      } else {
        showToast(res?.message || 'ফেরত সম্পন্ন করা যায়নি', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'ফেরত সম্পন্ন করা যায়নি', 'error');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Calculations
  const activeUnspentPaisa = transfers.reduce(
    (sum, t) => (t.status === 'CONFIRMED' ? sum + (t.unspentRemainingPaisa || 0) : sum),
    0
  );
  const totalTransferredPaisa = transfers.reduce((sum, t) => sum + t.amountPaisa, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="পারিবারিক অর্থ স্থানান্তর"
        subtitle="সদস্যদের মধ্যে দায়িত্ব ও খরচের বাজেট পরিচালনা"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <BengaliText style={[styles.infoTitle, { color: colors.text }]}>
              ডাবল-কাউন্টিং মুক্ত পারিবারিক মডেল
            </BengaliText>
            <BengaliText style={[styles.infoDesc, { color: colors.textMuted }]}>
              পরিবারের সদস্যকে (যেমন: বাবা কর্তৃক মাকে বাজার খরচ) টাকা হস্তান্তর কোনো ব্যক্তিগত ব্যয় বা আয় নয়। আসল ব্যয় তখনই রেকর্ড হবে যখন পণ্য ক্রয় করা হবে।
            </BengaliText>
          </View>
        </View>

        {/* Top Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <FinancialSummaryCard
              title="কাস্টডিতে অব্যবহৃত অর্থ"
              amountPaisa={activeUnspentPaisa}
              icon="wallet-outline"
              variant="balance"
              subtitle="সদস্যদের হাতে জমা আছে"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <FinancialSummaryCard
              title="মোট স্থানান্তর বাজেট"
              amountPaisa={totalTransferredPaisa}
              icon="swap-horizontal-outline"
              variant="income"
              subtitle="চলতি লেনদেন তালিকা"
            />
          </View>
        </View>

        {/* Quick Transfer Button */}
        <PrimaryButton
          title="নতুন অর্থ স্থানান্তর করুন"
          icon="paper-plane-outline"
          onPress={handleOpenTransfer}
          style={{ marginVertical: 12 }}
        />

        {/* Section: Transfers List */}
        <SectionHeader
          title="অর্থ স্থানান্তরের তালিকা"
          count={transfers.length}
        />

        {transfers.length === 0 ? (
          <EmptyState
            title="কোনো স্থানান্তর রেকর্ড পাওয়া যায়নি"
            description="পরিবারের সদস্যদের বাজার বা জরুরি খরচের টাকা পাঠাতে উপরের বোতামে চাপুন।"
            icon="swap-horizontal"
          />
        ) : (
          transfers.map((item) => {
            const hasUnspent = item.unspentRemainingPaisa > 0 && item.status === 'CONFIRMED';

            return (
              <View
                key={item._id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.personRow}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <BengaliText style={[styles.cardTitle, { color: colors.text }]}>
                        {item.fromUserId?.name || 'প্রেরক'} ➔ {item.toUserId?.name || 'প্রাপক'}
                      </BengaliText>
                      <BengaliText style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                        {new Date(item.date).toLocaleDateString('bn-BD')} • {item.fromAccountId?.name || 'অ্যাকাউন্ট'}
                      </BengaliText>
                    </View>
                  </View>

                  <BengaliText style={[styles.amountText, { color: colors.text }]}>
                    {MoneyUtil.formatBengaliCurrency(item.amountPaisa)}
                  </BengaliText>
                </View>

                {/* Purpose & Status Badges */}
                <View style={styles.badgeRow}>
                  <View style={[styles.tagBadge, { backgroundColor: '#3B82F618' }]}>
                    <BengaliText style={[styles.tagText, { color: '#2563EB' }]}>
                      {PURPOSE_OPTIONS.find((p) => p.value === item.purpose)?.label || item.purpose}
                    </BengaliText>
                  </View>

                  {item.status === 'RETURNED' ? (
                    <View style={[styles.tagBadge, { backgroundColor: '#10B98118' }]}>
                      <BengaliText style={[styles.tagText, { color: '#059669' }]}>
                        সম্পূর্ণ ফেরতপ্রাপ্ত
                      </BengaliText>
                    </View>
                  ) : hasUnspent ? (
                    <View style={[styles.tagBadge, { backgroundColor: '#F59E0B18' }]}>
                      <BengaliText style={[styles.tagText, { color: '#D97706' }]}>
                        অব্যবহৃত: {MoneyUtil.formatBengaliCurrency(item.unspentRemainingPaisa)}
                      </BengaliText>
                    </View>
                  ) : (
                    <View style={[styles.tagBadge, { backgroundColor: '#6B728018' }]}>
                      <BengaliText style={[styles.tagText, { color: '#4B5563' }]}>
                        সম্পূর্ণ খরচ হয়েছে
                      </BengaliText>
                    </View>
                  )}
                </View>

                {item.note ? (
                  <BengaliText style={[styles.noteText, { color: colors.textMuted }]}>
                    নোট: {item.note}
                  </BengaliText>
                ) : null}

                {/* Return button if unspent balance remains */}
                {hasUnspent && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.returnBtn, { borderColor: colors.primary }]}
                      onPress={() => handleOpenReturn(item)}
                    >
                      <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                      <BengaliText style={[styles.returnBtnText, { color: colors.primary }]}>
                        অব্যবহৃত টাকা ফেরত দিন
                      </BengaliText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL 1: TRANSFER MONEY */}
      <BottomSheet
        visible={transferModal}
        onClose={() => setTransferModal(false)}
        title="পরিবারের সদস্যকে টাকা স্থানান্তর"
      >
        <ScrollView style={{ maxHeight: 500 }}>
          {/* Recipient Picker */}
          <BengaliText style={[styles.label, { color: colors.text }]}>প্রাপক সদস্য নির্বাচন করুন *</BengaliText>
          <View style={styles.pillContainer}>
            {members.map((m) => {
              const isSelected = recipientUserId === m._id;
              return (
                <TouchableOpacity
                  key={m._id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRecipientUserId(m._id)}
                >
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {m.name}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Source Account Picker */}
          <BengaliText style={[styles.label, { color: colors.text }]}>কোন অ্যাকাউন্ট থেকে দিবেন? *</BengaliText>
          <View style={styles.pillContainer}>
            {accounts.map((acc) => {
              const isSelected = sourceAccountId === acc._id;
              return (
                <TouchableOpacity
                  key={acc._id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSourceAccountId(acc._id)}
                >
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {acc.name} ({MoneyUtil.formatBengaliCurrency(acc.currentBalancePaisa)})
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount */}
          <AmountInput
            label="টাকার পরিমাণ (টাকা) *"
            value={amountTaka}
            onChangeTaka={setAmountTaka}
            placeholder="0.00"
          />

          {/* Purpose */}
          <BengaliText style={[styles.label, { color: colors.text }]}>স্থানান্তরের উদ্দেশ্য *</BengaliText>
          <View style={styles.purposeGrid}>
            {PURPOSE_OPTIONS.map((p) => {
              const isSelected = purpose === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.purposeCard,
                    {
                      backgroundColor: isSelected ? colors.primary + '14' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPurpose(p.value)}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={20}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <BengaliText
                    style={[
                      styles.purposeLabel,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {p.label}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Note */}
          <TextInput
            label="বিবরণ / নোট (ঐচ্ছিক)"
            value={note}
            onChangeText={setNote}
            placeholder="যেমন: সপ্তাহের মাছ-মাংসের বাজার"
          />

          <PrimaryButton
            title="অর্থ স্থানান্তর নিশ্চিত করুন"
            onPress={handleSubmitTransfer}
            loading={isSubmitting}
            style={{ marginTop: 16, marginBottom: 24 }}
          />
        </ScrollView>
      </BottomSheet>

      {/* MODAL 2: RETURN UNUSED CASH */}
      <BottomSheet
        visible={returnModal}
        onClose={() => setReturnModal(false)}
        title="অব্যবহৃত টাকা ফেরত প্রদান"
      >
        <ScrollView style={{ maxHeight: 400 }}>
          <View style={[styles.returnNotice, { backgroundColor: colors.primary + '10' }]}>
            <BengaliText style={[styles.returnNoticeText, { color: colors.text }]}>
              {selectedTransfer?.toUserId?.name} এর কাছে অবশিষ্ট আছে:{' '}
              {MoneyUtil.formatBengaliCurrency(selectedTransfer?.unspentRemainingPaisa || 0)}। এটি মূল প্রেরকের কাছে ফেরত পাঠাতে নিচের ফরম পূরণ করুন।
            </BengaliText>
          </View>

          <AmountInput
            label="ফেরতের পরিমাণ (টাকা) *"
            value={returnAmountTaka}
            onChangeTaka={setReturnAmountTaka}
            placeholder="0.00"
          />

          <BengaliText style={[styles.label, { color: colors.text }]}>কোন অ্যাকাউন্টে ফেরত যাবে? *</BengaliText>
          <View style={styles.pillContainer}>
            {accounts.map((acc) => {
              const isSelected = returnAccountId === acc._id;
              return (
                <TouchableOpacity
                  key={acc._id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setReturnAccountId(acc._id)}
                >
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {acc.name}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label="নোট (ঐচ্ছিক)"
            value={returnNote}
            onChangeText={setReturnNote}
            placeholder="যেমন: উদ্বৃত্ত ৫০০ টাকা ক্যাশে ফেরত"
          />

          <PrimaryButton
            title="টাকা ফেরত নিশ্চিত করুন"
            onPress={handleSubmitReturn}
            loading={isSubmittingReturn}
            style={{ marginTop: 16, marginBottom: 24 }}
          />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  returnBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  purposeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  purposeLabel: {
    fontSize: 12,
  },
  returnNotice: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  returnNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
