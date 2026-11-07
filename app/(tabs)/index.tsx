import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateUuid } from '../../src/utils/uuid';
import { RootState } from '../../src/store';
import { Header } from '../../src/components/Header';
import { BengaliText } from '../../src/components/BengaliText';
import { FinancialSummaryCard } from '../../src/components/ui/FinancialSummaryCard';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { TextInput } from '../../src/components/ui/TextInput';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { TransactionItem } from '../../src/components/TransactionItem';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CardSkeleton, TransactionSkeleton } from '../../src/components/ui/LoadingSkeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { MonthSelector } from '../../src/components/ui/MonthSelector';
import { ChartCard } from '../../src/components/ui/ChartCard';
import { LocalDbService } from '../../src/database/sqlite';
import { ApiClient } from '../../src/services/apiClient';
import { SyncEngine } from '../../src/sync/syncEngine';
import { MoneyUtil } from '../../src/utils/money';
import { isTransactionMonthClosed } from '../../src/utils/closedMonth';
import { parseYearMonth } from '../../src/utils/monthStats';
import {
  HouseholdFinancialOverview,
  FinancialAccount,
  Person,
  PersonalFinancialOverview,
  WhatIfProjection,
  ReceivableItem,
  PayableItem,
  TransactionFlowType,
} from '../../src/types';
import { PredefinedCategory } from '../../src/constants/expenseCategories';
import { useTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/context/ToastContext';

// Dedicated Accounting Components
import { WhatIfCalculatorModal } from '../../src/components/accounting/WhatIfCalculatorModal';
import { GiveMoneyModal } from '../../src/components/accounting/GiveMoneyModal';
import { ReceiveMoneyModal } from '../../src/components/accounting/ReceiveMoneyModal';
import { BorrowMoneyModal } from '../../src/components/accounting/BorrowMoneyModal';
import { AccountTransferModal } from '../../src/components/accounting/AccountTransferModal';
import { ManageAccountsModal } from '../../src/components/accounting/ManageAccountsModal';
import { ManagePeopleModal } from '../../src/components/accounting/ManagePeopleModal';
import { ReceivablesPayablesCard } from '../../src/components/accounting/ReceivablesPayablesCard';

type PeriodFilter = 'TODAY' | 'WEEK' | 'THIS_MONTH' | 'PREV_MONTH' | 'YEAR';

const DEFAULT_PERSONAL_OVERVIEW: PersonalFinancialOverview = {
  totalIncomePaisa: 0,
  totalPersonalExpensesPaisa: 0,
  totalHouseholdContributionsPaisa: 0,
  totalMoneyLentPaisa: 0,
  totalMoneyBorrowedPaisa: 0,
  totalMoneyReceivablePaisa: 0,
  totalMoneyPayablePaisa: 0,
  totalCashBalancePaisa: 0,
  totalBankBalancePaisa: 0,
  totalAvailableBalancePaisa: 0,
  totalAssetsPaisa: 0,
  totalLiabilitiesPaisa: 0,
  netWorthPaisa: 0,
  totalFamilyExpensesPaisa: 0,
  totalFamilyLoansPaisa: 0,
  outstandingFamilyReceivablesPaisa: 0,
  totalFamilyAdvancesPaisa: 0,
  outstandingAdvancesPaisa: 0,
  totalFamilyContributionsPaisa: 0,
  totalMoneyReturnedPaisa: 0,
  totalFamilyGiftsPaisa: 0,
};

const DEFAULT_HOUSEHOLD_OVERVIEW: HouseholdFinancialOverview = {
  householdId: '',
  openingBalancePaisa: 0,
  totalFundContributionsPaisa: 0,
  totalApprovedExpensesPaisa: 0,
  currentFundBalancePaisa: 0,
  pendingRequestsCount: 0,
  pendingRequestsPaisa: 0,
  memberBalances: [],
  recommendedSettlements: [],
};

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<HouseholdFinancialOverview | null>(DEFAULT_HOUSEHOLD_OVERVIEW);
  const [closedMonths, setClosedMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // Period Filter for 13 Metrics
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('THIS_MONTH');
  const [personalOverview, setPersonalOverview] = useState<PersonalFinancialOverview>(DEFAULT_PERSONAL_OVERVIEW);
  const [whatIfProjection, setWhatIfProjection] = useState<WhatIfProjection | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [payables, setPayables] = useState<PayableItem[]>([]);

  // Month filtering for household
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Super Admin statistics
  const [superAdminStats, setSuperAdminStats] = useState<{
    totalHouseholds: number;
    activeHouseholds: number;
    totalUsers: number;
    activeUsers: number;
  } | null>(null);

  // Category breakdown calculation for household
  const [householdMonthExpensePaisa, setHouseholdMonthExpensePaisa] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);

  // Action Modals State
  const [whatIfModalVisible, setWhatIfModalVisible] = useState(false);
  const [giveMoneyModalVisible, setGiveMoneyModalVisible] = useState(false);
  const [receiveMoneyModalVisible, setReceiveMoneyModalVisible] = useState(false);
  const [borrowMoneyModalVisible, setBorrowMoneyModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [accountsModalVisible, setAccountsModalVisible] = useState(false);
  const [peopleModalVisible, setPeopleModalVisible] = useState(false);

  // Pre-filled props for Receive / Repay actions
  const [receiveInitialPersonId, setReceiveInitialPersonId] = useState<string | null>(null);
  const [receiveInitialFlowType, setReceiveInitialFlowType] = useState<TransactionFlowType>('INCOME');

  // Edit / Delete Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    clientUuid?: string;
    txType: 'PERSONAL' | 'HOUSEHOLD';
    title: string;
    amountTaka: string;
    note: string;
    date: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Transaction filter segment ('ALL' | 'PERSONAL' | 'HOUSEHOLD')
  const [txFilter, setTxFilter] = useState<'ALL' | 'PERSONAL' | 'HOUSEHOLD'>('ALL');

  // Calculates ISO date bounds for selected period
  const getPeriodDates = useCallback((period: PeriodFilter): { startDate?: string; endDate?: string } => {
    const today = new Date();
    if (period === 'TODAY') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (period === 'WEEK') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: today.toISOString() };
    }
    if (period === 'THIS_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: today.toISOString() };
    }
    if (period === 'PREV_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (period === 'YEAR') {
      const start = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: today.toISOString() };
    }
    return {};
  }, []);

  const loadData = useCallback(async () => {
    try {
      // 1. Instantly load from SQLite local store so UI renders in 0ms without skeletons
      if (user?.id) {
        const [localAcc, localPeople, personalExpenses, personalTransactions, householdExpenses] =
          await Promise.all([
            LocalDbService.getFinancialAccounts(user.id),
            LocalDbService.getPeople(user.id),
            LocalDbService.getPersonalExpenses(user.id),
            LocalDbService.getPersonalTransactions(user.id),
            user.householdId ? LocalDbService.getHouseholdExpenses(user.householdId) : [],
          ]);

        setAccounts(localAcc);
        setPeople(localPeople);

        // Filter household expense for selected month
        const filteredHH = householdExpenses.filter((h) => {
          const ym = parseYearMonth(h.date);
          return ym.year === selectedYear && ym.month === selectedMonth;
        });

        const hhExpSum = filteredHH.reduce((acc, h) => acc + (h.amountPaisa || 0), 0);
        setHouseholdMonthExpensePaisa(hhExpSum);

        // Category breakdown calculation for household
        const catMap = new Map<string, { id: string; name: string; amountPaisa: number }>();
        for (const exp of filteredHH) {
          const catId = exp.categoryId || 'other';
          const catTitle = exp.title || 'অন্যান্য ব্যয়';
          const existing = catMap.get(catId);
          if (existing) {
            existing.amountPaisa += exp.amountPaisa;
          } else {
            catMap.set(catId, {
              id: catId,
              name: catTitle,
              amountPaisa: exp.amountPaisa,
            });
          }
        }
        setCategoryBreakdown(Array.from(catMap.values()));

        // Combine recent transactions
        const combined = [
          ...personalExpenses.map((p) => ({ ...p, txType: 'PERSONAL' })),
          ...householdExpenses.map((h) => ({ ...h, txType: 'HOUSEHOLD' })),
          ...personalTransactions.map((t) => ({
            ...t,
            title: t.purpose || t.description || t.flowType,
            txType: 'PERSONAL',
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecentTransactions(combined.slice(0, 15));
      }

      // Render instantly! No waiting for network or showing skeletons!
      setLoading(false);

      // 2. Background fetch for fresh server data (silent sync, non-blocking)
      const periodDates = getPeriodDates(periodFilter);
      Promise.all([
        ApiClient.getPersonalOverview(periodDates).catch(() => null),
        ApiClient.getWhatIfProjections().catch(() => null),
        ApiClient.getAccounts().catch(() => null),
        ApiClient.getPeople().catch(() => null),
        ApiClient.getReceivables().catch(() => null),
        ApiClient.getPayables().catch(() => null),
        user?.householdId ? ApiClient.getFinancialOverview().catch(() => null) : null,
        user?.householdId ? ApiClient.getClosedMonths().catch(() => null) : null,
        user?.role === 'SUPER_ADMIN' ? ApiClient.listHouseholds().catch(() => null) : null,
        user?.role === 'SUPER_ADMIN' ? ApiClient.listAllUsers().catch(() => null) : null,
      ]).then(async ([overviewRes, whatIfRes, accRes, peopleRes, recRes, payRes, hhRes, closedRes, saHRes, saURes]) => {
        if (overviewRes?.success && overviewRes.data) setPersonalOverview(overviewRes.data);
        if (whatIfRes?.success && whatIfRes.data) setWhatIfProjection(whatIfRes.data);
        if (accRes?.success && Array.isArray(accRes.data)) {
          setAccounts(accRes.data);
          for (const a of accRes.data) await LocalDbService.upsertFinancialAccount(a, 1);
        }
        if (peopleRes?.success && Array.isArray(peopleRes.data)) {
          setPeople(peopleRes.data);
          for (const p of peopleRes.data) await LocalDbService.upsertPerson(p, 1);
        }
        if (recRes?.success && Array.isArray(recRes.data)) setReceivables(recRes.data);
        if (payRes?.success && Array.isArray(payRes.data)) setPayables(payRes.data);
        if (hhRes?.success && hhRes.data) setOverview(hhRes.data);
        if (closedRes?.success && closedRes.data) setClosedMonths(closedRes.data);
        if (saHRes?.success && saURes?.success) {
          const hhList = Array.isArray(saHRes.data) ? saHRes.data : [];
          const uList = Array.isArray(saURes.data) ? saURes.data : [];
          setSuperAdminStats({
            totalHouseholds: hhList.length,
            activeHouseholds: hhList.filter((h: any) => h.status === 'ACTIVE').length,
            totalUsers: uList.length,
            activeUsers: uList.filter((u: any) => u.isActive).length,
          });
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Load dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, selectedMonth, periodFilter, getPeriodDates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await SyncEngine.syncNow().catch(() => {});
    await loadData();
    setRefreshing(false);
  };

  // ==================== ACCOUNTING ACTIONS ====================
  const handleGiveMoney = async (data: {
    accountId: string;
    personId?: string | null;
    flowType: TransactionFlowType;
    amountTaka: string;
    purpose?: string;
    notes?: string;
    dueDate?: string | null;
  }) => {
    try {
      const clientUuid = generateUuid();
      const amountPaisa = MoneyUtil.takaToPaisa(parseFloat(data.amountTaka));

      const payload = {
        accountId: data.accountId,
        personId: data.personId,
        flowType: data.flowType,
        amountPaisa,
        purpose: data.purpose,
        notes: data.notes,
        dueDate: data.dueDate,
        clientUuid,
      };

      await ApiClient.giveMoney(payload);
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(amountPaisa)} সফলভাবে প্রদান ও ব্যালেন্স সমন্বয় করা হয়েছে।`,
      });
      setGiveMoneyModalVisible(false);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'টাকা প্রদানের হিসাব সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  };

  const handleReceiveMoney = async (data: {
    accountId: string;
    personId?: string | null;
    flowType: TransactionFlowType;
    amountTaka: string;
    description?: string;
    notes?: string;
  }) => {
    try {
      const clientUuid = generateUuid();
      const amountPaisa = MoneyUtil.takaToPaisa(parseFloat(data.amountTaka));

      const payload = {
        accountId: data.accountId,
        personId: data.personId,
        flowType: data.flowType,
        amountPaisa,
        description: data.description,
        notes: data.notes,
        clientUuid,
      };

      await ApiClient.receiveMoney(payload);
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(amountPaisa)} সফলভাবে অ্যাকাউন্টে জমা হয়েছে।`,
      });
      setReceiveMoneyModalVisible(false);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'টাকা জমার হিসাব সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  };

  const handleBorrowMoney = async (data: {
    accountId: string;
    personId: string;
    amountTaka: string;
    purpose?: string;
    notes?: string;
    dueDate?: string | null;
  }) => {
    try {
      const clientUuid = generateUuid();
      const amountPaisa = MoneyUtil.takaToPaisa(parseFloat(data.amountTaka));

      const payload = {
        accountId: data.accountId,
        personId: data.personId,
        amountPaisa,
        purpose: data.purpose,
        notes: data.notes,
        dueDate: data.dueDate,
        clientUuid,
      };

      await ApiClient.borrowMoney(payload);
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(amountPaisa)} ধার গ্রহণ এবং দায়ের হিসাব সফলভাবে রেকর্ড হয়েছে।`,
      });
      setBorrowMoneyModalVisible(false);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'ধার গ্রহণের হিসাব সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  };

  const handleAccountTransfer = async (data: {
    fromAccountId: string;
    toAccountId: string;
    amountTaka: string;
    notes?: string;
  }) => {
    try {
      const clientUuid = generateUuid();
      const amountPaisa = MoneyUtil.takaToPaisa(parseFloat(data.amountTaka));

      const payload = {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amountPaisa,
        notes: data.notes,
        clientUuid,
      };

      await ApiClient.transferBetweenAccounts(payload);
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(amountPaisa)} সফলভাবে এক অ্যাকাউন্ট থেকে অন্যটিতে স্থানান্তরিত হয়েছে।`,
      });
      setTransferModalVisible(false);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'অ্যাকাউন্ট ফান্ড স্থানান্তর ব্যর্থ হয়েছে।' });
    }
  };

  const handleCreateAccount = async (data: {
    name: string;
    type: 'CASH' | 'BANK' | 'MOBILE_BANKING' | 'SAVINGS' | 'OTHER';
    accountNumber?: string;
    bankName?: string;
    openingBalanceTaka: string;
    notes?: string;
  }) => {
    try {
      const clientUuid = generateUuid();
      const openingPaisa = data.openingBalanceTaka ? MoneyUtil.takaToPaisa(parseFloat(data.openingBalanceTaka)) : 0;

      await ApiClient.createAccount({
        name: data.name,
        type: data.type,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        openingBalancePaisa: openingPaisa,
        notes: data.notes,
        clientUuid,
      });

      showToast({ type: 'success', message: `'${data.name}' অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে।` });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'অ্যাকাউন্ট যুক্ত করা যায়নি।' });
    }
  };

  const handleCreatePerson = async (data: {
    name: string;
    phone?: string;
    relationship: any;
    address?: string;
    notes?: string;
    openingReceivableTaka?: string;
    openingPayableTaka?: string;
  }) => {
    try {
      const clientUuid = generateUuid();
      const openingRec = data.openingReceivableTaka ? MoneyUtil.takaToPaisa(parseFloat(data.openingReceivableTaka)) : 0;
      const openingPay = data.openingPayableTaka ? MoneyUtil.takaToPaisa(parseFloat(data.openingPayableTaka)) : 0;

      await ApiClient.createPerson({
        name: data.name,
        phone: data.phone,
        relationship: data.relationship,
        address: data.address,
        notes: data.notes,
        openingReceivablePaisa: openingRec,
        openingPayablePaisa: openingPay,
        clientUuid,
      });

      showToast({ type: 'success', message: `'${data.name}' সফলভাবে পরিচিতজন হিসেবে যুক্ত হয়েছে।` });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'ব্যক্তি যুক্ত করা যায়নি।' });
    }
  };

  const handleReceiveRepaymentFromLender = (item: ReceivableItem) => {
    setReceiveInitialPersonId(item.person?._id || null);
    setReceiveInitialFlowType('LOAN_REPAYMENT');
    setReceiveMoneyModalVisible(true);
  };

  const handlePayDebtToLender = (item: PayableItem) => {
    setGiveMoneyModalVisible(true);
  };

  // Role booleans
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isHomeAdmin = user?.role === 'HOME_ADMIN';

  // Filtered transactions for display
  const displayedTransactions = useMemo(() => {
    if (txFilter === 'PERSONAL') {
      return recentTransactions.filter((t) => t.txType === 'PERSONAL');
    }
    if (txFilter === 'HOUSEHOLD') {
      return recentTransactions.filter((t) => t.txType === 'HOUSEHOLD');
    }
    return recentTransactions;
  }, [recentTransactions, txFilter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={user?.householdName || undefined}
        subtitle={
          isSuperAdmin
            ? 'সুপার অ্যাডমিন ড্যাশবোর্ড'
            : isHomeAdmin
            ? 'ব্যক্তিগত ও পারিবারিক সেন্ট্রাল অ্যাকাউন্টস'
            : 'ব্যক্তিগত ও পারিবারিক আর্থিক সেন্ট্রাল ড্যাশবোর্ড'
        }
      />

      <OfflineBanner />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <CardSkeleton />
            <View style={styles.gridRow}>
              <CardSkeleton style={{ flex: 1, marginRight: 6 }} />
              <CardSkeleton style={{ flex: 1, marginLeft: 6 }} />
            </View>
            <TransactionSkeleton />
            <TransactionSkeleton />
          </View>
        ) : (
          <>
            {/* 1. CENTRAL PERSONAL FINANCIAL HERO CARD (Net Worth & Available Balance) */}
            <View style={styles.section}>
              <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.heroTopRow}>
                  <View style={{ flex: 1 }}>
                    <BengaliText style={[styles.heroSub, { color: colors.textSecondary }]}>
                      মোট নীট সম্পদ (Net Worth = Assets - Liabilities)
                    </BengaliText>
                    <BengaliText style={[styles.heroAmount, { color: colors.primary }]}>
                      {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.netWorthPaisa) : '৳০.০০'}
                    </BengaliText>
                  </View>

                  {/* What-If Simulator Pill */}
                  <TouchableOpacity
                    style={[styles.whatIfPill, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: colors.primary }]}
                    onPress={() => setWhatIfModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <BengaliText style={[styles.whatIfText, { color: colors.primary }]}>কী হতো যদি?</BengaliText>
                  </TouchableOpacity>
                </View>

                {/* Available Balance Row */}
                <View style={[styles.heroBottomRow, { borderTopColor: isDark ? colors.borderStrong : colors.border }]}>
                  <View style={styles.balanceMetric}>
                    <BengaliText style={[styles.metricLabel, { color: colors.textSecondary }]}>উপলব্ধ নগদ ও ব্যাংক</BengaliText>
                    <BengaliText style={[styles.metricVal, { color: colors.success }]}>
                      {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.totalAvailableBalancePaisa) : '৳০.০০'}
                    </BengaliText>
                  </View>

                  <View style={[styles.vertLine, { backgroundColor: colors.border }]} />

                  <View style={styles.balanceMetric}>
                    <BengaliText style={[styles.metricLabel, { color: colors.textSecondary }]}>পাওনা টাকা (Receivable)</BengaliText>
                    <BengaliText style={[styles.metricVal, { color: colors.info }]}>
                      {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.totalMoneyReceivablePaisa) : '৳০.০০'}
                    </BengaliText>
                  </View>

                  <View style={[styles.vertLine, { backgroundColor: colors.border }]} />

                  <View style={styles.balanceMetric}>
                    <BengaliText style={[styles.metricLabel, { color: colors.textSecondary }]}>বকেয়া দেনা (Payable)</BengaliText>
                    <BengaliText style={[styles.metricVal, { color: colors.error }]}>
                      {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.totalMoneyPayablePaisa) : '৳০.০০'}
                    </BengaliText>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. FOUR CORE QUICK ACTIONS (GIVE, RECEIVE, BORROW, TRANSFER) */}
            <View style={styles.quickActionsContainer}>
              {/* Give Money */}
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setGiveMoneyModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="arrow-up-circle" size={22} color={colors.error} />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <BengaliText variant="caption" color={colors.text} weight="700" align="center" numberOfLines={1}>
                    টাকা প্রদান
                  </BengaliText>
                </View>
              </TouchableOpacity>

              {/* Receive Money */}
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setReceiveInitialPersonId(null);
                  setReceiveInitialFlowType('INCOME');
                  setReceiveMoneyModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="arrow-down-circle" size={22} color={colors.success} />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <BengaliText variant="caption" color={colors.text} weight="700" align="center" numberOfLines={1}>
                    টাকা গ্রহণ
                  </BengaliText>
                </View>
              </TouchableOpacity>

              {/* Borrow Money */}
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setBorrowMoneyModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="card" size={22} color="#D97706" />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <BengaliText variant="caption" color={colors.text} weight="700" align="center" numberOfLines={1}>
                    ধার গ্রহণ
                  </BengaliText>
                </View>
              </TouchableOpacity>

              {/* Transfer Between Own Accounts */}
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setTransferModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <BengaliText variant="caption" color={colors.text} weight="700" align="center" numberOfLines={1}>
                    ট্রান্সফার
                  </BengaliText>
                </View>
              </TouchableOpacity>
            </View>

            {/* FAMILY MONEY CLASSIFICATION BANNER */}
            <TouchableOpacity
              style={[
                styles.familyCardWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? colors.borderStrong : colors.border,
                },
              ]}
              onPress={() => router.push('/family-finance')}
              activeOpacity={0.8}
            >
              <View style={styles.familyCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.familyCardIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Ionicons name="people" size={17} color={colors.primary} />
                  </View>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    পারিবারিক অর্থ ব্যবস্থাপনা (Family Finance)
                  </BengaliText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <BengaliText variant="caption" color={colors.primary} weight="700">
                    হিসাব দেখুন
                  </BengaliText>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </View>

              <View style={styles.familyMiniMetrics}>
                <View style={styles.familyMiniBox}>
                  <BengaliText variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                    পারিবারিক খরচ
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.error} weight="700">
                    {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.totalFamilyExpensesPaisa) : '৳০.০০'}
                  </BengaliText>
                </View>

                <View style={styles.familyMiniBox}>
                  <BengaliText variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                    পারিবারিক ঋণ
                  </BengaliText>
                  <BengaliText variant="caption" color="#0284C7" weight="700">
                    {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.totalFamilyLoansPaisa) : '৳০.০০'}
                  </BengaliText>
                </View>

                <View style={styles.familyMiniBox}>
                  <BengaliText variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                    বকেয়া পাওনা
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.warning} weight="700">
                    {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.outstandingFamilyReceivablesPaisa) : '৳০.০০'}
                  </BengaliText>
                </View>

                <View style={styles.familyMiniBox}>
                  <BengaliText variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                    পারিবারিক চাঁদা
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.success} weight="700">
                    {personalOverview ? MoneyUtil.formatBengaliCurrency(personalOverview.totalFamilyContributionsPaisa) : '৳০.০০'}
                  </BengaliText>
                </View>
              </View>
            </TouchableOpacity>

            {/* QUICK FAMILY ACTION PILLS */}
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: colors.primaryLight,
                }}
                onPress={() => router.push('/family-fund')}
              >
                <Ionicons name="wallet-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.primary} weight="700">
                  কমন ফান্ড
                </BengaliText>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE',
                }}
                onPress={() => router.push('/expense-sharing')}
              >
                <Ionicons name="pie-chart-outline" size={15} color="#0284C7" style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color="#0284C7" weight="700">
                  খরচ বিভাজন
                </BengaliText>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#3B1515' : '#FEF2F2',
                }}
                onPress={() => router.push(user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN' ? '/member-dues' : '/my-dues')}
              >
                <Ionicons name="people-outline" size={15} color={colors.danger} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.danger} weight="700">
                  {user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN' ? 'সদস্য বকেয়া' : 'আমার চাঁদা'}
                </BengaliText>
              </TouchableOpacity>
            </View>

            {/* 3. MULTIPLE FINANCIAL ACCOUNTS BAR */}
            <View style={styles.accountsBarWrap}>
              <View style={styles.accountsBarHeader}>
                <BengaliText style={[styles.accountsBarTitle, { color: colors.textPrimary }]}>
                  আমার আর্থিক অ্যাকাউন্টসমূহ
                </BengaliText>
                <TouchableOpacity
                  style={[styles.manageAccBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setAccountsModalVisible(true)}
                >
                  <Ionicons name="settings-outline" size={13} color={colors.primary} style={{ marginRight: 3 }} />
                  <BengaliText style={[styles.manageAccText, { color: colors.primary }]}>ম্যানেজ</BengaliText>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsBarScroll}>
                {accounts.map((acc) => (
                  <View
                    key={acc._id}
                    style={[styles.accountPillCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.accountPillTop}>
                      <Ionicons
                        name={
                          acc.type === 'CASH'
                            ? 'cash-outline'
                            : acc.type === 'BANK'
                            ? 'business-outline'
                            : 'phone-portrait-outline'
                        }
                        size={15}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <BengaliText style={[styles.accPillName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {acc.name}
                      </BengaliText>
                    </View>
                    <BengaliText style={[styles.accPillAmount, { color: colors.textPrimary }]}>
                      {MoneyUtil.formatBengaliCurrency(acc.currentBalancePaisa)}
                    </BengaliText>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* 4. PERIOD FILTER & 13 FINANCIAL METRICS (A-M) */}
            <View style={styles.metricsSection}>
              <View style={styles.periodTabsRow}>
                {[
                  { key: 'TODAY', label: 'আজ' },
                  { key: 'WEEK', label: 'সপ্তাহ' },
                  { key: 'THIS_MONTH', label: 'চলতি মাস' },
                  { key: 'PREV_MONTH', label: 'গত মাস' },
                  { key: 'YEAR', label: 'বছর' },
                ].map((p) => {
                  const isSelected = periodFilter === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => setPeriodFilter(p.key as PeriodFilter)}
                      style={[
                        styles.periodTab,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <BengaliText
                        style={[
                          styles.periodTabText,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {p.label}
                      </BengaliText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Metric Grid Cards */}
              <View style={styles.gridRow}>
                <FinancialSummaryCard
                  title="মোট আয় (A)"
                  amountPaisa={personalOverview?.totalIncomePaisa || 0}
                  subtitle="বেতন ও অন্যান্য আয়"
                  icon="arrow-down-circle"
                  variant="income"
                  style={{ flex: 1, marginRight: 6 }}
                />
                <FinancialSummaryCard
                  title="ব্যক্তিগত ব্যয় (B)"
                  amountPaisa={personalOverview?.totalPersonalExpensesPaisa || 0}
                  subtitle="চলতি সময়ের মোট খরচ"
                  icon="arrow-up-circle"
                  variant="expense"
                  style={{ flex: 1, marginLeft: 6 }}
                />
              </View>

              <View style={styles.gridRow}>
                <FinancialSummaryCard
                  title="পারিবারিক চাঁদা (C)"
                  amountPaisa={personalOverview?.totalHouseholdContributionsPaisa || 0}
                  subtitle="ফান্ডে মোট জমা"
                  icon="wallet"
                  variant="income"
                  style={{ flex: 1, marginRight: 6 }}
                />
                <FinancialSummaryCard
                  title="অন্যকে দেয়া ঋণ (D)"
                  amountPaisa={personalOverview?.totalMoneyLentPaisa || 0}
                  subtitle="প্রদত্ত মোট লোন"
                  icon="hand-left"
                  variant="balance"
                  style={{ flex: 1, marginLeft: 6 }}
                />
              </View>

              <View style={styles.gridRow}>
                <FinancialSummaryCard
                  title="গৃহীত ধার / ঋণ (E)"
                  amountPaisa={personalOverview?.totalMoneyBorrowedPaisa || 0}
                  subtitle="অন্যের থেকে ধার"
                  icon="card"
                  variant="expense"
                  style={{ flex: 1, marginRight: 6 }}
                />
                <FinancialSummaryCard
                  title="মোট সম্পদ (Assets) (K)"
                  amountPaisa={personalOverview?.totalAssetsPaisa || 0}
                  subtitle="উপলব্ধ ক্যাশ + পাওনা"
                  icon="shield-checkmark"
                  variant="balance"
                  style={{ flex: 1, marginLeft: 6 }}
                />
              </View>
            </View>

            {/* 5. ACTIVE DEBT MODULE: RECEIVABLES & PAYABLES WITH REMINDERS */}
            <View style={styles.debtSection}>
              <View style={styles.debtSectionHeader}>
                <BengaliText style={[styles.debtTitle, { color: colors.textPrimary }]}>
                  পাওনা ও দেনা ট্র্যাকিং (Debt Ledger)
                </BengaliText>
                <TouchableOpacity
                  style={[styles.addPersonBtn, { backgroundColor: colors.secondaryLight }]}
                  onPress={() => setPeopleModalVisible(true)}
                >
                  <Ionicons name="person-add" size={13} color={colors.secondary} style={{ marginRight: 4 }} />
                  <BengaliText style={[styles.addPersonText, { color: colors.secondary }]}>+ পরিচিতজন</BengaliText>
                </TouchableOpacity>
              </View>

              <ReceivablesPayablesCard
                receivables={receivables}
                payables={payables}
                onReceiveRepayment={handleReceiveRepaymentFromLender}
                onPayDebt={handlePayDebtToLender}
              />
            </View>

            {/* 6. HOUSEHOLD COMMUNITY EXPENSE CHART */}
            {categoryBreakdown.length > 0 && (
              <ChartCard
                title="চলতি মাসের ব্যয় বিভাজন"
                totalPaisa={householdMonthExpensePaisa}
                categories={categoryBreakdown}
              />
            )}

            {/* 7. RECENT TRANSACTIONS STREAM */}
            <View style={styles.transactionsSection}>
              <SectionHeader
                title="সাম্প্রতিক লেনদেন"
                subtitle="ব্যক্তিগত ও পারিবারিক রেকর্ড"
                count={displayedTransactions.length}
                actionText="সব দেখুন"
                onActionPress={() => router.push('/(tabs)/personal')}
              />

              {/* Segmented Filter Pills */}
              <View style={styles.filterPillsRow}>
                {(['ALL', 'HOUSEHOLD', 'PERSONAL'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setTxFilter(mode)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          txFilter === mode
                            ? colors.primary
                            : isDark ? colors.surfaceSubdued : colors.secondaryLight,
                        borderColor:
                          txFilter === mode
                            ? colors.primary
                            : isDark ? colors.borderStrong : colors.border,
                      },
                    ]}
                  >
                    <BengaliText
                      variant="caption"
                      color={txFilter === mode ? '#FFFFFF' : colors.textSecondary}
                      weight="700"
                    >
                      {mode === 'ALL'
                        ? 'সকল লেনদেন'
                        : mode === 'HOUSEHOLD'
                        ? 'পারিবারিক'
                        : 'ব্যক্তিগত'}
                    </BengaliText>
                  </TouchableOpacity>
                ))}
              </View>

              {displayedTransactions.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="কোনো লেনদেন পাওয়া যায়নি"
                  description="আপনার নির্বাচিত ফিল্টারে কোনো লেনদেনের তথ্য নেই।"
                  actionTitle="টাকা প্রদান করুন"
                  onActionPress={() => setGiveMoneyModalVisible(true)}
                />
              ) : (
                displayedTransactions.map((item) => (
                  <TransactionItem
                    key={item._id || item.clientUuid}
                    title={item.title || item.purpose || 'লেনদেন'}
                    amountPaisa={item.amountPaisa}
                    date={item.date}
                    type={item.direction === 'RECEIVE' ? 'INCOME' : 'EXPENSE'}
                    category={item.flowType || item.category || 'সাধারণ'}
                    subtitle={item.note || item.description}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ALL MODALS */}
      <WhatIfCalculatorModal
        visible={whatIfModalVisible}
        onClose={() => setWhatIfModalVisible(false)}
        projection={whatIfProjection}
      />

      <GiveMoneyModal
        visible={giveMoneyModalVisible}
        onClose={() => setGiveMoneyModalVisible(false)}
        onSubmit={handleGiveMoney}
        accounts={accounts}
        people={people}
      />

      <ReceiveMoneyModal
        visible={receiveMoneyModalVisible}
        onClose={() => setReceiveMoneyModalVisible(false)}
        onSubmit={handleReceiveMoney}
        accounts={accounts}
        people={people}
        initialPersonId={receiveInitialPersonId}
        initialFlowType={receiveInitialFlowType}
      />

      <BorrowMoneyModal
        visible={borrowMoneyModalVisible}
        onClose={() => setBorrowMoneyModalVisible(false)}
        onSubmit={handleBorrowMoney}
        accounts={accounts}
        people={people}
      />

      <AccountTransferModal
        visible={transferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        onSubmit={handleAccountTransfer}
        accounts={accounts}
      />

      <ManageAccountsModal
        visible={accountsModalVisible}
        onClose={() => setAccountsModalVisible(false)}
        accounts={accounts}
        onCreateAccount={handleCreateAccount}
      />

      <ManagePeopleModal
        visible={peopleModalVisible}
        onClose={() => setPeopleModalVisible(false)}
        people={people}
        onCreatePerson={handleCreatePerson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    gap: 10,
    marginTop: 8,
  },
  section: {
    marginBottom: 8,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  whatIfPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  whatIfText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  balanceMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  vertLine: {
    width: 1,
    height: 24,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionTextWrap: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  familyCardWrap: {
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  familyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  familyCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  familyMiniMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  familyMiniBox: {
    flex: 1,
    alignItems: 'center',
  },
  accountsBarWrap: {
    marginVertical: 6,
  },
  accountsBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  accountsBarTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  manageAccBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  manageAccText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accountsBarScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  accountPillCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
  },
  accountPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  accPillName: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 90,
  },
  accPillAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricsSection: {
    marginTop: 8,
  },
  periodTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  periodTabText: {
    fontSize: 11,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 4,
  },
  debtSection: {
    marginTop: 10,
  },
  debtSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  debtTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  addPersonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  addPersonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  transactionsSection: {
    marginTop: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
