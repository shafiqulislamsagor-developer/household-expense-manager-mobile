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
import { MemberDueDetail } from '../src/types';

export default function MemberDuesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [duesList, setDuesList] = useState<MemberDueDetail[]>([]);

  // Month state (YYYY-MM)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Manual payment record modal
  const [recordModal, setRecordModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDueDetail | null>(null);
  const [paymentAmountTaka, setPaymentAmountTaka] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK'>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Verification modal for pending contributions
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [verifyModal, setVerifyModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [duesRes, contribRes] = await Promise.all([
        ApiClient.getMemberDues(selectedMonth),
        ApiClient.listContributions(),
      ]);

      if (duesRes?.success && Array.isArray(duesRes.data)) {
        setDuesList(duesRes.data);
      }
      if (contribRes?.success && Array.isArray(contribRes.data)) {
        const pList = contribRes.data.filter((c: any) => c.status === 'PENDING');
        setPendingList(pList);
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'বকেয়ার তথ্য পাওয়া যায়নি।' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenRecordPayment = (member: MemberDueDetail) => {
    setSelectedMember(member);
    setPaymentAmountTaka(
      member.netDuePaisa > 0 ? (member.netDuePaisa / 100).toString() : ''
    );
    setPaymentRef('');
    setPaymentNote('চাঁদা কালেকশন');
    setRecordModal(true);
  };

  const handleRecordPaymentSubmit = async () => {
    if (!selectedMember) return;
    const num = parseFloat(paymentAmountTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // 1. Create contribution
      const paisa = MoneyUtil.takaToPaisa(num);
      const createRes = await ApiClient.recordContribution({
        userId: selectedMember.userId,
        amountPaisa: paisa,
        paymentMethod,
        reference: paymentRef.trim(),
        note: paymentNote.trim(),
        status: isAdmin ? 'VERIFIED' : 'PENDING',
      });

      // 2. If admin, confirm payment to trigger fund inflow and credit balance calculation
      if (createRes?.success && createRes.data?._id && isAdmin) {
        await ApiClient.confirmMemberPayment(createRes.data._id);
      }

      showToast({
        type: 'success',
        message: `${selectedMember.userName}-এর ৳${num} পরিশোধ নিশ্চিত করা হয়েছে!`,
      });
      setRecordModal(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'পেমেন্ট যুক্ত করা যায়নি।' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleVerifyPending = async (contributionId: string) => {
    setIsVerifying(true);
    try {
      await ApiClient.confirmMemberPayment(contributionId);
      showToast({ type: 'success', message: 'পেমেন্ট সফলভাবে অনুমোদন করা হয়েছে!' });
      setVerifyModal(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'অনুমোদন করা যায়নি।' });
    } finally {
      setIsVerifying(false);
    }
  };

  const totalOwedPaisa = duesList.reduce(
    (sum, d) => (d.netDuePaisa > 0 ? sum + d.netDuePaisa : sum),
    0
  );
  const totalCreditPaisa = duesList.reduce(
    (sum, d) => (d.netDuePaisa < 0 ? sum + d.creditBalancePaisa : sum),
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="সদস্য বকেয়া ও কালেকশন"
        subtitle="সদস্যদের হিসাব, মাসিক বকেয়া ও পেমেন্ট অনুমোদন"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* SUMMARY HERO BAR */}
        <View
          style={[
            styles.heroSummary,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <BengaliText variant="caption" color={colors.textMuted}>
                মোট সদস্য বকেয়া (Receivables)
              </BengaliText>
              <BengaliText variant="h2" color={colors.danger} weight="800">
                {MoneyUtil.formatBengaliCurrency(totalOwedPaisa)}
              </BengaliText>
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <BengaliText variant="caption" color={colors.textMuted}>
                মোট অগ্রিম জমা (Credits)
              </BengaliText>
              <BengaliText variant="h2" color={colors.primary} weight="800">
                {MoneyUtil.formatBengaliCurrency(totalCreditPaisa)}
              </BengaliText>
            </View>
          </View>

          {/* Pending payments alert button */}
          {pendingList.length > 0 && (
            <TouchableOpacity
              style={[
                styles.pendingBanner,
                { backgroundColor: isDark ? '#3B240E' : '#FFFBEB', borderColor: colors.warning },
              ]}
              onPress={() => setVerifyModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={18} color={colors.warning} />
              <BengaliText variant="caption" color={colors.warning} weight="700" style={{ flex: 1, marginLeft: 6 }}>
                {pendingList.length}টি পেন্ডিং পেমেন্ট অনুমোদনের অপেক্ষায় আছে!
              </BengaliText>
              <Ionicons name="chevron-forward" size={16} color={colors.warning} />
            </TouchableOpacity>
          )}
        </View>

        {/* MEMBERS DUES LIST */}
        <SectionHeader
          title="সদস্যদের ব্যালেন্সের তালিকা"
          subtitle="বকেয়া = পূর্বের বকেয়া + খরচের অংশ - পরিশোধ - ক্রেডিট"
          count={duesList.length}
        />

        {duesList.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="কোনো সদস্য পাওয়া যায়নি"
            description="পরিবারে কোনো সক্রিয় সদস্যের হিসাব পাওয়া যায়নি।"
          />
        ) : (
          duesList.map((item) => {
            const isDue = item.netDuePaisa > 0;
            const isCredit = item.netDuePaisa < 0;

            return (
              <View
                key={item.userId}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                {/* Header: Name, Phone & Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <BengaliText variant="bodyBold" color={colors.text} numberOfLines={1}>
                      {item.userName}
                    </BengaliText>
                    {item.phone && (
                      <BengaliText variant="caption" color={colors.textMuted}>
                        {item.phone}
                      </BengaliText>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isDue
                          ? item.status === 'PARTIAL'
                            ? isDark ? '#362F1E' : '#FFFBEB'
                            : isDark ? '#3B1515' : '#FEF2F2'
                          : isCredit
                          ? isDark ? '#1E3A5F' : '#E0F2FE'
                          : isDark ? '#064E3B' : '#ECFDF5',
                        borderColor: isDue
                          ? item.status === 'PARTIAL' ? colors.warning : colors.danger
                          : isCredit ? colors.primary : colors.accent,
                      },
                    ]}
                  >
                    <BengaliText
                      variant="caption"
                      color={
                        isDue
                          ? item.status === 'PARTIAL' ? colors.warning : colors.danger
                          : isCredit ? colors.primary : colors.accent
                      }
                      weight="700"
                    >
                      {isDue
                        ? item.status === 'PARTIAL' ? 'আংশিক পরিশোধ' : 'বকেয়া'
                        : isCredit ? 'অগ্রিম ক্রেডিট' : 'পরিশোধিত'}
                    </BengaliText>
                  </View>
                </View>

                {/* Calculation Breakdown Rows */}
                <View style={[styles.breakdownGrid, { backgroundColor: isDark ? colors.surfaceSubdued : '#F8FAFC' }]}>
                  <View style={styles.breakdownRow}>
                    <BengaliText variant="caption" color={colors.textMuted}>
                      বরাদ্দকৃত খরচের অংশ:
                    </BengaliText>
                    <BengaliText variant="caption" color={colors.text} weight="700">
                      {MoneyUtil.formatBengaliCurrency(item.assignedExpenseSharesPaisa)}
                    </BengaliText>
                  </View>

                  <View style={styles.breakdownRow}>
                    <BengaliText variant="caption" color={colors.textMuted}>
                      মোট পরিশোধিত চাঁদা:
                    </BengaliText>
                    <BengaliText variant="caption" color={colors.success} weight="700">
                      {MoneyUtil.formatBengaliCurrency(item.confirmedPaymentsPaisa)}
                    </BengaliText>
                  </View>

                  {item.validCreditsPaisa > 0 && (
                    <View style={styles.breakdownRow}>
                      <BengaliText variant="caption" color={colors.textMuted}>
                        পকেট থেকে পরিশোধ/ক্রেডিট:
                      </BengaliText>
                      <BengaliText variant="caption" color={colors.primary} weight="700">
                        {MoneyUtil.formatBengaliCurrency(item.validCreditsPaisa)}
                      </BengaliText>
                    </View>
                  )}

                  <View style={[styles.breakdownDivider, { backgroundColor: colors.borderLight }]} />

                  <View style={styles.breakdownRow}>
                    <BengaliText variant="bodyBold" color={colors.text}>
                      {isCredit ? 'অগ্রিম জমা (ক্রেডিট):' : 'নিট বকেয়া:'}
                    </BengaliText>
                    <BengaliText
                      variant="bodyBold"
                      color={isCredit ? colors.primary : isDue ? colors.danger : colors.accent}
                      weight="800"
                    >
                      {isCredit
                        ? MoneyUtil.formatBengaliCurrency(item.creditBalancePaisa)
                        : MoneyUtil.formatBengaliCurrency(item.netDuePaisa)}
                    </BengaliText>
                  </View>
                </View>

                {/* Pending Payments Notice */}
                {item.pendingPaymentsCount > 0 && (
                  <View style={styles.pendingPill}>
                    <Ionicons name="time-outline" size={13} color={colors.warning} />
                    <BengaliText variant="caption" color={colors.warning} weight="600" style={{ marginLeft: 4 }}>
                      {MoneyUtil.formatBengaliCurrency(item.pendingPaymentsPaisa)} অনুমোদনের অপেক্ষায়
                    </BengaliText>
                  </View>
                )}

                {/* Admin Action: Collect / Record Payment */}
                {isAdmin && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.collectBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleOpenRecordPayment(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cash-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <BengaliText variant="caption" color="#FFFFFF" weight="700">
                        টাকা জমা নিন / চাঁদা রেকর্ড
                      </BengaliText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* RECORD PAYMENT MODAL */}
      <BottomSheet
        visible={recordModal}
        title={`চাঁদা কালেকশন: ${selectedMember?.userName || ''}`}
        subtitle="সদস্যের কাছ থেকে প্রাপ্ত অর্থ ফান্ডে জমা করুন"
        onClose={() => setRecordModal(false)}
      >
        <View style={{ gap: 12 }}>
          <AmountInput
            label="প্রাপ্ত টাকার পরিমাণ (৳)"
            value={paymentAmountTaka}
            onChangeTaka={setPaymentAmountTaka}
            placeholder="০.০০"
          />

          <BengaliText variant="caption" color={colors.textMuted}>
            পরিশোধের মাধ্যম নির্বাচন করুন:
          </BengaliText>
          <View style={styles.methodRow}>
            {(['CASH', 'BKASH', 'NAGAD', 'BANK'] as const).map((m) => {
              const isSelected = paymentMethod === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPaymentMethod(m)}
                  style={[
                    styles.methodChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSubdued,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <BengaliText
                    variant="caption"
                    color={isSelected ? '#FFFFFF' : colors.text}
                    weight="700"
                  >
                    {m === 'CASH' ? 'নগদ ক্যাশ' : m === 'BKASH' ? 'বিকাশ' : m === 'NAGAD' ? 'নগদ' : 'ব্যাংক'}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label="ট্রানজেকশন আইডি / রেফারেন্স (ঐচ্ছিক)"
            value={paymentRef}
            onChangeText={setPaymentRef}
            placeholder="যেমন: TRX12345"
          />

          <TextInput
            label="মন্তব্য / নোট"
            value={paymentNote}
            onChangeText={setPaymentNote}
            placeholder="নোট লিখুন"
          />

          <PrimaryButton
            title="কালেকশন নিশ্চিত করুন"
            onPress={handleRecordPaymentSubmit}
            loading={isSubmittingPayment}
            variant="primary"
            icon="checkmark-done"
            style={{ marginTop: 8 }}
          />
        </View>
      </BottomSheet>

      {/* VERIFY PENDING PAYMENTS MODAL */}
      <BottomSheet
        visible={verifyModal}
        title="পেন্ডিং চাঁদা অনুমোদন"
        subtitle="সদস্যদের প্রেরিত চাঁদা চেক করে ফান্ডে যুক্ত করুন"
        onClose={() => setVerifyModal(false)}
      >
        <ScrollView style={{ maxHeight: 380 }}>
          {pendingList.map((p) => (
            <View
              key={p._id}
              style={[
                styles.pendingItemCard,
                { backgroundColor: colors.surfaceSubdued, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <BengaliText variant="bodyBold" color={colors.text}>
                  {p.userId?.name || 'সদস্য'}
                </BengaliText>
                <BengaliText variant="caption" color={colors.textMuted}>
                  {p.paymentMethod} • {p.reference || 'রেফারেন্স নেই'}
                </BengaliText>
                <BengaliText variant="caption" color={colors.textMuted}>
                  তারিখ: {new Date(p.date).toLocaleDateString('bn-BD')}
                </BengaliText>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <BengaliText variant="bodyBold" color={colors.accent} weight="800">
                  {MoneyUtil.formatBengaliCurrency(p.amountPaisa)}
                </BengaliText>
                <TouchableOpacity
                  style={[styles.verifyBtn, { backgroundColor: colors.accent }]}
                  onPress={() => handleVerifyPending(p._id)}
                  disabled={isVerifying}
                >
                  <BengaliText variant="caption" color="#FFFFFF" weight="700">
                    অনুমোদন
                  </BengaliText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  heroSummary: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  memberCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  breakdownGrid: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 4,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  pendingItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  verifyBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
