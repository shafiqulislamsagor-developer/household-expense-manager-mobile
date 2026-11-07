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
import { SecondaryButton } from '../../src/components/ui/SecondaryButton';
import { TextInput } from '../../src/components/ui/TextInput';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { Toggle } from '../../src/components/ui/Toggle';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TransactionSkeleton } from '../../src/components/ui/LoadingSkeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { LocalDbService } from '../../src/database/sqlite';
import { ApiClient } from '../../src/services/apiClient';
import { SyncEngine } from '../../src/sync/syncEngine';
import { MoneyUtil } from '../../src/utils/money';
import { isTransactionMonthClosed } from '../../src/utils/closedMonth';
import { ExpenseRequest } from '../../src/types';
import { PredefinedCategory } from '../../src/constants/expenseCategories';
import { useTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/context/ToastContext';

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [closedMonths, setClosedMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Request Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [taka, setTaka] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PredefinedCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Request Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    clientUuid?: string;
    title: string;
    amountTaka: string;
    note: string;
    status: string;
    date: string;
    categoryId?: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Admin Review Modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<ExpenseRequest | null>(null);
  const [reviewPaidFromFund, setReviewPaidFromFund] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ExpenseRequest | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.householdId) return;
    try {
      const local = await LocalDbService.getExpenseRequests(user.householdId);
      setRequests(local);
      setLoading(false); // Instant load without skeletons!

      try {
        const [res, closedRes] = await Promise.all([
          ApiClient.listExpenseRequests(),
          ApiClient.getClosedMonths(),
        ]);

        if (res.success && res.data) {
          setRequests(res.data);
          for (const item of res.data) {
            await LocalDbService.saveExpenseRequest(item, 1);
          }
        }

        if (closedRes.success && closedRes.data) {
          setClosedMonths(closedRes.data);
        }
      } catch {}
    } catch (err) {
      console.error('Load requests error:', err);
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

  const handleSelectCategory = (cat: PredefinedCategory) => {
    setSelectedCategory(cat);
    if (!title.trim() || title === selectedCategory?.defaultTitle) {
      setTitle(cat.defaultTitle);
    }
  };

  const handleSubmitRequest = async () => {
    if (!title.trim() || !taka.trim()) {
      showToast({ type: 'error', message: 'খরচের বিবরণ এবং টাকার পরিমাণ দিন।' });
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

      const item: ExpenseRequest = {
        _id: clientUuid,
        householdId: user!.householdId!,
        requestedByUserId: user!.id,
        amountPaisa: paisa,
        title: title.trim(),
        categoryId: selectedCategory?.id || null,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
        splitType: 'EQUAL',
        splits: [],
        status: 'PENDING',
        clientUuid,
      };

      await LocalDbService.saveExpenseRequest(item, 0);
      await LocalDbService.enqueueSync(clientUuid, 'CREATE', 'EXPENSE_REQUEST', item);

      try {
        await ApiClient.submitExpenseRequest({
          title: item.title,
          amountPaisa: item.amountPaisa,
          categoryId: item.categoryId,
          note: item.note,
          clientUuid,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(paisa)} খরচের আবেদন সফলভাবে জমা দেওয়া হয়েছে।`,
      });

      setModalVisible(false);
      setTitle('');
      setTaka('');
      setNote('');
      setSelectedCategory(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'আবেদন জমা দেওয়া যায়নি।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (item: ExpenseRequest) => {
    setReviewingItem(item);
    setReviewPaidFromFund(true);
    setRejectionReason('');
    setReviewModalVisible(true);
  };

  const handleReviewAction = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!reviewingItem) return;

    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      showToast({ type: 'error', message: 'বাতিল করার কারণ উল্লেখ করুন।' });
      return;
    }

    setIsReviewing(true);
    try {
      await ApiClient.reviewExpenseRequest(
        reviewingItem._id,
        decision,
        decision === 'REJECTED' ? rejectionReason.trim() : undefined,
        reviewPaidFromFund
      );

      SyncEngine.syncNow().catch(() => {});
      showToast({
        type: decision === 'APPROVED' ? 'success' : 'warning',
        message:
          decision === 'APPROVED'
            ? 'আবেদনটি সফলভাবে অনুমোদিত হয়েছে।'
            : 'আবেদনটি বাতিল করা হয়েছে।',
      });

      setReviewModalVisible(false);
      setReviewingItem(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'সিদ্ধান্ত কার্যকর করা যায়নি।' });
    } finally {
      setIsReviewing(false);
    }
  };

  const openEditModal = (item: ExpenseRequest) => {
    const isLocked = item.status === 'APPROVED' && isTransactionMonthClosed(item.date, closedMonths);
    if (isLocked) {
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
      note: item.note || '',
      status: item.status,
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

    setIsUpdating(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const uuid = editingItem.clientUuid || editingItem.id;

      const updated: ExpenseRequest = {
        _id: editingItem.id,
        householdId: user!.householdId!,
        requestedByUserId: user!.id,
        amountPaisa: paisa,
        title: editingItem.title.trim(),
        categoryId: editingItem.categoryId || null,
        date: editingItem.date,
        note: editingItem.note.trim() || undefined,
        splitType: 'EQUAL',
        splits: [],
        status: editingItem.status as any,
        clientUuid: uuid,
      };

      await LocalDbService.saveExpenseRequest(updated, 0);
      await LocalDbService.enqueueSync(uuid, 'UPDATE', 'EXPENSE_REQUEST', updated);

      try {
        await ApiClient.updateExpenseRequest(editingItem.id, {
          title: updated.title,
          amountPaisa: updated.amountPaisa,
          categoryId: updated.categoryId,
          note: updated.note,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: 'success', message: 'আবেদন সফলভাবে আপডেট করা হয়েছে।' });
      setEditModalVisible(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'আপডেট করা যায়নি।' });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = (item: ExpenseRequest) => {
    const isLocked = item.status === 'APPROVED' && isTransactionMonthClosed(item.date, closedMonths);
    if (isLocked) {
      showToast({
        type: 'warning',
        message: 'এই মাসের হিসাব ক্লোজ করা হয়েছে, ডিলিট সম্ভব নয়।',
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
      await LocalDbService.deleteExpenseRequest(itemToDelete._id);
      await LocalDbService.enqueueSync(uuid, 'DELETE', 'EXPENSE_REQUEST', { id: itemToDelete._id });

      try {
        await ApiClient.deleteExpenseRequest(itemToDelete._id);
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: 'success', message: 'আবেদন মুছে ফেলা হয়েছে।' });
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'মুছে ফেলা যায়নি।' });
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'ALL') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const pendingTotalPaisa = requests
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amountPaisa, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="খরচের আবেদন"
        subtitle="সদস্যদের ব্যয়ের আবেদন ও অ্যাডমিন অনুমোদন"
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
        {/* Pending Overview Card */}
        <FinancialSummaryCard
          title="অপেক্ষমান আবেদন সারসংক্ষেপ"
          amountPaisa={pendingTotalPaisa}
          subtitle={`মোট ${MoneyUtil.toBengaliNumber(pendingCount)} টি আবেদন পর্যালোচনার অপেক্ষায়`}
          icon="time-outline"
          variant="hero"
        />

        {/* Action Button */}
        <PrimaryButton
          title="নতুন খরচের আবেদন জমা দিন"
          onPress={() => setModalVisible(true)}
          icon="add-circle-outline"
          style={{ marginVertical: 12 }}
        />

        {/* Status Filter Tabs */}
        <View style={styles.filterPillsRow}>
          {[
            { key: 'ALL', label: 'সকল', count: requests.length },
            { key: 'PENDING', label: 'অপেক্ষমান', count: pendingCount },
            {
              key: 'APPROVED',
              label: 'অনুমোদিত',
              count: requests.filter((r) => r.status === 'APPROVED').length,
            },
            {
              key: 'REJECTED',
              label: 'বাতিল',
              count: requests.filter((r) => r.status === 'REJECTED').length,
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setStatusFilter(item.key as any)}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    statusFilter === item.key
                      ? colors.primary
                      : isDark ? colors.surfaceSubdued : colors.secondaryLight,
                  borderColor:
                    statusFilter === item.key
                      ? colors.primary
                      : isDark ? colors.borderStrong : colors.border,
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={statusFilter === item.key ? '#FFFFFF' : colors.textSecondary}
                weight="700"
              >
                {item.label} ({MoneyUtil.toBengaliNumber(item.count)})
              </BengaliText>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <TransactionSkeleton />
            <TransactionSkeleton />
          </View>
        ) : (
          <View style={styles.listSection}>
            <SectionHeader
              title="আবেদনের তালিকা"
              count={filteredRequests.length}
            />

            {filteredRequests.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="কোনো আবেদন পাওয়া যায়নি"
                description="আপনার নির্বাচিত ফিল্টারে কোনো খরচের আবেদন নেই।"
                actionTitle="নতুন আবেদন জমা দিন"
                onActionPress={() => setModalVisible(true)}
              />
            ) : (
              filteredRequests.map((item) => {
                const isMyRequest = item.requestedByUserId === user?.id;
                const isPending = item.status === 'PENDING';
                const isLocked =
                  item.status === 'APPROVED' &&
                  isTransactionMonthClosed(item.date, closedMonths);

                return (
                  <View
                    key={item._id || item.clientUuid}
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surface,
                        borderColor: isDark ? colors.borderStrong : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <BengaliText variant="bodyBold" color={colors.text}>
                          {item.title}
                        </BengaliText>
                        <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                          তারিখ: {MoneyUtil.toBengaliNumber(item.date.split('T')[0])}
                        </BengaliText>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>

                    {item.note ? (
                      <BengaliText
                        variant="caption"
                        color={colors.textSecondary}
                        style={styles.cardNote}
                      >
                        মন্তব্য: {item.note}
                      </BengaliText>
                    ) : null}

                    {item.status === 'REJECTED' && item.rejectionReason && (
                      <View
                        style={[
                          styles.rejectionBox,
                          {
                            backgroundColor: isDark ? '#3B1515' : '#FEF2F2',
                            borderColor: isDark ? '#7F1D1D' : '#FECACA',
                          },
                        ]}
                      >
                        <Ionicons name="information-circle" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                        <BengaliText variant="caption" color={colors.danger}>
                          বাতিলের কারণ: {item.rejectionReason}
                        </BengaliText>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <BengaliText variant="h3" color={colors.primary} weight="700">
                        {MoneyUtil.formatBengaliCurrency(item.amountPaisa)}
                      </BengaliText>

                      <View style={styles.cardActions}>
                        {/* Admin Review Action */}
                        {isAdmin && isPending && (
                          <TouchableOpacity
                            onPress={() => openReviewModal(item)}
                            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                          >
                            <Ionicons name="checkmark-done" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <BengaliText variant="caption" color="#FFFFFF" weight="700" numberOfLines={1}>
                              পর্যালোচনা
                            </BengaliText>
                          </TouchableOpacity>
                        )}

                        {/* Edit Action for Member */}
                        {(isMyRequest || isAdmin) && isPending && (
                          <TouchableOpacity
                            onPress={() => openEditModal(item)}
                            style={[
                              styles.iconBtn,
                              {
                                backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                              },
                            ]}
                          >
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        )}

                        {/* Delete Action for Member */}
                        {(isMyRequest || isAdmin) && isPending && !isLocked && (
                          <TouchableOpacity
                            onPress={() => confirmDelete(item)}
                            style={[styles.iconBtn, { backgroundColor: isDark ? '#3B1515' : '#FEF2F2' }]}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* New Request Modal */}
      <BottomSheet
        visible={modalVisible}
        title="খরচের আবেদন জমা দিন"
        subtitle="অ্যাডমিনের অনুমোদনের জন্য ব্যয়ের পরিমাণ ও বিবরণ দিন"
        onClose={() => setModalVisible(false)}
      >
        <TextInput
          label="খরচের বিবরণ"
          placeholder="যেমন: মাসিক বাজার, ওয়াইফাই বিল, গ্যাসের সিলিন্ডার..."
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

        <TextInput
          label="মন্তব্য বা ভাউচার বিবরণ (ঐচ্ছিক)"
          placeholder="প্রয়োজনীয় তথ্য লিখুন..."
          value={note}
          onChangeText={setNote}
        />

        <PrimaryButton
          title="আবেদন জমা দিন"
          onPress={handleSubmitRequest}
          loading={isSubmitting}
          icon="paper-plane-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Admin Review Bottom Sheet */}
      <BottomSheet
        visible={reviewModalVisible}
        title="আবেদন পর্যালোচনা করুন"
        subtitle={reviewingItem ? `${reviewingItem.title} - ${MoneyUtil.formatBengaliCurrency(reviewingItem.amountPaisa)}` : ''}
        onClose={() => setReviewModalVisible(false)}
      >
        {reviewingItem && (
          <>
            <Toggle
              label="কমন ফান্ড থেকে খরচ অনুমোদন?"
              subtitle={
                reviewPaidFromFund
                  ? 'হ্যাঁ, টাকা কমন রিজার্ভ ফান্ড থেকে বিয়োগ হবে'
                  : 'না, আবেদনকারী তাঁর নিজস্ব পকেট থেকে বহন করেছেন'
              }
              value={reviewPaidFromFund}
              onValueChange={setReviewPaidFromFund}
            />

            <TextInput
              label="বাতিলের কারণ (বাতিল করতে চাইলে লিখুন)"
              placeholder="যেমন: ভাউচার সঠিক নয়, চলতি মাসের বাজেট শেষ..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  title="আবেদন বাতিল"
                  onPress={() => handleReviewAction('REJECTED')}
                  color={colors.danger}
                  loading={isReviewing}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="অনুমোদন করুন"
                  onPress={() => handleReviewAction('APPROVED')}
                  variant="accent"
                  loading={isReviewing}
                />
              </View>
            </View>
          </>
        )}
      </BottomSheet>

      {/* Edit Modal */}
      <BottomSheet
        visible={editModalVisible}
        title="আবেদন সংশোধন করুন"
        subtitle="তথ্য পরিবর্তন করে জমা দিন"
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
        title="আবেদন মুছে ফেলা"
        message={`আপনি কি নিশ্চিত '${itemToDelete?.title}' আবেদনটি মুছে ফেলতে চান?`}
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
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  listSection: {
    marginTop: 4,
  },
  requestCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardNote: {
    marginTop: 6,
    fontSize: 12.5,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
