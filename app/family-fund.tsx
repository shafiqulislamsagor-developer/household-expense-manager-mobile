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
import {
  FamilyFundSummary,
  FamilyFundTransaction,
  HouseholdLoan,
} from '../src/types';

export default function FamilyFundScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FamilyFundSummary | null>(null);
  const [transactions, setTransactions] = useState<FamilyFundTransaction[]>([]);
  const [loans, setLoans] = useState<HouseholdLoan[]>([]);

  // Period / Month selection (YYYY-MM)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Modals
  const [reimburseModal, setReimburseModal] = useState(false);
  const [reimburseAmountTaka, setReimburseAmountTaka] = useState('');
  const [reimburseMemberId, setReimburseMemberId] = useState('');
  const [reimburseNote, setReimburseNote] = useState('');
  const [isSubmittingReimburse, setIsSubmittingReimburse] = useState(false);

  const [loanModal, setLoanModal] = useState(false);
  const [lenderName, setLenderName] = useState('');
  const [lenderPhone, setLenderPhone] = useState('');
  const [loanAmountTaka, setLoanAmountTaka] = useState('');
  const [loanNote, setLoanNote] = useState('');
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);

  // Members list for dropdown
  const [members, setMembers] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, txRes, loanRes, memRes] = await Promise.all([
        ApiClient.getFamilyFundSummary(selectedMonth),
        ApiClient.listFundTransactions(selectedMonth),
        ApiClient.listHouseholdLoans(),
        ApiClient.getHouseholdMembers(),
      ]);

      if (sumRes?.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (txRes?.success && Array.isArray(txRes.data)) {
        setTransactions(txRes.data);
      }
      if (loanRes?.success && Array.isArray(loanRes.data)) {
        setLoans(loanRes.data);
      }
      if (memRes?.success && Array.isArray(memRes.data)) {
        setMembers(memRes.data);
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'ফান্ডের তথ্য লোড করা যায়নি।' });
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

  const handleReimburse = async () => {
    const num = parseFloat(reimburseAmountTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }
    if (!reimburseMemberId) {
      showToast({ type: 'error', message: 'সদস্য নির্বাচন করুন।' });
      return;
    }

    setIsSubmittingReimburse(true);
    try {
      const res = await ApiClient.reimburseMember({
        memberUserId: reimburseMemberId,
        amountPaisa: MoneyUtil.takaToPaisa(num),
        paymentMethod: 'CASH',
        note: reimburseNote.trim(),
      });
      if (res?.success) {
        showToast({ type: 'success', message: 'রিইমবার্সমেন্ট সফলভাবে প্রদান করা হয়েছে।' });
        setReimburseModal(false);
        setReimburseAmountTaka('');
        setReimburseNote('');
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'ব্যর্থ হয়েছে।' });
    } finally {
      setIsSubmittingReimburse(false);
    }
  };

  const handleRecordLoan = async () => {
    const num = parseFloat(loanAmountTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }
    if (!lenderName.trim()) {
      showToast({ type: 'error', message: 'ঋণদাতার নাম লিখুন।' });
      return;
    }

    setIsSubmittingLoan(true);
    try {
      const res = await ApiClient.recordHouseholdLoan({
        lenderName: lenderName.trim(),
        lenderPhone: lenderPhone.trim(),
        principalPaisa: MoneyUtil.takaToPaisa(num),
        depositToFund: true,
        paymentMethod: 'CASH',
        notes: loanNote.trim(),
      });
      if (res?.success) {
        showToast({ type: 'success', message: 'পারিবারিক ঋণ ফান্ডে যুক্ত হয়েছে।' });
        setLoanModal(false);
        setLenderName('');
        setLenderPhone('');
        setLoanAmountTaka('');
        setLoanNote('');
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'ব্যর্থ হয়েছে।' });
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="পারিবারিক ফান্ড ব্যবস্থাপনা"
        subtitle="কমন ফান্ড ক্যাশ, চাঁদা, বকেয়া ও দায়-দেনার হিসাব"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HERO FUND CASH CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.heroIconBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wallet" size={20} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <BengaliText variant="caption" color={colors.textMuted} weight="600">
                  বর্তমান প্রকৃত ফান্ড ব্যালেন্স (Actual Cash)
                </BengaliText>
                <BengaliText variant="h1" color={colors.primary} weight="800">
                  {summary ? MoneyUtil.formatBengaliCurrency(summary.currentFundBalancePaisa) : '৳০.০০'}
                </BengaliText>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Opening vs Cash Inflows vs Cash Outflows */}
          <View style={styles.heroMetricRow}>
            <View style={styles.heroMetricCol}>
              <BengaliText variant="caption" color={colors.textMuted}>
                প্রারম্ভিক জমা
              </BengaliText>
              <BengaliText variant="bodyBold" color={colors.text}>
                {summary ? MoneyUtil.formatBengaliCurrency(summary.openingBalancePaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            <View style={styles.heroMetricCol}>
              <BengaliText variant="caption" color={colors.textMuted}>
                মোট প্রাপ্তি (+আয়)
              </BengaliText>
              <BengaliText variant="bodyBold" color={colors.success}>
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalMoneyReceivedPaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            <View style={styles.heroMetricCol}>
              <BengaliText variant="caption" color={colors.textMuted}>
                মোট পরিশোধ (-খরচ)
              </BengaliText>
              <BengaliText variant="bodyBold" color={colors.error}>
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalMoneyPaidPaisa) : '৳০.০০'}
              </BengaliText>
            </View>
          </View>

          {/* Strict Separation Notice */}
          <View
            style={[
              styles.infoNoticeBox,
              { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
            <BengaliText variant="caption" color={colors.textMuted} style={styles.infoNoticeText}>
              ফান্ড ব্যালেন্স = প্রারম্ভিক জমা + নিশ্চিত প্রাপ্তি - নিশ্চিত পরিশোধ। বকেয়া চাঁদা কখনোই নগদ ক্যাশ হিসেবে যুক্ত হয় না।
            </BengaliText>
          </View>
        </View>

        {/* 4 FAST MODULE ACTION SHORTCUTS */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/member-dues')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#3B1515' : '#FEF2F2' }]}>
              <Ionicons name="people-outline" size={18} color={colors.danger} />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              সদস্য বকেয়া ও চাঁদা
            </BengaliText>
            <BengaliText variant="caption" color={colors.danger} weight="700">
              {summary ? MoneyUtil.formatBengaliCurrency(summary.totalOutstandingMemberDuesPaisa) : '৳০.০০'} বাকি
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/expense-sharing')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              খরচ বিভাজন এন্ট্রি
            </BengaliText>
            <BengaliText variant="caption" color={colors.primary} weight="700">
              সমান / % / নির্দিষ্ট
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/monthly-plan')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}>
              <Ionicons name="calendar-outline" size={18} color="#0284C7" />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              মাসিক বাজেট প্ল্যান
            </BengaliText>
            <BengaliText variant="caption" color="#0284C7" weight="700">
              পরিকল্পনা বনাম ব্যয়
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setLoanModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: isDark ? '#362F1E' : '#FFFBEB' }]}>
              <Ionicons name="receipt-outline" size={18} color={colors.warning} />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              পারিবারিক ঋণ ও ধার
            </BengaliText>
            <BengaliText variant="caption" color={colors.warning} weight="700">
              {summary ? MoneyUtil.formatBengaliCurrency(summary.totalOutstandingFamilyLoansPaisa) : '৳০.০০'} দায়
            </BengaliText>
          </TouchableOpacity>
        </View>

        {/* REAL-LIFE FAMILY & ROOMMATE MODULES */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/family-transfers')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#3B82F618' }]}>
              <Ionicons name="swap-horizontal" size={18} color="#2563EB" />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              অর্থ স্থানান্তর ও ওয়ালেট
            </BengaliText>
            <BengaliText variant="caption" color="#2563EB" weight="700">
              বাজার বাজেট ও কাস্টডি
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/family-statement')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="document-text-outline" size={18} color="#059669" />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              আর্থিক বিবরণী
            </BengaliText>
            <BengaliText variant="caption" color="#059669" weight="700">
              পূর্ণাঙ্গ সেটেলমেন্ট
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/family-members')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#8B5CF618' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#7C3AED" />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              সদস্য ভূমিকা ও স্পনসর
            </BengaliText>
            <BengaliText variant="caption" color="#7C3AED" weight="700">
              সম্পর্ক ও দায়িত্ব
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/room-management')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#F59E0B18' }]}>
              <Ionicons name="home-outline" size={18} color="#D97706" />
            </View>
            <BengaliText variant="bodyBold" color={colors.text} style={styles.actionCardTitle}>
              রুম ও বাড়িভাড়া
            </BengaliText>
            <BengaliText variant="caption" color="#D97706" weight="700">
              মেস ও রুম বিভাজন
            </BengaliText>
          </TouchableOpacity>
        </View>

        {/* KPI METRIC CARDS ROW */}
        <View style={styles.metricsGrid}>
          <View style={styles.gridRow}>
            <FinancialSummaryCard
              title="সদস্যদের মোট চাঁদা"
              amountPaisa={summary?.totalMemberContributionsPaisa || 0}
              subtitle="নিশ্চিত সংগৃহীত চাঁদা"
              icon="wallet"
              variant="income"
              style={{ flex: 1, marginRight: 6 }}
            />
            <FinancialSummaryCard
              title="অন্যান্য পারিবারিক আয়"
              amountPaisa={summary?.totalOtherFamilyIncomePaisa || 0}
              subtitle="দান বা অতিরিক্ত আয়"
              icon="arrow-down-circle"
              variant="income"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>

          <View style={styles.gridRow}>
            <FinancialSummaryCard
              title="মোট পারিবারিক ব্যয়"
              amountPaisa={summary?.totalFamilyExpensesPaisa || 0}
              subtitle="ফান্ড ও ব্যক্তিগত মিলে মোট"
              icon="receipt"
              variant="expense"
              style={{ flex: 1, marginRight: 6 }}
            />
            <FinancialSummaryCard
              title="পারিবারিক মোট দায় (Payables)"
              amountPaisa={summary?.totalHouseholdPayablesPaisa || 0}
              subtitle="ঋণ + ক্রেডিট ব্যালেন্স"
              icon="shield-outline"
              variant="expense"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
        </View>

        {/* ADMIN ACTION: REIMBURSE MEMBER */}
        {isAdmin && (
          <View style={{ marginVertical: 8 }}>
            <PrimaryButton
              title="সদস্যকে খরচের রিইমবার্সমেন্ট দিন"
              onPress={() => setReimburseModal(true)}
              variant="accent"
              icon="cash-outline"
              size="md"
            />
          </View>
        )}

        {/* FUND TRANSACTION LEDGER */}
        <View style={styles.ledgerSection}>
          <SectionHeader
            title="ফান্ড লেনদেন লেজার"
            subtitle="দ্বৈত এন্ট্রি ভিত্তিক অপরিবর্তনশীল রেকর্ড"
            count={transactions.length}
          />

          {transactions.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="কোনো ফান্ড লেনদেন নেই"
              description="চলতি মাসে কোনো ফান্ড জমা বা খরচের হিসাব রেকর্ড করা হয়নি।"
            />
          ) : (
            transactions.map((tx) => {
              const isInflow = tx.direction === 'INFLOW';
              return (
                <View
                  key={tx._id || tx.clientUuid}
                  style={[
                    styles.txCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDark ? colors.borderStrong : colors.border,
                    },
                  ]}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconWrap,
                        {
                          backgroundColor: isInflow
                            ? isDark ? '#064E3B' : '#ECFDF5'
                            : isDark ? '#3B1515' : '#FEF2F2',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isInflow ? 'arrow-down-outline' : 'arrow-up-outline'}
                        size={17}
                        color={isInflow ? colors.accent : colors.danger}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <BengaliText variant="bodyBold" color={colors.text} numberOfLines={1}>
                        {tx.reference || tx.note || tx.type}
                      </BengaliText>
                      <BengaliText variant="caption" color={colors.textMuted}>
                        {new Date(tx.date).toLocaleDateString('bn-BD')} • {tx.paymentMethod}
                      </BengaliText>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <BengaliText
                      variant="bodyBold"
                      color={isInflow ? colors.accent : colors.danger}
                      weight="800"
                    >
                      {isInflow ? '+' : '-'} {MoneyUtil.formatBengaliCurrency(tx.amountPaisa)}
                    </BengaliText>
                    <BengaliText variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                      {tx.type}
                    </BengaliText>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* REIMBURSE MODAL */}
      <BottomSheet
        visible={reimburseModal}
        title="সদস্যকে রিইমবার্সমেন্ট প্রদান"
        subtitle="সদস্য ব্যক্তিগত পকেট থেকে পারিবারিক খরচ করলে ফান্ড থেকে পরিশোধ করুন"
        onClose={() => setReimburseModal(false)}
      >
        <View style={{ gap: 12 }}>
          <BengaliText variant="caption" color={colors.textMuted}>
            প্রাপক সদস্য নির্বাচন করুন:
          </BengaliText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {members.map((m) => {
              const isSelected = reimburseMemberId === m._id;
              return (
                <TouchableOpacity
                  key={m._id}
                  onPress={() => setReimburseMemberId(m._id)}
                  style={[
                    styles.memberChip,
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
                    {m.name}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <AmountInput
            label="টাকার পরিমাণ (৳)"
            value={reimburseAmountTaka}
            onChangeTaka={setReimburseAmountTaka}
            placeholder="০.০০"
          />

          <TextInput
            label="বিবরণ / নোট"
            value={reimburseNote}
            onChangeText={setReimburseNote}
            placeholder="যেমন: বাজার বিল পরিশোধ"
          />

          <PrimaryButton
            title="রিইমবার্সমেন্ট নিশ্চিত করুন"
            onPress={handleReimburse}
            loading={isSubmittingReimburse}
            variant="accent"
            icon="checkmark-circle-outline"
            style={{ marginTop: 8 }}
          />
        </View>
      </BottomSheet>

      {/* RECORD LOAN MODAL */}
      <BottomSheet
        visible={loanModal}
        title="পারিবারিক ঋণ / ধার এন্ট্রি"
        subtitle="বাইরে থেকে পরিবারের জন্য গৃহীত ঋণ ফান্ডে জমা করুন"
        onClose={() => setLoanModal(false)}
      >
        <View style={{ gap: 12 }}>
          <TextInput
            label="ঋণদাতার নাম"
            value={lenderName}
            onChangeText={setLenderName}
            placeholder="যেমন: ব্যাংক / আত্মীয়"
          />

          <TextInput
            label="ফোন নম্বর (ঐচ্ছিক)"
            value={lenderPhone}
            onChangeText={setLenderPhone}
            placeholder="০১৭xxxxxxxx"
            keyboardType="phone-pad"
          />

          <AmountInput
            label="ঋণের পরিমাণ (৳)"
            value={loanAmountTaka}
            onChangeTaka={setLoanAmountTaka}
            placeholder="০.০০"
          />

          <TextInput
            label="মন্তব্য / নোট"
            value={loanNote}
            onChangeText={setLoanNote}
            placeholder="যেমন: ৩ মাসের জন্য নেওয়া"
          />

          <PrimaryButton
            title="ঋণ ফান্ডে জমা করুন"
            onPress={handleRecordLoan}
            loading={isSubmittingLoan}
            variant="primary"
            icon="wallet-outline"
            style={{ marginTop: 8 }}
          />
        </View>
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
  heroCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    gap: 8,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  metricsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ledgerSection: {
    marginTop: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
