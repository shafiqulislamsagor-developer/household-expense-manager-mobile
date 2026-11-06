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
import { MonthlyExpensePlanSummary } from '../src/types';

export default function MonthlyPlanScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planSummary, setPlanSummary] = useState<MonthlyExpensePlanSummary | null>(null);

  // Selected Month (YYYY-MM)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Edit / Create Plan Modal
  const [planModal, setPlanModal] = useState(false);
  const [budgetTaka, setBudgetTaka] = useState('');
  const [planItems, setPlanItems] = useState<Array<{ categoryName: string; amountTaka: string }>>([
    { categoryName: 'বাসা ভাড়া', amountTaka: '১২০০০' },
    { categoryName: 'বাজার খরচ', amountTaka: '৮০০০' },
    { categoryName: 'বিদ্যুৎ ও অন্যান্য বিল', amountTaka: '৩০০০' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getMonthlyPlan(selectedMonth);
      if (res?.success && res.data) {
        setPlanSummary(res.data);
        if (res.data.totalPlannedBudgetPaisa > 0) {
          setBudgetTaka((res.data.totalPlannedBudgetPaisa / 100).toString());
        }
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'পরিকল্পনা লোড করা যায়নি।' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlan();
  };

  const handleSavePlan = async () => {
    const totalNum = parseFloat(budgetTaka);
    if (isNaN(totalNum) || totalNum <= 0) {
      showToast({ type: 'error', message: 'সঠিক বাজেট টাকার পরিমাণ দিন।' });
      return;
    }

    const items = planItems
      .filter((i) => i.categoryName.trim() && parseFloat(i.amountTaka) > 0)
      .map((i) => ({
        categoryName: i.categoryName.trim(),
        plannedAmountPaisa: MoneyUtil.takaToPaisa(parseFloat(i.amountTaka)),
      }));

    setIsSaving(true);
    try {
      const res = await ApiClient.saveMonthlyPlan({
        month: selectedMonth,
        totalPlannedBudgetPaisa: MoneyUtil.takaToPaisa(totalNum),
        items,
      });
      if (res?.success) {
        showToast({ type: 'success', message: 'মাসিক বাজেট পরিকল্পনা সংরক্ষিত হয়েছে!' });
        setPlanModal(false);
        loadPlan();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'সংরক্ষণ করা যায়নি।' });
    } finally {
      setIsSaving(false);
    }
  };

  const addPlanItemRow = () => {
    setPlanItems([...planItems, { categoryName: '', amountTaka: '' }]);
  };

  const removePlanItemRow = (idx: number) => {
    setPlanItems(planItems.filter((_, i) => i !== idx));
  };

  const pct = planSummary?.budgetUsedPercentage || 0;
  const isOverBudget = pct > 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="মাসিক বাজেট ও পরিকল্পনা"
        subtitle="পরিকল্পিত বাজেট বনাম প্রকৃত ব্যয়ের ট্র্যাকিং"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HERO BUDGET VS ACTUAL PROGRESS CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <BengaliText variant="caption" color={colors.textMuted}>
                চলতি মাসের মোট বাজেট ({selectedMonth})
              </BengaliText>
              <BengaliText variant="h1" color={colors.primary} weight="800">
                {planSummary ? MoneyUtil.formatBengaliCurrency(planSummary.totalPlannedBudgetPaisa) : '৳০.০০'}
              </BengaliText>
            </View>

            {isAdmin && (
              <TouchableOpacity
                style={[styles.editPlanBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setPlanModal(true)}
              >
                <Ionicons name="create-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.primary} weight="700">
                  বাজেট পরিবর্তন
                </BengaliText>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.surfaceSubdued : '#E2E8F0' }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: isOverBudget ? colors.danger : pct > 80 ? colors.warning : colors.accent,
                },
              ]}
            />
          </View>

          {/* Budget Metrics Row */}
          <View style={styles.metricsRow}>
            <View>
              <BengaliText variant="caption" color={colors.textMuted}>
                প্রকৃত খরচ হয়েছে
              </BengaliText>
              <BengaliText variant="bodyBold" color={isOverBudget ? colors.danger : colors.text}>
                {planSummary ? MoneyUtil.formatBengaliCurrency(planSummary.totalActualExpensePaisa) : '৳০.০০'} ({pct}%)
              </BengaliText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <BengaliText variant="caption" color={colors.textMuted}>
                অবশিষ্ট বাজেট
              </BengaliText>
              <BengaliText
                variant="bodyBold"
                color={planSummary && planSummary.remainingBudgetPaisa >= 0 ? colors.accent : colors.danger}
              >
                {planSummary ? MoneyUtil.formatBengaliCurrency(planSummary.remainingBudgetPaisa) : '৳০.০০'}
              </BengaliText>
            </View>
          </View>
        </View>

        {/* CATEGORY BREAKDOWN PLAN VS ACTUAL */}
        <SectionHeader
          title="খাতভিত্তিক বাজেট বনাম প্রকৃত খরচ"
          subtitle="পরিকল্পিত খরচের সাথে বর্তমান খরচের তুলনা"
          count={planSummary?.items?.length || 0}
        />

        {(!planSummary?.items || planSummary.items.length === 0) ? (
          <EmptyState
            icon="clipboard-outline"
            title="কোনো বাজেট প্ল্যান তৈরি করা হয়নি"
            description="অ্যাডমিন হিসেবে চলতি মাসের জন্য বাজেট প্ল্যান সেট করুন।"
            actionTitle={isAdmin ? 'বাজেট প্ল্যান তৈরি করুন' : undefined}
            onActionPress={isAdmin ? () => setPlanModal(true) : undefined}
          />
        ) : (
          planSummary.items.map((item, idx) => {
            const itemPct = item.plannedAmountPaisa > 0
              ? Math.round((item.actualSpentPaisa / item.plannedAmountPaisa) * 100)
              : 0;

            return (
              <View
                key={idx}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <View style={styles.itemHeader}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    {item.categoryName}
                  </BengaliText>
                  <BengaliText
                    variant="caption"
                    color={itemPct > 100 ? colors.danger : colors.textMuted}
                    weight="700"
                  >
                    বাজেটের {itemPct}% ব্যবহৃত
                  </BengaliText>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrackSmall, { backgroundColor: isDark ? colors.surfaceSubdued : '#E2E8F0' }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, itemPct)}%`,
                        backgroundColor: itemPct > 100 ? colors.danger : colors.accent,
                      },
                    ]}
                  />
                </View>

                <View style={styles.itemAmountsRow}>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    প্ল্যান: {MoneyUtil.formatBengaliCurrency(item.plannedAmountPaisa)}
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.text} weight="700">
                    ব্যয়: {MoneyUtil.formatBengaliCurrency(item.actualSpentPaisa)}
                  </BengaliText>
                  <BengaliText
                    variant="caption"
                    color={item.variancePaisa >= 0 ? colors.accent : colors.danger}
                    weight="700"
                  >
                    {item.variancePaisa >= 0 ? 'বাকি: ' : 'ঘাটতি: '}
                    {MoneyUtil.formatBengaliCurrency(Math.abs(item.variancePaisa))}
                  </BengaliText>
                </View>
              </View>
            );
          })
        )}

        {/* MEMBER EXPECTED CONTRIBUTIONS */}
        {planSummary?.memberExpectedContributions && planSummary.memberExpectedContributions.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <SectionHeader
              title="সদস্যভিত্তিক প্রত্যাশিত চাঁদা"
              subtitle="বাজেট পূরণে সদস্যদের সম্ভাব্য জমা ও বর্তমান স্থিতি"
              count={planSummary.memberExpectedContributions.length}
            />

            {planSummary.memberExpectedContributions.map((mec) => (
              <View
                key={mec.userId}
                style={[
                  styles.memberContribCard,
                  { backgroundColor: colors.surface, borderColor: isDark ? colors.borderStrong : colors.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    {mec.userName}
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    প্রত্যাশিত: {MoneyUtil.formatBengaliCurrency(mec.expectedAmountPaisa)}
                  </BengaliText>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <BengaliText variant="bodyBold" color={colors.accent} weight="700">
                    জমা: {MoneyUtil.formatBengaliCurrency(mec.actualPaidPaisa)}
                  </BengaliText>
                  <BengaliText
                    variant="caption"
                    color={mec.remainingDuePaisa > 0 ? colors.danger : colors.success}
                    weight="700"
                  >
                    {mec.remainingDuePaisa > 0
                      ? `বাকি: ${MoneyUtil.formatBengaliCurrency(mec.remainingDuePaisa)}`
                      : 'সম্পূর্ণ পরিশোধিত'}
                  </BengaliText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* EDIT PLAN MODAL */}
      <BottomSheet
        visible={planModal}
        title="মাসিক বাজেট পরিকল্পনা"
        subtitle={`${selectedMonth} মাসের জন্য বাজেট নির্ধারণ করুন`}
        onClose={() => setPlanModal(false)}
      >
        <ScrollView style={{ maxHeight: 420 }}>
          <AmountInput
            label="মাসের মোট সর্বোচ্চ বাজেট (৳)"
            value={budgetTaka}
            onChangeTaka={setBudgetTaka}
            placeholder="০.০০"
          />

          <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 12, marginBottom: 6 }}>
            খাতভিত্তিক বাজেট বন্টন:
          </BengaliText>

          {planItems.map((item, idx) => (
            <View key={idx} style={styles.planItemRow}>
              <TextInput
                value={item.categoryName}
                onChangeText={(txt) => {
                  const arr = [...planItems];
                  arr[idx].categoryName = txt;
                  setPlanItems(arr);
                }}
                placeholder="খাতের নাম"
                style={{ flex: 1.2, marginRight: 6 }}
              />

              <TextInput
                value={item.amountTaka}
                onChangeText={(txt) => {
                  const arr = [...planItems];
                  arr[idx].amountTaka = txt;
                  setPlanItems(arr);
                }}
                placeholder="টাকা"
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 6 }}
              />

              <TouchableOpacity
                onPress={() => removePlanItemRow(idx)}
                style={{ padding: 6 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addItemBtn, { borderColor: colors.primary }]}
            onPress={addPlanItemRow}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <BengaliText variant="caption" color={colors.primary} weight="700">
              + নতুন খাত যোগ করুন
            </BengaliText>
          </TouchableOpacity>

          <PrimaryButton
            title="বাজেট পরিকল্পনা সংরক্ষণ করুন"
            onPress={handleSavePlan}
            loading={isSaving}
            variant="primary"
            icon="save-outline"
            style={{ marginTop: 14 }}
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
    marginBottom: 12,
  },
  editPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressTrackSmall: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberContribCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 6,
  },
});
