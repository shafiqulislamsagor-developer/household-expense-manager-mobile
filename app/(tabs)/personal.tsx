import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
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
import { parseYearMonth } from '../../src/utils/monthStats';
import { PersonalExpense, PersonalIncome } from '../../src/types';
import { PredefinedCategory, PREDEFINED_EXPENSE_CATEGORIES } from '../../src/constants/expenseCategories';
import { useTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/context/ToastContext';

export default function PersonalScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [incomes, setIncomes] = useState<PersonalIncome[]>([]);
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
  const [selectedCategory, setSelectedCategory] = useState<PredefinedCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    clientUuid?: string;
    type: 'EXPENSE' | 'INCOME';
    title: string;
    amountTaka: string;
    note: string;
    date: string;
    categoryId?: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [expList, incList] = await Promise.all([
        LocalDbService.getPersonalExpenses(user.id),
        LocalDbService.getPersonalIncomes(user.id),
      ]);
      setExpenses(expList);
      setIncomes(incList);
      setLoading(false); // Instant load without skeletons!

      try {
        const [serverExp, serverInc] = await Promise.all([
          ApiClient.listPersonalExpenses(),
          ApiClient.listPersonalIncomes(),
        ]);
        if (serverExp.success && serverExp.data) {
          setExpenses(serverExp.data);
          for (const item of serverExp.data) {
            await LocalDbService.savePersonalExpense(item, 1);
          }
        }
        if (serverInc.success && serverInc.data) {
          setIncomes(serverInc.data);
          for (const item of serverInc.data) {
            await LocalDbService.savePersonalIncome(item, 1);
          }
        }
      } catch {}
    } catch (err) {
      console.error('Load personal error:', err);
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

  // Filtered lists by selected month & search query
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

  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      const ym = parseYearMonth(i.date);
      if (ym.year !== selectedYear || ym.month !== selectedMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSource = i.source.toLowerCase().includes(q);
        const matchNote = i.note ? i.note.toLowerCase().includes(q) : false;
        if (!matchSource && !matchNote) return false;
      }
      return true;
    });
  }, [incomes, selectedYear, selectedMonth, searchQuery]);

  // Aggregates
  const totalExpensePaisa = filteredExpenses.reduce((acc, e) => acc + e.amountPaisa, 0);
  const totalIncomePaisa = filteredIncomes.reduce((acc, i) => acc + i.amountPaisa, 0);
  const netSavingsPaisa = totalIncomePaisa - totalExpensePaisa;
  const savingsRate =
    totalIncomePaisa > 0 ? Math.max(0, Math.round((netSavingsPaisa / totalIncomePaisa) * 100)) : 0;

  // Category breakdown for expenses
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
      showToast({ type: 'error', message: 'অনুগ্রহ করে বিবরণ এবং টাকার পরিমাণ দিন।' });
      return;
    }

    const takaNum = parseFloat(taka);
    if (isNaN(takaNum) || takaNum <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const clientUuid = generateUuid();
      const dateIso = new Date().toISOString();

      if (activeTab === 'EXPENSE') {
        const newExpense: PersonalExpense = {
          _id: clientUuid,
          userId: user!.id,
          amountPaisa: paisa,
          title: title.trim(),
          categoryId: selectedCategory?.id || null,
          date: dateIso,
          note: note.trim() || undefined,
          clientUuid,
        };

        await LocalDbService.savePersonalExpense(newExpense, 0);
        await LocalDbService.enqueueSync(clientUuid, 'CREATE', 'PERSONAL_EXPENSE', newExpense);

        try {
          await ApiClient.createPersonalExpense({
            title: newExpense.title,
            amountPaisa: newExpense.amountPaisa,
            categoryId: newExpense.categoryId,
            note: newExpense.note,
            clientUuid,
          });
        } catch {}

        showToast({
          type: 'success',
          message: `${MoneyUtil.formatBengaliCurrency(paisa)} খরচ সফলভাবে যোগ হয়েছে।`,
        });
      } else {
        const newIncome: PersonalIncome = {
          _id: clientUuid,
          userId: user!.id,
          amountPaisa: paisa,
          source: title.trim(),
          categoryId: selectedCategory?.id || null,
          date: dateIso,
          note: note.trim() || undefined,
          clientUuid,
        };

        await LocalDbService.savePersonalIncome(newIncome, 0);
        await LocalDbService.enqueueSync(clientUuid, 'CREATE', 'PERSONAL_INCOME', newIncome);

        try {
          await ApiClient.createPersonalIncome({
            source: newIncome.source,
            amountPaisa: newIncome.amountPaisa,
            categoryId: newIncome.categoryId,
            note: newIncome.note,
            clientUuid,
          });
        } catch {}

        showToast({
          type: 'success',
          message: `${MoneyUtil.formatBengaliCurrency(paisa)} আয় সফলভাবে যোগ হয়েছে।`,
        });
      }

      SyncEngine.syncNow().catch(() => {});
      setCreateModalVisible(false);
      setTitle('');
      setTaka('');
      setNote('');
      setSelectedCategory(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'যুক্ত করা যায়নি।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: any, type: 'EXPENSE' | 'INCOME') => {
    setEditingItem({
      id: item._id,
      clientUuid: item.clientUuid,
      type,
      title: type === 'EXPENSE' ? item.title : item.source,
      amountTaka: MoneyUtil.paisaToTaka(item.amountPaisa).toString(),
      note: item.note || '',
      date: item.date,
      categoryId: item.categoryId,
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

    setIsUpdating(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const uuid = editingItem.clientUuid || editingItem.id;

      if (editingItem.type === 'EXPENSE') {
        const updated: PersonalExpense = {
          _id: editingItem.id,
          userId: user!.id,
          amountPaisa: paisa,
          title: editingItem.title.trim(),
          categoryId: editingItem.categoryId || null,
          date: editingItem.date,
          note: editingItem.note.trim() || undefined,
          clientUuid: uuid,
        };

        await LocalDbService.savePersonalExpense(updated, 0);
        await LocalDbService.enqueueSync(uuid, 'UPDATE', 'PERSONAL_EXPENSE', updated);

        try {
          await ApiClient.updatePersonalExpense(editingItem.id, {
            title: updated.title,
            amountPaisa: updated.amountPaisa,
            categoryId: updated.categoryId,
            note: updated.note,
          });
        } catch {}
      } else {
        const updated: PersonalIncome = {
          _id: editingItem.id,
          userId: user!.id,
          amountPaisa: paisa,
          source: editingItem.title.trim(),
          categoryId: editingItem.categoryId || null,
          date: editingItem.date,
          note: editingItem.note.trim() || undefined,
          clientUuid: uuid,
        };

        await LocalDbService.savePersonalIncome(updated, 0);
        await LocalDbService.enqueueSync(uuid, 'UPDATE', 'PERSONAL_INCOME', updated);

        try {
          await ApiClient.updatePersonalIncome(editingItem.id, {
            source: updated.source,
            amountPaisa: updated.amountPaisa,
            categoryId: updated.categoryId,
            note: updated.note,
          });
        } catch {}
      }

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: 'success', message: 'সফলভাবে আপডেট করা হয়েছে।' });
      setEditModalVisible(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'আপডেট করা যায়নি।' });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = (item: any, type: 'EXPENSE' | 'INCOME') => {
    setItemToDelete({ ...item, itemType: type });
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const uuid = itemToDelete.clientUuid || itemToDelete._id;
      if (itemToDelete.itemType === 'EXPENSE') {
        await LocalDbService.deletePersonalExpense(itemToDelete._id);
        await LocalDbService.enqueueSync(uuid, 'DELETE', 'PERSONAL_EXPENSE', { id: itemToDelete._id });
        try {
          await ApiClient.deletePersonalExpense(itemToDelete._id);
        } catch {}
      } else {
        await LocalDbService.deletePersonalIncome(itemToDelete._id);
        await LocalDbService.enqueueSync(uuid, 'DELETE', 'PERSONAL_INCOME', { id: itemToDelete._id });
        try {
          await ApiClient.deletePersonalIncome(itemToDelete._id);
        } catch {}
      }

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: 'success', message: 'সফলভাবে মুছে ফেলা হয়েছে।' });
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'মুছে ফেলা যায়নি।' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="ব্যক্তিগত হিসাব"
        subtitle="আপনার ব্যক্তিগত আয় ও ব্যয়ের তালিকা"
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
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <CardSkeleton />
            <TransactionSkeleton />
            <TransactionSkeleton />
          </View>
        ) : (
          <>
            {/* Net Savings & Financial Summary Metrics */}
            <FinancialSummaryCard
              title="অবশিষ্ট ব্যক্তিগত সেভিংস"
              amountPaisa={netSavingsPaisa}
              subtitle={`সেভিংস রেট: ${MoneyUtil.toBengaliNumber(savingsRate)}%`}
              icon="wallet"
              variant="hero"
            />

            <View style={styles.gridRow}>
              <FinancialSummaryCard
                title="মোট আয়"
                amountPaisa={totalIncomePaisa}
                subtitle="চলতি মাসের ব্যক্তিগত আয়"
                icon="arrow-down-circle"
                variant="income"
                style={{ flex: 1, marginRight: 6 }}
              />
              <FinancialSummaryCard
                title="মোট ব্যয়"
                amountPaisa={totalExpensePaisa}
                subtitle="চলতি মাসের মোট খরচ"
                icon="arrow-up-circle"
                variant="expense"
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            {/* Segment Tab Switcher */}
            <View
              style={[
                styles.tabSwitcher,
                {
                  backgroundColor: isDark ? colors.surface : colors.surface,
                  borderColor: isDark ? colors.borderStrong : colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setActiveTab('EXPENSE')}
                style={[
                  styles.tabButton,
                  activeTab === 'EXPENSE' && [
                    styles.tabButtonActive,
                    { backgroundColor: colors.danger },
                  ],
                ]}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={18}
                  color={activeTab === 'EXPENSE' ? '#FFFFFF' : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <BengaliText
                  variant="bodyBold"
                  color={activeTab === 'EXPENSE' ? '#FFFFFF' : colors.textSecondary}
                >
                  ব্যক্তিগত খরচ ({MoneyUtil.toBengaliNumber(filteredExpenses.length)})
                </BengaliText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('INCOME')}
                style={[
                  styles.tabButton,
                  activeTab === 'INCOME' && [
                    styles.tabButtonActive,
                    { backgroundColor: colors.accent },
                  ],
                ]}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={18}
                  color={activeTab === 'INCOME' ? '#FFFFFF' : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <BengaliText
                  variant="bodyBold"
                  color={activeTab === 'INCOME' ? '#FFFFFF' : colors.textSecondary}
                >
                  ব্যক্তিগত আয় ({MoneyUtil.toBengaliNumber(filteredIncomes.length)})
                </BengaliText>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeTab === 'EXPENSE'
                  ? 'খরচের বিবরণ বা নোট দিয়ে খুঁজুন...'
                  : 'আয়ের উৎস দিয়ে খুঁজুন...'
              }
              style={{ marginBottom: 12 }}
            />

            {/* Add Button */}
            <PrimaryButton
              title={
                activeTab === 'EXPENSE'
                  ? 'নতুন ব্যক্তিগত খরচ যোগ করুন'
                  : 'নতুন ব্যক্তিগত আয় যোগ করুন'
              }
              onPress={() => setCreateModalVisible(true)}
              icon="add-circle-outline"
              variant={activeTab === 'EXPENSE' ? 'primary' : 'accent'}
              style={{ marginBottom: 12 }}
            />

            {/* Category Chart for Expenses */}
            {activeTab === 'EXPENSE' && categoryBreakdown.length > 0 && (
              <ChartCard
                title="ব্যয়ের খাতভিত্তিক বিভাজন"
                totalPaisa={totalExpensePaisa}
                categories={categoryBreakdown}
              />
            )}

            {/* Transaction List */}
            <View style={styles.listSection}>
              <SectionHeader
                title={
                  activeTab === 'EXPENSE'
                    ? 'ব্যক্তিগত খরচের তালিকা'
                    : 'ব্যক্তিগত আয়ের তালিকা'
                }
                count={
                  activeTab === 'EXPENSE'
                    ? filteredExpenses.length
                    : filteredIncomes.length
                }
              />

              {activeTab === 'EXPENSE' ? (
                filteredExpenses.length === 0 ? (
                  <EmptyState
                    icon="receipt-outline"
                    title="কোনো খরচ যোগ করা হয়নি"
                    description="এই মাসে আপনার ব্যক্তিগত কোনো খরচ পাওয়া যায়নি।"
                    actionTitle="নতুন খরচ যোগ করুন"
                    onActionPress={() => setCreateModalVisible(true)}
                  />
                ) : (
                  filteredExpenses.map((item) => (
                    <TransactionItem
                      key={item._id || item.clientUuid}
                      title={item.title}
                      date={item.date}
                      amountPaisa={item.amountPaisa}
                      type="EXPENSE"
                      category="ব্যক্তিগত"
                      subtitle={item.note}
                      onEdit={() => openEditModal(item, 'EXPENSE')}
                      onDelete={() => confirmDelete(item, 'EXPENSE')}
                    />
                  ))
                )
              ) : filteredIncomes.length === 0 ? (
                <EmptyState
                  icon="cash-outline"
                  title="কোনো আয় যোগ করা হয়নি"
                  description="এই মাসে আপনার কোনো আয়ের রেকর্ড নেই।"
                  actionTitle="নতুন আয় যোগ করুন"
                  onActionPress={() => setCreateModalVisible(true)}
                />
              ) : (
                filteredIncomes.map((item) => (
                  <TransactionItem
                    key={item._id || item.clientUuid}
                    title={item.source}
                    date={item.date}
                    amountPaisa={item.amountPaisa}
                    type="INCOME"
                    category="আয়"
                    subtitle={item.note}
                    onEdit={() => openEditModal(item, 'INCOME')}
                    onDelete={() => confirmDelete(item, 'INCOME')}
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
        title={activeTab === 'EXPENSE' ? 'ব্যক্তিগত খরচ যোগ করুন' : 'ব্যক্তিগত আয় যোগ করুন'}
        subtitle="টাকার পরিমাণ ও বিবরণ দিয়ে সংরক্ষণ করুন"
        onClose={() => setCreateModalVisible(false)}
      >
        <TextInput
          label={activeTab === 'EXPENSE' ? 'খরচের বিবরণ' : 'আয়ের উৎস'}
          placeholder={
            activeTab === 'EXPENSE'
              ? 'যেমন: ওষুধ ক্রয়, বই, যাতায়াত...'
              : 'যেমন: বেতন, ফ্রিল্যান্সিং, বোনাস...'
          }
          value={title}
          onChangeText={setTitle}
          required
        />

        <CategoryPicker
          type={activeTab}
          selectedCategoryId={selectedCategory?.id}
          onSelectCategory={handleSelectCategory}
        />

        <AmountInput
          label="টাকার পরিমাণ"
          value={taka}
          onChangeTaka={setTaka}
          required
        />

        <TextInput
          label="নোট বা মন্তব্য (ঐচ্ছিক)"
          placeholder="প্রয়োজনীয় নোট লিখুন..."
          value={note}
          onChangeText={setNote}
        />

        <PrimaryButton
          title="সংরক্ষণ করুন"
          onPress={handleCreate}
          loading={isSubmitting}
          icon="checkmark-circle-outline"
          size="lg"
          variant={activeTab === 'EXPENSE' ? 'primary' : 'accent'}
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Edit Modal */}
      <BottomSheet
        visible={editModalVisible}
        title="সংশোধন করুন"
        subtitle={editingItem?.type === 'EXPENSE' ? 'ব্যক্তিগত খরচ সম্পাদনা' : 'ব্যক্তিগত আয় সম্পাদনা'}
        onClose={() => setEditModalVisible(false)}
      >
        {editingItem && (
          <>
            <TextInput
              label={editingItem.type === 'EXPENSE' ? 'খরচের বিবরণ' : 'আয়ের উৎস'}
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

            <TextInput
              label="নোট বা মন্তব্য (ঐচ্ছিক)"
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
        message={`আপনি কি নিশ্চিত '${itemToDelete?.title || itemToDelete?.source}' রেকর্ডটি মুছে ফেলতে চান?`}
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
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 4,
    marginVertical: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  listSection: {
    marginTop: 4,
  },
});
