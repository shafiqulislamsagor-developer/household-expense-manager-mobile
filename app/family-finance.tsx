import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { EmptyState } from '../src/components/ui/EmptyState';
import { CardSkeleton, TransactionSkeleton } from '../src/components/ui/LoadingSkeleton';
import { ConfirmationModal } from '../src/components/ui/ConfirmationModal';
import { GiveMoneyModal } from '../src/components/accounting/GiveMoneyModal';
import { ReceiveMoneyModal } from '../src/components/accounting/ReceiveMoneyModal';
import { ApiClient } from '../src/services/apiClient';
import { LocalDbService } from '../src/database/sqlite';
import { generateUuid } from '../src/utils/uuid';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';
import {
  FinancialAccount,
  Person,
  FamilyFinanceSummary,
  TransactionFlowType,
} from '../src/types';

type FamilyViewTab =
  | 'ALL_GIVEN'
  | 'EXPENSES'
  | 'LOANS'
  | 'ADVANCES'
  | 'GIFTS'
  | 'CONTRIBUTIONS'
  | 'RECEIVABLES'
  | 'REPAYMENTS';

export default function FamilyFinanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FamilyViewTab>('ALL_GIVEN');

  const [summary, setSummary] = useState<FamilyFinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // Modals State
  const [giveMoneyModalVisible, setGiveMoneyModalVisible] = useState(false);
  const [receiveMoneyModalVisible, setReceiveMoneyModalVisible] = useState(false);
  const [receiveInitialPersonId, setReceiveInitialPersonId] = useState<string | null>(null);
  const [receiveInitialFlowType, setReceiveInitialFlowType] = useState<TransactionFlowType>('LOAN_REPAYMENT');

  // Reversal Confirmation Modal
  const [reverseModalVisible, setReverseModalVisible] = useState(false);
  const [txToReverse, setTxToReverse] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Accounts & People
      const [accRes, pplRes, sumRes, txRes] = await Promise.all([
        ApiClient.getAccounts().catch(() => null),
        ApiClient.getPeople().catch(() => null),
        ApiClient.getFamilySummary().catch(() => null),
        ApiClient.getFamilyTransactions(activeTab).catch(() => null),
      ]);

      if (accRes?.success && accRes.data) {
        setAccounts(accRes.data);
      } else {
        const localAccs = await LocalDbService.getFinancialAccounts();
        setAccounts(localAccs);
      }

      if (pplRes?.success && pplRes.data) {
        setPeople(pplRes.data);
      } else {
        const localPeople = await LocalDbService.getPeople();
        setPeople(localPeople);
      }

      if (sumRes?.success && sumRes.data) {
        setSummary(sumRes.data);
      }

      if (txRes?.success && txRes.data) {
        setTransactions(txRes.data);
      }
    } catch (err: any) {
      console.warn('Failed to load family finance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Give Money Handler
  const handleGiveMoney = async (data: {
    accountId: string;
    personId?: string | null;
    flowType: TransactionFlowType;
    amountTaka: string;
    purpose?: string;
    notes?: string;
    dueDate?: string | null;
  }) => {
    const amountPaisa = MoneyUtil.takaToPaisa(parseFloat(data.amountTaka) || 0);
    const clientUuid = generateUuid();

    try {
      const res = await ApiClient.giveMoney({
        accountId: data.accountId,
        personId: data.personId || null,
        flowType: data.flowType,
        amountPaisa,
        purpose: data.purpose,
        notes: data.notes,
        dueDate: data.dueDate,
        clientUuid,
      });

      if (res.success) {
        showToast({ type: 'success', message: 'পারিবারিক টাকা প্রদানের হিসাব সফলভাবে সংরক্ষিত হয়েছে।' });
        setGiveMoneyModalVisible(false);
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'টাকা প্রদানের হিসাব সংরক্ষণ ব্যর্থ হয়েছে' });
    }
  };

  // Receive Money Handler
  const handleReceiveMoney = async (data: {
    accountId: string;
    personId?: string | null;
    flowType: TransactionFlowType;
    amountTaka: string;
    description?: string;
    notes?: string;
  }) => {
    const amountPaisa = MoneyUtil.takaToPaisa(parseFloat(data.amountTaka) || 0);
    const clientUuid = generateUuid();

    try {
      const res = await ApiClient.receiveMoney({
        accountId: data.accountId,
        personId: data.personId || null,
        flowType: data.flowType,
        amountPaisa,
        description: data.description,
        notes: data.notes,
        clientUuid,
      });

      if (res.success) {
        showToast({ type: 'success', message: 'টাকা গ্রহণের হিসাব সফলভাবে সংরক্ষিত হয়েছে।' });
        setReceiveMoneyModalVisible(false);
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'টাকা গ্রহণের হিসাব ব্যর্থ হয়েছে' });
    }
  };

  // Confirm Reversal Handler
  const handleConfirmReversal = async () => {
    if (!txToReverse) return;
    try {
      const res = await ApiClient.reversePersonalTransaction(
        txToReverse._id,
        'পারিবারিক লেনদেন প্রত্যাহার ও ব্যালেন্স রিভার্সাল'
      );
      if (res.success) {
        showToast({ type: 'success', message: 'লেনদেন প্রত্যাহার করা হয়েছে ও ব্যালেন্স সমন্বয় হয়েছে।' });
        setReverseModalVisible(false);
        setTxToReverse(null);
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'লেনদেন রিভার্স করতে সমস্যা হয়েছে' });
    }
  };

  const VIEW_TABS: Array<{ id: FamilyViewTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'ALL_GIVEN', label: 'সকল প্রদান', icon: 'list-outline' },
    { id: 'EXPENSES', label: 'পারিবারিক খরচ', icon: 'cart-outline' },
    { id: 'LOANS', label: 'পারিবারিক ঋণ', icon: 'hand-left-outline' },
    { id: 'ADVANCES', label: 'অগ্রিম হিসাব', icon: 'arrow-forward-circle-outline' },
    { id: 'GIFTS', label: 'উপহার / দান', icon: 'gift-outline' },
    { id: 'CONTRIBUTIONS', label: 'চাঁদা / ফান্ড', icon: 'wallet-outline' },
    { id: 'RECEIVABLES', label: 'পাওনা হিসাব', icon: 'hourglass-outline' },
    { id: 'REPAYMENTS', label: 'ফেরত হিসাব', icon: 'checkmark-done-circle-outline' },
  ];

  const getFlowBadge = (type: string) => {
    switch (type) {
      case 'FAMILY_EXPENSE':
        return { label: 'পারিবারিক ব্যয়', color: colors.error, bg: isDark ? '#3D1C1C' : '#FEF2F2' };
      case 'LOAN':
        return { label: 'ধার / ঋণ', color: '#0284C7', bg: isDark ? '#0C4A6E' : '#F0F9FF' };
      case 'ADVANCE':
        return { label: 'অগ্রিম', color: '#0D9488', bg: isDark ? '#134E4A' : '#F0FDFA' };
      case 'GIFT':
        return { label: 'উপহার', color: '#E11D48', bg: isDark ? '#4C0519' : '#FFF1F2' };
      case 'HOUSEHOLD_CONTRIBUTION':
        return { label: 'ফান্ড চাঁদা', color: colors.success, bg: isDark ? '#064E3B' : '#ECFDF5' };
      case 'LOAN_REPAYMENT':
        return { label: 'ঋণ ফেরত', color: colors.success, bg: isDark ? '#064E3B' : '#ECFDF5' };
      case 'ADVANCE_REFUND':
        return { label: 'অগ্রিম ফেরত', color: '#0D9488', bg: isDark ? '#134E4A' : '#F0FDFA' };
      case 'FAMILY_REFUND':
        return { label: 'খরচ রিফান্ড', color: '#8B5CF6', bg: isDark ? '#2E1065' : '#F5F3FF' };
      default:
        return { label: type, color: colors.textSecondary, bg: colors.surfaceSubdued };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <Header
        title="পারিবারিক অর্থ ব্যবস্থাপনা"
        subtitle="খরচ, ঋণ, অগ্রিম, উপহার ও চাঁদার স্পষ্ট হিসাব"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* 1. SEPARATE 8 FAMILY KPI METRICS HERO */}
        <View style={[styles.kpiContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <BengaliText variant="caption" color={colors.textSecondary} weight="700" style={styles.kpiHeader}>
            পারিবারিক আর্থিক চিত্র (FAMILY FINANCIAL SUMMARY)
          </BengaliText>

          {/* Row 1: Expenses & Contributions */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#231515' : '#FEF2F2', borderColor: isDark ? '#5C1D1D' : '#FEE2E2' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="cart-outline" size={14} color={colors.error} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.error} weight="700">
                  মোট পারিবারিক খরচ
                </BengaliText>
              </View>
              <BengaliText variant="h3" color={colors.error} weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalFamilyExpensesPaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#102A24' : '#F0FDF4', borderColor: isDark ? '#134E4A' : '#DCFCE7' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="wallet-outline" size={14} color={colors.success} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.success} weight="700">
                  পারিবারিক চাঁদা
                </BengaliText>
              </View>
              <BengaliText variant="h3" color={colors.success} weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalFamilyContributionsPaisa) : '৳০.০০'}
              </BengaliText>
            </View>
          </View>

          {/* Row 2: Loans Given & Receivables */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#112238' : '#F0F9FF', borderColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="hand-left-outline" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color="#0284C7" weight="700">
                  মোট পারিবারিক ঋণ
                </BengaliText>
              </View>
              <BengaliText variant="h3" color="#0284C7" weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalFamilyLoansPaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#232014' : '#FFFBEB', borderColor: isDark ? '#4D3E1A' : '#FEF3C7' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="hourglass-outline" size={14} color={colors.warning} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.warning} weight="700">
                  বকেয়া পাওনা ঋণ
                </BengaliText>
              </View>
              <BengaliText variant="h3" color={colors.warning} weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.outstandingFamilyReceivablesPaisa) : '৳০.০০'}
              </BengaliText>
            </View>
          </View>

          {/* Row 3: Advances Given & Outstanding Advances */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#132B2B' : '#F0FDFA', borderColor: isDark ? '#134E4A' : '#CCFBF1' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="arrow-forward-circle-outline" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color="#0D9488" weight="700">
                  মোট পারিবারিক অগ্রিম
                </BengaliText>
              </View>
              <BengaliText variant="h3" color="#0D9488" weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalFamilyAdvancesPaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1A1828' : '#FAF5FF', borderColor: isDark ? '#3B2D54' : '#F3E8FF' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="time-outline" size={14} color="#8B5CF6" style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color="#8B5CF6" weight="700">
                  বকেয়া অগ্রিম
                </BengaliText>
              </View>
              <BengaliText variant="h3" color="#8B5CF6" weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.outstandingAdvancesPaisa) : '৳০.০০'}
              </BengaliText>
            </View>
          </View>

          {/* Row 4: Total Returned & Gifts */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#102A24' : '#F0FDF4', borderColor: isDark ? '#134E4A' : '#DCFCE7' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="checkmark-done-circle-outline" size={14} color={colors.success} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.success} weight="700">
                  মোট টাকা ফেরত প্রাপ্তি
                </BengaliText>
              </View>
              <BengaliText variant="h3" color={colors.success} weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalMoneyReturnedPaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: isDark ? '#2B121C' : '#FFF1F2', borderColor: isDark ? '#5C1733' : '#FFE4E6' }]}>
              <View style={styles.kpiCardTop}>
                <Ionicons name="gift-outline" size={14} color="#E11D48" style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color="#E11D48" weight="700">
                  উপহার / অনুদান
                </BengaliText>
              </View>
              <BengaliText variant="h3" color="#E11D48" weight="800">
                {summary ? MoneyUtil.formatBengaliCurrency(summary.totalFamilyGiftsPaisa) : '৳০.০০'}
              </BengaliText>
            </View>
          </View>
        </View>

        {/* 2. QUICK ACTIONS BAR */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => setGiveMoneyModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <BengaliText variant="bodyBold" color="#FFFFFF">
              পরিবারে টাকা প্রদান
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => {
              setReceiveInitialPersonId(null);
              setReceiveInitialFlowType('LOAN_REPAYMENT');
              setReceiveMoneyModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="cash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <BengaliText variant="bodyBold" color="#FFFFFF">
              টাকা ফেরত গ্রহণ
            </BengaliText>
          </TouchableOpacity>
        </View>

        {/* 3. VIEW SELECTION HORIZONTAL CHIPS */}
        <BengaliText variant="caption" color={colors.textSecondary} weight="700" style={styles.sectionTitle}>
          বিভাগ অনুযায়ী হিসাব (FILTER BY CATEGORY)
        </BengaliText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {VIEW_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.surfaceSubdued
                      : colors.secondaryLight,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <BengaliText
                  variant="caption"
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  weight={isSelected ? '700' : '500'}
                >
                  {tab.label}
                </BengaliText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. TRANSACTION STREAM */}
        {loading ? (
          <View style={{ gap: 10 }}>
            <CardSkeleton />
            <TransactionSkeleton />
            <TransactionSkeleton />
          </View>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="কোনো হিসাব পাওয়া যায়নি"
            description="নির্বাচিত বিভাগে বর্তমানে কোনো পারিবারিক লেনদেনের রেকর্ড নেই।"
            actionTitle="টাকা প্রদান করুন"
            onActionPress={() => setGiveMoneyModalVisible(true)}
          />
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => {
              const badge = getFlowBadge(tx.flowType);
              const remainingReceivable =
                tx.isRecoverable && tx.amountPaisa > (tx.settledAmountPaisa || 0)
                  ? tx.amountPaisa - (tx.settledAmountPaisa || 0)
                  : 0;
              const isOverdue = !!tx.dueDate && new Date(tx.dueDate) < new Date() && remainingReceivable > 0;

              return (
                <View
                  key={tx._id || tx.clientUuid}
                  style={[
                    styles.txCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDark ? colors.borderStrong : colors.border,
                      borderLeftColor: badge.color,
                    },
                  ]}
                >
                  <View style={styles.txTopRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <BengaliText variant="bodyBold" color={colors.text} numberOfLines={1}>
                        {tx.purpose || tx.description || 'পারিবারিক লেনদেন'}
                      </BengaliText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <BengaliText variant="caption" color={colors.textMuted}>
                          {tx.personId?.name || 'পরিবারের সদস্য'}
                        </BengaliText>
                        <BengaliText variant="caption" color={colors.borderStrong} style={{ marginHorizontal: 6 }}>
                          •
                        </BengaliText>
                        <BengaliText variant="caption" color={colors.textMuted}>
                          {tx.accountId?.name || 'ক্যাশ / ব্যাংক'}
                        </BengaliText>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <BengaliText
                        variant="h3"
                        color={tx.direction === 'RECEIVE' ? colors.success : colors.error}
                        weight="800"
                      >
                        {tx.direction === 'RECEIVE' ? '+' : '-'} {MoneyUtil.formatBengaliCurrency(tx.amountPaisa)}
                      </BengaliText>
                      <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                        {tx.date ? new Date(tx.date).toLocaleDateString('bn-BD') : ''}
                      </BengaliText>
                    </View>
                  </View>

                  {/* Flow Badge & Settlement State */}
                  <View style={styles.txMetaRow}>
                    <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                      <BengaliText variant="caption" color={badge.color} weight="700" style={{ fontSize: 11 }}>
                        {badge.label}
                      </BengaliText>
                    </View>

                    {remainingReceivable > 0 && (
                      <View style={[styles.badgePill, { backgroundColor: isOverdue ? '#FEE2E2' : colors.secondaryLight }]}>
                        <BengaliText variant="caption" color={isOverdue ? colors.error : colors.secondary} weight="700" style={{ fontSize: 11 }}>
                          বকেয়া: {MoneyUtil.formatBengaliCurrency(remainingReceivable)}
                        </BengaliText>
                      </View>
                    )}

                    {tx.status === 'SETTLED' && (
                      <View style={[styles.badgePill, { backgroundColor: colors.successLight }]}>
                        <BengaliText variant="caption" color={colors.success} weight="700" style={{ fontSize: 11 }}>
                          সম্পূর্ণ পরিশোধিত
                        </BengaliText>
                      </View>
                    )}

                    {/* Action: Receive Repayment for active loans */}
                    {remainingReceivable > 0 && (
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: colors.primaryLight }]}
                        onPress={() => {
                          setReceiveInitialPersonId(tx.personId?._id || null);
                          setReceiveInitialFlowType(tx.flowType === 'ADVANCE' ? 'ADVANCE_REFUND' : 'LOAN_REPAYMENT');
                          setReceiveMoneyModalVisible(true);
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={13} color={colors.primary} style={{ marginRight: 3 }} />
                        <BengaliText variant="caption" color={colors.primary} weight="700">
                          ফেরত নিন
                        </BengaliText>
                      </TouchableOpacity>
                    )}

                    {/* Action: Reverse Transaction */}
                    <TouchableOpacity
                      style={styles.reverseBtn}
                      onPress={() => {
                        setTxToReverse(tx);
                        setReverseModalVisible(true);
                      }}
                    >
                      <Ionicons name="arrow-undo-outline" size={14} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Give Money Modal */}
      <GiveMoneyModal
        visible={giveMoneyModalVisible}
        onClose={() => setGiveMoneyModalVisible(false)}
        onSubmit={handleGiveMoney}
        accounts={accounts}
        people={people}
      />

      {/* Receive Money Modal */}
      <ReceiveMoneyModal
        visible={receiveMoneyModalVisible}
        onClose={() => setReceiveMoneyModalVisible(false)}
        onSubmit={handleReceiveMoney}
        accounts={accounts}
        people={people}
        initialPersonId={receiveInitialPersonId}
        initialFlowType={receiveInitialFlowType}
      />

      {/* Reversal Confirmation Modal */}
      <ConfirmationModal
        visible={reverseModalVisible}
        title="লেনদেন প্রত্যাহার ও রিভার্সাল"
        message="আপনি কি নিশ্চিতভাবে এই লেনদেনটি বাতিল ও রিভার্স করতে চান? নির্বাচিত অ্যাকাউন্টের ব্যালেন্স ও পাওনাদারের হিসাব স্বয়ংক্রিয়ভাবে পূর্বের অবস্থায় ফিরে যাবে।"
        confirmTitle="হ্যাঁ, রিভার্স করুন"
        cancelTitle="না, ফিরে যান"
        isDestructive
        onConfirm={handleConfirmReversal}
        onCancel={() => {
          setReverseModalVisible(false);
          setTxToReverse(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  kpiContainer: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  kpiHeader: {
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  txList: {
    gap: 10,
  },
  txCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  reverseBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
