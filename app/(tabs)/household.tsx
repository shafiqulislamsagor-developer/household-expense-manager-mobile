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
import { SearchInput } from '../../src/components/ui/SearchInput';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { Toggle } from '../../src/components/ui/Toggle';
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
import { HouseholdExpense } from '../../src/types';
import { PredefinedCategory, PREDEFINED_EXPENSE_CATEGORIES } from '../../src/constants/expenseCategories';
import { useTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/context/ToastContext';

export default function HouseholdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [expenses, setExpenses] = useState<HouseholdExpense[]>([]);
  const [closedMonths, setClosedMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Month filtering
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [taka, setTaka] = useState('');
  const [note, setNote] = useState('');
  const [paidFromFund, setPaidFromFund] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PredefinedCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    clientUuid?: string;
    title: string;
    amountTaka: string;
    paidFromFund: boolean;
    note: string;
    date: string;
    categoryId?: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!user?.householdId) return;
    try {
      const local = await LocalDbService.getHouseholdExpenses(user.householdId);
      setExpenses(local);
      setLoading(false); // Instant load without skeletons!

      try {
        const [res, closedRes] = await Promise.all([
          ApiClient.listHouseholdExpenses(),
          ApiClient.getClosedMonths(),
        ]);
        if (res.success && res.data) {
          setExpenses(res.data);
          for (const item of res.data) {
            await LocalDbService.saveHouseholdExpense(item, 1);
          }
        }
        if (closedRes.success && closedRes.data) {
          setClosedMonths(closedRes.data);
        }
      } catch {}
    } catch (err) {
      console.error('Load household expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await SyncEngine.syncNow().catch(() => {});
    await loadData();
    setRefreshing(false);
  };

  // Filtered expenses by month and search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const ym = parseYearMonth(e.date);
      if (ym.year !== selectedYear || ym.month !== selectedMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchNote = e.note ? e.note.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchNote) return false;
      }
      return true;
    });
  }, [expenses, selectedYear, selectedMonth, searchQuery]);

  // Filtered metrics
  const totalExpensePaisa = filteredExpenses.reduce((acc, e) => acc + e.amountPaisa, 0);
  const paidFromFundPaisa = filteredExpenses
    .filter((e) => e.paidFromFund)
    .reduce((acc, e) => acc + e.amountPaisa, 0);
  const paidByMembersPaisa = filteredExpenses
    .filter((e) => !e.paidFromFund)
    .reduce((acc, e) => acc + e.amountPaisa, 0);

  // Check if selected month is closed
  const isSelectedPeriodClosed = isTransactionMonthClosed(
    `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
    closedMonths
  );

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (filteredExpenses.length === 0) return [];
    const catMap = new Map<string, { id: string; name: string; amountPaisa: number }>();
    for (const exp of filteredExpenses) {
      const catId = exp.categoryId || 'misc';
      const predefined = PREDEFINED_EXPENSE_CATEGORIES.find((c) => c.id === catId);
      const catName = predefined?.name || exp.title || 'বিবিধ খরচ';
      const existing = catMap.get(catId);
      if (existing) {
        existing.amountPaisa += exp.amountPaisa;
      } else {
        catMap.set(catId, {
          id: catId,
          name: catName,
          amountPaisa: exp.amountPaisa,
        });
      }
    }
    return Array.from(catMap.values());
  }, [filteredExpenses]);

  const handleSelectCategory = (cat: PredefinedCategory) => {
    setSelectedCategory(cat);
    if (!title.trim() || title === selectedCategory?.defaultTitle) {
      setTitle(cat.defaultTitle);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !taka.trim()) {
      showToast({ type: 'error', message: 'খরচের বিবরণ এবং টাকার পরিমাণ দিন।' });
      return;
    }

    const takaNum = parseFloat(taka);
    if (isNaN(takaNum) || takaNum <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    const currentDate = new Date().toISOString();
    if (isTransactionMonthClosed(currentDate, closedMonths)) {
      showToast({
        type: 'warning',
        message: 'চলতি মাসের পারিবারিক হিসাব ক্লোজ করা হয়েছে। নতুন খরচ যুক্ত করা সম্ভব নয়।',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const clientUuid = generateUuid();

      const newExpense: HouseholdExpense = {
        _id: clientUuid,
        householdId: user!.householdId!,
        paidByUserId: paidFromFund ? null : user!.id,
        paidFromFund,
        amountPaisa: paisa,
        categoryId: selectedCategory?.id || null,
        title: title.trim(),
        date: currentDate,
        note: note.trim() || undefined,
        splitType: 'EQUAL',
        splits: [],
        approvalStatus: 'APPROVED',
        clientUuid,
      };

      await LocalDbService.saveHouseholdExpense(newExpense, 0);
      await LocalDbService.enqueueSync(clientUuid, 'CREATE', 'HOUSEHOLD_EXPENSE', newExpense);

      try {
        await ApiClient.createHouseholdExpense({
          title: newExpense.title,
          amountPaisa: newExpense.amountPaisa,
          paidFromFund: newExpense.paidFromFund,
          paidByUserId: newExpense.paidByUserId,
          categoryId: newExpense.categoryId,
          note: newExpense.note,
          clientUuid,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(paisa)} পারিবারিক খরচ সফলভাবে সংরক্ষিত হয়েছে।`,
      });

      setCreateModalVisible(false);
      setTitle('');
      setTaka('');
      setNote('');
      setPaidFromFund(false);
      setSelectedCategory(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'যুক্ত করা যায়নি।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: HouseholdExpense) => {
    if (isTransactionMonthClosed(item.date, closedMonths)) {
      showToast({
        type: 'warning',
        message: 'এই মাসের পারিবারিক হিসাব ক্লোজ করা হয়েছে, পরিবর্তন সম্ভব নয়।',
      });
      return;
    }

    setEditingItem({
      id: item._id,
      clientUuid: item.clientUuid,
      title: item.title,
      amountTaka: MoneyUtil.paisaToTaka(item.amountPaisa).toString(),
      paidFromFund: item.paidFromFund,
      note: item.note || '',
      date: item.date,
      categoryId: item.categoryId || undefined,
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!editingItem.title.trim() || !editingItem.amountTaka.trim()) {
      showToast({ type: 'error', message: 'বিবরণ এবং টাকার পরিমাণ দিন।' });
      return;
    }

    const takaNum = parseFloat(editingItem.amountTaka);
    if (isNaN(takaNum) || takaNum <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    if (isTransactionMonthClosed(editingItem.date, closedMonths)) {
      showToast({
        type: 'warning',
        message: 'এই মাসের হিসাব ক্লোজ করা হয়েছে, পরিবর্তন সম্ভব নয়।',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const uuid = editingItem.clientUuid || editingItem.id;

      const updated: HouseholdExpense = {
        _id: editingItem.id,
        householdId: user!.householdId!,
        paidByUserId: editingItem.paidFromFund ? null : user!.id,
        paidFromFund: editingItem.paidFromFund,
        amountPaisa: paisa,
        categoryId: editingItem.categoryId || null,
        title: editingItem.title.trim(),
        date: editingItem.date,
        note: editingItem.note.trim() || undefined,
        splitType: 'EQUAL',
        splits: [],
        approvalStatus: 'APPROVED',
        clientUuid: uuid,
      };

      await LocalDbService.saveHouseholdExpense(updated, 0);
      await LocalDbService.enqueueSync(uuid, 'UPDATE', 'HOUSEHOLD_EXPENSE', updated);

      try {
        await ApiClient.updateHouseholdExpense(editingItem.id, {
          title: updated.title,
          amountPaisa: updated.amountPaisa,
          paidFromFund: updated.paidFromFund,
          note: updated.note,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: 'success', message: 'পারিবারিক খরচ সফলভাবে আপডেট করা হয়েছে।' });
      setEditModalVisible(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'আপডেট করা যায়নি।' });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = (item: HouseholdExpense) => {
    if (isTransactionMonthClosed(item.date, closedMonths)) {
      showToast({
        type: 'warning',
        message: 'এই মাসের হিসাব ক্লোজ করা হয়েছে, ডিলিট করা সম্ভব নয়।',
      });
      return;
    }
    setItemToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const uuid = itemToDelete.clientUuid || itemToDelete._id;
      await LocalDbService.deleteHouseholdExpense(itemToDelete._id);
      await LocalDbService.enqueueSync(uuid, 'DELETE', 'HOUSEHOLD_EXPENSE', { id: itemToDelete._id });

      try {
        await ApiClient.deleteHouseholdExpense(itemToDelete._id);
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: 'success', message: 'পারিবারিক খরচ মুছে ফেলা হয়েছে।' });
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'মুছে ফেলা যায়নি।' });
    }
  };

  const postClosingPendingExpenses = useMemo(() => {
    return expenses.filter((e) => e.approvalStatus === 'POST_CLOSING_PENDING');
  }, [expenses]);

  const handleReviewPostClosing = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await ApiClient.reviewPostClosingAdjustment(id, status);
      showToast({
        type: 'success',
        message: status === 'APPROVED' ? 'পোস্ট-ক্লোজিং খরচ অনুমোদিত হয়েছে।' : 'পোস্ট-ক্লোজিং খরচ বাতিল হয়েছে।',
      });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'পর্যালোচনা ব্যর্থ হয়েছে।' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="পারিবারিক খরচ"
        subtitle="পরিবারের কমন ও যৌথ খরচের সম্পূর্ণ হিসাব"
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
        {/* Month Selector */}
        <MonthSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelectYearMonth={(y, m) => {
            setSelectedYear(y);
            setSelectedMonth(m);
          }}
          closedMonths={closedMonths}
        />

        {/* Closed Month Alert Banner */}
        {isSelectedPeriodClosed && (
          <View
            style={[
              styles.closedMonthBanner,
              {
                backgroundColor: isDark ? '#374151' : '#F1F5F9',
                borderColor: isDark ? '#6B7280' : '#CBD5E1',
              },
            ]}
          >
            <Ionicons name="lock-closed" size={22} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                হিসাবের মেয়াদ বন্ধ (Closed Month)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                এই মাসের আর্থিক হিসাব সম্পন্ন ও ক্লোজ করা হয়েছে। নতুন এন্ট্রি বা এডিট অনুমোদিত নয়।
              </BengaliText>
            </View>
          </View>
        )}

        {/* Post-Closing Pending Adjustments Banner */}
        {postClosingPendingExpenses.length > 0 && (
          <View
            style={[
              styles.closedMonthBanner,
              {
                backgroundColor: isDark ? '#422006' : '#FEF3C7',
                borderColor: isDark ? '#B45309' : '#F59E0B',
                marginVertical: 10,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="time" size={20} color="#D97706" style={{ marginRight: 8 }} />
              <BengaliText variant="bodyBold" color="#B45309">
                হিসাব বন্ধের পর অফলাইন খরচ ({postClosingPendingExpenses.length}টি)
              </BengaliText>
            </View>
            <BengaliText variant="caption" color={isDark ? '#FDE68A' : '#92400E'} style={{ marginBottom: 10 }}>
              এই খরচগুলো মাস ক্লোজ থাকার সময় অফলাইনে জমা পড়েছিল। অ্যাডমিন অনুমোদন দিলে হিসাব বন্ধ পরবর্তী সমন্বয় হিসেবে যুক্ত হবে।
            </BengaliText>

            {postClosingPendingExpenses.map((p) => (
              <View
                key={p._id || p.clientUuid}
                style={{
                  backgroundColor: isDark ? '#292524' : '#FFFFFF',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: isDark ? '#57534E' : '#FDE68A',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    {p.title}
                  </BengaliText>
                  <BengaliText variant="bodyBold" color={colors.primary}>
                    {MoneyUtil.formatBengaliCurrency(p.amountPaisa)}
                  </BengaliText>
                </View>
                <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  তারিখ: {new Date(p.date).toLocaleDateString('bn-BD')} {p.note ? `• ${p.note}` : ''}
                </BengaliText>

                {isAdmin && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleReviewPostClosing(p._id, 'APPROVED')}
                      style={{
                        backgroundColor: '#16A34A',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <BengaliText variant="caption" color="#FFFFFF" weight="700">
                        অনুমোদন করুন
                      </BengaliText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReviewPostClosing(p._id, 'REJECTED')}
                      style={{
                        backgroundColor: colors.danger,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <BengaliText variant="caption" color="#FFFFFF" weight="700">
                        বাতিল
                      </BengaliText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <CardSkeleton />
            <TransactionSkeleton />
            <TransactionSkeleton />
          </View>
        ) : (
          <>
            {/* Family Money Hub Shortcut Banner */}
            <TouchableOpacity
              style={[
                styles.familyHubBanner,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? colors.borderStrong : colors.border,
                },
              ]}
              onPress={() => router.push('/family-finance')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}>
                <Ionicons name="people" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <BengaliText variant="bodyBold" color={colors.text}>
                  পারিবারিক অর্থ ব্যবস্থাপনা (Family Money)
                </BengaliText>
                <BengaliText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  পারিবারিক খরচ, ঋণ, অগ্রিম, উপহার ও চাঁদার পৃথক ট্র্যাকিং
                </BengaliText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>

            {/* Overview Metric Cards */}
            <FinancialSummaryCard
              title="মোট পারিবারিক ব্যয়"
              amountPaisa={totalExpensePaisa}
              subtitle="এই মাসে পরিবারের মোট খরচ"
              icon="pie-chart"
              variant="hero"
            />

            <View style={styles.gridRow}>
              <FinancialSummaryCard
                title="ফান্ড থেকে প্রদত্ত"
                amountPaisa={paidFromFundPaisa}
                subtitle="কমন ব্যালেন্স থেকে খরচ"
                icon="wallet"
                variant="income"
                style={{ flex: 1, marginRight: 6 }}
              />
              <FinancialSummaryCard
                title="সদস্যের পকেট থেকে"
                amountPaisa={paidByMembersPaisa}
                subtitle="সদস্যরা সরাসরি প্রদান করেছেন"
                icon="people"
                variant="expense"
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            {/* Search Input */}
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="পারিবারিক খরচের বিবরণ বা নোট দিয়ে খুঁজুন..."
              style={{ marginVertical: 10 }}
            />

            {/* Quick Action Navigation Pills */}
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
                <Ionicons name="wallet-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
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
                <Ionicons name="pie-chart-outline" size={16} color="#0284C7" style={{ marginRight: 4 }} />
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
                onPress={() => router.push(isAdmin ? '/member-dues' : '/my-dues')}
              >
                <Ionicons name="people-outline" size={16} color={colors.danger} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.danger} weight="700">
                  {isAdmin ? 'সদস্য বকেয়া' : 'আমার বাকি'}
                </BengaliText>
              </TouchableOpacity>
            </View>

            {/* Add Household Expense Button */}
            <PrimaryButton
              title={
                isSelectedPeriodClosed
                  ? '🔒 এই মাসের হিসাব ক্লোজ করা'
                  : 'নতুন পারিবারিক খরচ যোগ করুন'
              }
              onPress={() => setCreateModalVisible(true)}
              disabled={isSelectedPeriodClosed}
              icon="add-circle-outline"
              style={{ marginBottom: 12 }}
            />

            {/* Category Chart */}
            {categoryBreakdown.length > 0 && (
              <ChartCard
                title="পারিবারিক ব্যয়ের খাতভিত্তিক অনুপাত"
                totalPaisa={totalExpensePaisa}
                categories={categoryBreakdown}
              />
            )}

            {/* Transaction List */}
            <View style={styles.listSection}>
              <SectionHeader
                title="পারিবারিক খরচের তালিকা"
                count={filteredExpenses.length}
              />

              {filteredExpenses.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="কোনো পারিবারিক খরচ পাওয়া যায়নি"
                  description="এই মাসে কোনো পারিবারিক ব্যয়ের হিসাব রেকর্ড করা নেই।"
                  actionTitle={isSelectedPeriodClosed ? undefined : 'নতুন খরচ যোগ করুন'}
                  onActionPress={isSelectedPeriodClosed ? undefined : () => setCreateModalVisible(true)}
                />
              ) : (
                filteredExpenses.map((item) => (
                  <TransactionItem
                    key={item._id || item.clientUuid}
                    title={item.title}
                    date={item.date}
                    amountPaisa={item.amountPaisa}
                    type="EXPENSE"
                    category="পারিবারিক"
                    paidFromFund={item.paidFromFund}
                    subtitle={
                      item.isPostClosingAdjustment
                        ? `${item.note ? item.note + ' • ' : ''}🏷️ হিসাব বন্ধ পরবর্তী সংযোজন`
                        : item.note
                    }
                    isLocked={isTransactionMonthClosed(item.date, closedMonths)}
                    onEdit={() => openEditModal(item)}
                    onDelete={() => confirmDelete(item)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Modal */}
      <BottomSheet
        visible={createModalVisible}
        title="পারিবারিক খরচ যোগ করুন"
        subtitle="পরিবারের কমন বা সদস্যের পকেট থেকে প্রদত্ত খরচের হিসাব"
        onClose={() => setCreateModalVisible(false)}
      >
        <TextInput
          label="খরচের বিবরণ"
          placeholder="যেমন: বাজার খরচ, বিদ্যুৎ বিল, কাজের বুয়ার বেতন..."
          value={title}
          onChangeText={setTitle}
          required
        />

        <CategoryPicker
          type="EXPENSE"
          selectedCategoryId={selectedCategory?.id}
          onSelectCategory={handleSelectCategory}
        />

        <AmountInput
          label="টাকার পরিমাণ"
          value={taka}
          onChangeTaka={setTaka}
          required
        />

        <Toggle
          label="কমন ফান্ড থেকে খরচ করা হয়েছে?"
          subtitle={
            paidFromFund
              ? 'হ্যাঁ, এটি সরাসরি কমন রিজার্ভ ফান্ড থেকে বিয়োগ হবে'
              : 'না, এটি আপনি আপনার ব্যক্তিগত পকেট থেকে পরিশোধ করেছেন'
          }
          value={paidFromFund}
          onValueChange={setPaidFromFund}
        />

        <TextInput
          label="মন্তব্য বা ভাউচার নম্বর (ঐচ্ছিক)"
          placeholder="প্রয়োজনীয় রেফারেন্স লিখুন..."
          value={note}
          onChangeText={setNote}
        />

        <PrimaryButton
          title="পারিবারিক খরচ সংরক্ষণ করুন"
          onPress={handleCreate}
          loading={isSubmitting}
          icon="checkmark-circle-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Edit Modal */}
      <BottomSheet
        visible={editModalVisible}
        title="পারিবারিক খরচ সংশোধন"
        subtitle="তথ্য পরিবর্তন করে সংরক্ষণ করুন"
        onClose={() => setEditModalVisible(false)}
      >
        {editingItem && (
          <>
            <TextInput
              label="খরচের বিবরণ"
              value={editingItem.title}
              onChangeText={(text) => setEditingItem({ ...editingItem, title: text })}
              required
            />

            <AmountInput
              label="টাকার পরিমাণ"
              value={editingItem.amountTaka}
              onChangeTaka={(val) => setEditingItem({ ...editingItem, amountTaka: val })}
              required
            />

            <Toggle
              label="কমন ফান্ড থেকে খরচ?"
              subtitle={editingItem.paidFromFund ? 'কমন ফান্ড থেকে' : 'সদস্যের পকেট থেকে'}
              value={editingItem.paidFromFund}
              onValueChange={(val) => setEditingItem({ ...editingItem, paidFromFund: val })}
            />

            <TextInput
              label="নোট বা মন্তব্য"
              placeholder="প্রয়োজনীয় নোট লিখুন..."
              value={editingItem.note}
              onChangeText={(text) => setEditingItem({ ...editingItem, note: text })}
            />

            <PrimaryButton
              title="পরিবর্তন সংরক্ষণ করুন"
              onPress={handleUpdate}
              loading={isUpdating}
              icon="save-outline"
              size="lg"
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="মুছে ফেলা নিশ্চিত করুন"
        message={`আপনি কি নিশ্চিত '${itemToDelete?.title}' খরচের হিসাবটি মুছে ফেলতে চান?`}
        confirmTitle="হ্যাঁ, মুছুন"
        isDestructive
        onConfirm={executeDelete}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setItemToDelete(null);
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    gap: 10,
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 4,
  },
  familyHubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  hubIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  closedMonthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    marginVertical: 8,
  },
  listSection: {
    marginTop: 4,
  },
});
