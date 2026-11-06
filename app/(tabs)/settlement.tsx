import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Share,
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
import { SecondaryButton } from '../../src/components/ui/SecondaryButton';
import { TextInput } from '../../src/components/ui/TextInput';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CardSkeleton, TransactionSkeleton } from '../../src/components/ui/LoadingSkeleton';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { ProfileAvatar } from '../../src/components/ui/ProfileAvatar';
import { LocalDbService } from '../../src/database/sqlite';
import { ApiClient } from '../../src/services/apiClient';
import { SyncEngine } from '../../src/sync/syncEngine';
import { MoneyUtil } from '../../src/utils/money';
import {
  buildMonthlySummaries,
  MonthFinancialSummary,
  getBengaliMonthLabel,
} from '../../src/utils/monthStats';
import {
  HouseholdFinancialOverview,
  Settlement,
  PersonalIncome,
  PersonalExpense,
  HouseholdExpense,
  Contribution,
} from '../../src/types';
import { useTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/context/ToastContext';

export default function SettlementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [overview, setOverview] = useState<HouseholdFinancialOverview | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [closedMonths, setClosedMonths] = useState<Array<{ year: number; month: number; closedAt?: string }>>([]);
  const [personalIncomes, setPersonalIncomes] = useState<PersonalIncome[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [householdExpenses, setHouseholdExpenses] = useState<HouseholdExpense[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Settlement Record Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [toUserName, setToUserName] = useState('');
  const [settleTaka, setSettleTaka] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close Month Modal
  const [closeMonthModal, setCloseMonthModal] = useState(false);
  const [closingYear, setClosingYear] = useState(new Date().getFullYear().toString());
  const [closingMonth, setClosingMonth] = useState((new Date().getMonth() + 1).toString());
  const [isClosingMonth, setIsClosingMonth] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.householdId) return;
    try {
      const [localSettle, localPInc, localPExp, localHExp, localContrib] = await Promise.all([
        LocalDbService.getSettlements(user.householdId),
        LocalDbService.getPersonalIncomes(user.id),
        LocalDbService.getPersonalExpenses(user.id),
        LocalDbService.getHouseholdExpenses(user.householdId),
        LocalDbService.getContributions(user.householdId),
      ]);

      setSettlements(localSettle);
      setPersonalIncomes(localPInc);
      setPersonalExpenses(localPExp);
      setHouseholdExpenses(localHExp);
      setContributions(localContrib);

      try {
        const [res, closedRes, pIncRes, pExpRes, hExpRes, contribRes] = await Promise.all([
          ApiClient.getFinancialOverview(),
          ApiClient.getClosedMonths(),
          ApiClient.listPersonalIncomes(),
          ApiClient.listPersonalExpenses(),
          ApiClient.listHouseholdExpenses(),
          ApiClient.listContributions(),
        ]);

        if (res.success && res.data) setOverview(res.data);
        if (closedRes.success && closedRes.data) setClosedMonths(closedRes.data);
        if (pIncRes.success && pIncRes.data) {
          setPersonalIncomes(pIncRes.data);
          for (const item of pIncRes.data) await LocalDbService.savePersonalIncome(item, 1);
        }
        if (pExpRes.success && pExpRes.data) {
          setPersonalExpenses(pExpRes.data);
          for (const item of pExpRes.data) await LocalDbService.savePersonalExpense(item, 1);
        }
        if (hExpRes.success && hExpRes.data) {
          setHouseholdExpenses(hExpRes.data);
          for (const item of hExpRes.data) await LocalDbService.saveHouseholdExpense(item, 1);
        }
        if (contribRes.success && contribRes.data) {
          setContributions(contribRes.data);
          for (const item of contribRes.data) await LocalDbService.saveContribution(item, 1);
        }
      } catch {}
    } catch (err) {
      console.error('Load settlement error:', err);
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

  // Build full monthly summaries across personal and household
  const monthlySummaries: MonthFinancialSummary[] = useMemo(() => {
    return buildMonthlySummaries({
      currentUserId: user?.id || '',
      personalIncomes,
      personalExpenses,
      householdExpenses,
      contributions,
      closedMonths,
    });
  }, [user?.id, personalIncomes, personalExpenses, householdExpenses, contributions, closedMonths]);

  useEffect(() => {
    if (!selectedMonthKey && monthlySummaries.length > 0) {
      setSelectedMonthKey(monthlySummaries[0].key);
    }
  }, [monthlySummaries, selectedMonthKey]);

  const handleRecordSettlement = async () => {
    if (!settleTaka.trim()) {
      showToast({ type: 'error', message: 'টাকার পরিমাণ দিন।' });
      return;
    }

    const takaNum = parseFloat(settleTaka);
    if (isNaN(takaNum) || takaNum <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const clientUuid = generateUuid();

      const item: Settlement = {
        _id: clientUuid,
        householdId: user!.householdId!,
        fromUserId: user!.id,
        toUserId: toUserId.trim() ? toUserId.trim() : null,
        amountPaisa: paisa,
        date: new Date().toISOString(),
        paymentMethod: 'CASH',
        note: settleNote.trim(),
        status: 'COMPLETED',
        clientUuid,
      };

      await LocalDbService.saveSettlement(item, 0);
      await LocalDbService.enqueueSync(clientUuid, 'CREATE', 'SETTLEMENT', item);

      try {
        await ApiClient.recordSettlement({
          toUserId: item.toUserId,
          amountPaisa: item.amountPaisa,
          paymentMethod: item.paymentMethod,
          note: item.note,
          clientUuid,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({
        type: 'success',
        message: `${MoneyUtil.formatBengaliCurrency(paisa)} সেটেলমেন্ট সফলভাবে সংরক্ষিত হয়েছে।`,
      });

      setModalVisible(false);
      setSettleTaka('');
      setSettleNote('');
      setToUserId('');
      setToUserName('');
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'সেটেলমেন্ট সম্পন্ন করা যায়নি।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMonth = async () => {
    const y = parseInt(closingYear, 10);
    const m = parseInt(closingMonth, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      showToast({ type: 'error', message: 'সঠিক সাল এবং মাস নির্বাচন করুন।' });
      return;
    }

    setIsClosingMonth(true);
    try {
      const res = await ApiClient.closeMonth(y, m);
      if (res.success) {
        showToast({
          type: 'success',
          message: 'মাসিক হিসাব সফলভাবে ক্লোজ করা হয়েছে ও ব্যালেন্স ক্যারি-ফরওয়ার্ড হয়েছে।',
        });
        setCloseMonthModal(false);
        await loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'হিসাব ক্লোজ করা যায়নি।' });
    } finally {
      setIsClosingMonth(false);
    }
  };

  const prefillSettlement = (fromId: string, toId: string, amountPaisa: number, toName: string) => {
    setToUserId(toId);
    setToUserName(toName);
    setSettleTaka(MoneyUtil.paisaToTaka(amountPaisa).toString());
    setSettleNote(`হিসাব নিষ্পত্তিকরণ (${toName})`);
    setModalVisible(true);
  };

  const shareSummary = async () => {
    if (!overview) return;
    const lines = [
      `📊 *পারিবারিক হিসাব ও সেটেলমেন্ট রিপোর্ট*`,
      `📅 তারিখ: ${new Date().toLocaleDateString('bn-BD')}`,
      `💰 বর্তমান ফান্ড ব্যালেন্স: ${MoneyUtil.formatBengaliCurrency(overview.currentFundBalancePaisa)}`,
      `📉 মোট ব্যয়: ${MoneyUtil.formatBengaliCurrency(overview.totalApprovedExpensesPaisa)}`,
      `📈 মোট চাঁদা: ${MoneyUtil.formatBengaliCurrency(overview.totalFundContributionsPaisa)}`,
      '',
      `👥 *সদস্যদের ব্যালেন্স স্থিতি:*`,
      ...overview.memberBalances.map((m) => {
        const status = m.netBalancePaisa >= 0 ? 'পাবে (+)' : 'দিবে (-)';
        return `• ${m.userName}: ${MoneyUtil.formatBengaliCurrency(Math.abs(m.netBalancePaisa))} (${status})`;
      }),
    ];

    if (overview.recommendedSettlements && overview.recommendedSettlements.length > 0) {
      lines.push('', `🤝 *ঋণ নিষ্পত্তির প্রস্তাবনা:*`);
      for (const s of overview.recommendedSettlements) {
        const fromName = overview.memberBalances.find((m) => m.userId === s.fromUserId)?.userName || 'সদস্য';
        const toName = overview.memberBalances.find((m) => m.userId === s.toUserId)?.userName || 'সদস্য';
        lines.push(`• ${fromName} ➔ ${toName}: ${MoneyUtil.formatBengaliCurrency(s.amountPaisa)}`);
      }
    }

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="হিসাব ও সেটেলমেন্ট"
        subtitle="সদস্যদের পারস্পরিক ব্যালেন্স ও দেনা-পাওনা নিষ্পত্তি"
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
            <CardSkeleton />
            <TransactionSkeleton />
          </View>
        ) : (
          <>
            {/* Fund Balance Hero */}
            <FinancialSummaryCard
              title="পরিবারের মোট ফান্ড ব্যালেন্স"
              amountPaisa={overview?.currentFundBalancePaisa || 0}
              subtitle="কমন রিজার্ভ ক্যাশ স্থিতি"
              icon="wallet"
              variant="hero"
            />

            <View style={styles.gridRow}>
              <FinancialSummaryCard
                title="মোট জমা ফান্ড"
                amountPaisa={overview?.totalFundContributionsPaisa || 0}
                subtitle="চাঁদা থেকে সংগৃহীত"
                icon="arrow-down-circle"
                variant="income"
                style={{ flex: 1, marginRight: 6 }}
              />
              <FinancialSummaryCard
                title="অনুমোদিত মোট ব্যয়"
                amountPaisa={overview?.totalApprovedExpensesPaisa || 0}
                subtitle="পারিবারিক খরচের যোগফল"
                icon="arrow-up-circle"
                variant="expense"
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            {/* Quick Access: Comprehensive Real-Life Family Statement */}
            <TouchableOpacity
              style={[
                styles.familyStatementBanner,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => router.push('/family-statement')}
              activeOpacity={0.7}
            >
              <View style={[styles.bannerIconWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <BengaliText variant="bodyBold" color={colors.primary}>
                  বাস্তব পারিবারিক পূর্ণাঙ্গ বিবরণী
                </BengaliText>
                <BengaliText variant="caption" color={colors.textMuted}>
                  সদস্যভিত্তিক আয়, অনুদান, পকেট ব্যয় ও স্পনসরড ছাড়
                </BengaliText>
              </View>
              <Ionicons name="chevron-forward-circle" size={22} color={colors.primary} />
            </TouchableOpacity>

            {/* Quick Share & Record Actions */}
            <View style={styles.actionRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <SecondaryButton
                  title="রিপোর্ট শেয়ার করুন"
                  onPress={shareSummary}
                  icon="share-social-outline"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <PrimaryButton
                  title="সেটেলমেন্ট রেকর্ড"
                  onPress={() => setModalVisible(true)}
                  icon="checkmark-done"
                />
              </View>
            </View>

            {/* Recommended Minimal Debt Settlements (Greedy Algorithm Output) */}
            {overview?.recommendedSettlements && overview.recommendedSettlements.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="ন্যূনতম ঋণ নিষ্পত্তিকরণ (Zero-Drift)"
                  subtitle="অ্যালগরিদম অনুযায়ী সরাসরি লেনদেনের প্রস্তাবনা"
                  count={overview.recommendedSettlements.length}
                />

                {overview.recommendedSettlements.map((tx, idx) => {
                  const fromName =
                    overview.memberBalances.find((m) => m.userId === tx.fromUserId)?.userName || 'সদস্য';
                  const toName =
                    overview.memberBalances.find((m) => m.userId === tx.toUserId)?.userName || 'সদস্য';
                  const isMyDebt = tx.fromUserId === user?.id;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.settlementItemCard,
                        {
                          backgroundColor: isDark ? colors.surface : colors.surface,
                          borderColor: isMyDebt ? colors.warning : isDark ? colors.borderStrong : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.settleFlowRow}>
                        <View style={styles.partyBox}>
                          <ProfileAvatar name={fromName} size="sm" />
                          <BengaliText variant="caption" color={colors.text} weight="700" style={{ marginTop: 4 }}>
                            {fromName}
                          </BengaliText>
                        </View>

                        <View style={styles.arrowContainer}>
                          <BengaliText variant="caption" color={colors.accent} weight="800">
                            {MoneyUtil.formatBengaliCurrency(tx.amountPaisa)}
                          </BengaliText>
                          <Ionicons name="arrow-forward" size={18} color={colors.accent} />
                        </View>

                        <View style={styles.partyBox}>
                          <ProfileAvatar name={toName} size="sm" />
                          <BengaliText variant="caption" color={colors.text} weight="700" style={{ marginTop: 4 }}>
                            {toName}
                          </BengaliText>
                        </View>
                      </View>

                      {/* Prefill button */}
                      <TouchableOpacity
                        onPress={() => prefillSettlement(tx.fromUserId, tx.toUserId, tx.amountPaisa, toName)}
                        style={[styles.prefillBtn, { backgroundColor: colors.accentLight }]}
                      >
                        <Ionicons name="flash" size={13} color={colors.accent} style={{ marginRight: 4 }} />
                        <BengaliText variant="caption" color={colors.accent} weight="700" numberOfLines={1}>
                          ১-ট্যাপে সেটেলমেন্ট রেকর্ড করুন
                        </BengaliText>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Member-Wise Balance List */}
            <View style={styles.section}>
              <SectionHeader
                title="সদস্যদের ব্যালেন্স স্থিতি"
                subtitle="কার কত টাকা পাওনা বা দেনা রয়েছে"
                count={overview?.memberBalances?.length || 0}
              />

              {overview?.memberBalances?.map((member) => {
                const isReceivable = member.netBalancePaisa >= 0;
                const isMe = member.userId === user?.id;

                return (
                  <View
                    key={member.userId}
                    style={[
                      styles.memberCard,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surface,
                        borderColor: isMe ? colors.primary : isDark ? colors.borderStrong : colors.border,
                        borderLeftColor: isReceivable ? colors.accent : colors.danger,
                      },
                    ]}
                  >
                    <View style={styles.memberTop}>
                      <View style={styles.memberInfoRow}>
                        <ProfileAvatar name={member.userName} size="md" />
                        <View style={{ marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <BengaliText variant="bodyBold" color={colors.text}>
                              {member.userName}
                            </BengaliText>
                            {isMe && (
                              <View style={[styles.meBadge, { backgroundColor: colors.primaryLight }]}>
                                <BengaliText variant="caption" color={colors.primary} weight="700" style={{ fontSize: 9.5 }}>
                                  আপনি
                                </BengaliText>
                              </View>
                            )}
                          </View>
                          <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                            জমা চাঁদা: {MoneyUtil.formatBengaliCurrency(member.totalContributedPaisa)}
                          </BengaliText>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <BengaliText
                          variant="h3"
                          color={isReceivable ? colors.accent : colors.danger}
                          weight="800"
                        >
                          {isReceivable ? '+' : ''}
                          {MoneyUtil.formatBengaliCurrency(member.netBalancePaisa)}
                        </BengaliText>
                        <BengaliText
                          variant="caption"
                          color={isReceivable ? colors.accent : colors.danger}
                          weight="700"
                          style={{ marginTop: 2 }}
                        >
                          {isReceivable ? 'পাবেন (Receivable)' : 'দিবেন (Payable)'}
                        </BengaliText>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.memberDetailsRow,
                        {
                          borderTopColor: isDark ? colors.borderLight : colors.borderLight,
                        },
                      ]}
                    >
                      <View style={styles.memberStatCol}>
                        <BengaliText variant="caption" color={colors.textMuted}>
                          নিজস্ব পকেট থেকে পরিশোধ
                        </BengaliText>
                        <BengaliText variant="caption" color={colors.text} weight="700">
                          {MoneyUtil.formatBengaliCurrency(member.totalPaidPaisa)}
                        </BengaliText>
                      </View>

                      <View style={styles.memberStatCol}>
                        <BengaliText variant="caption" color={colors.textMuted}>
                          খরচের বরাদ্দকৃত ভাগ
                        </BengaliText>
                        <BengaliText variant="caption" color={colors.text} weight="700">
                          {MoneyUtil.formatBengaliCurrency(member.totalOwedPaisa)}
                        </BengaliText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Monthly Accounting Period Closing (Admin Only) */}
            {isAdmin && (
              <View
                style={[
                  styles.closeMonthSectionCard,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surface,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <View style={styles.closeMonthHeader}>
                  <View style={styles.lockIconCircle}>
                    <Ionicons name="calendar" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <BengaliText variant="h3" color={colors.text} weight="700">
                      মাসিক হিসাব বন্ধ ও ক্যারি-ফরওয়ার্ড
                    </BengaliText>
                    <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      মাস ক্লোজ করলে অবশিষ্ট ফান্ড ব্যালেন্স পরবর্তী মাসের ওপেনিং ব্যালেন্স হিসেবে স্থানান্তরিত হবে।
                    </BengaliText>
                  </View>
                </View>

                <PrimaryButton
                  title="মাসিক হিসাব ক্লোজ করুন"
                  onPress={() => setCloseMonthModal(true)}
                  icon="lock-closed-outline"
                  variant="dark"
                  style={{ marginTop: 12 }}
                />

                {closedMonths.length > 0 && (
                  <View style={styles.closedList}>
                    <BengaliText variant="caption" color={colors.textMuted} weight="700" style={{ marginBottom: 6 }}>
                      ইতিমধ্যে বন্ধকৃত মাসসমূহ ({MoneyUtil.toBengaliNumber(closedMonths.length)} টি):
                    </BengaliText>
                    <View style={styles.closedPillsRow}>
                      {closedMonths.map((cm, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.closedPill,
                            {
                              backgroundColor: isDark ? '#374151' : '#F1F5F9',
                              borderColor: isDark ? '#6B7280' : '#CBD5E1',
                            },
                          ]}
                        >
                          <Ionicons name="lock-closed" size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                          <BengaliText variant="caption" color={colors.textSecondary} weight="700">
                            {getBengaliMonthLabel(cm.year, cm.month)}
                          </BengaliText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Settlement History */}
            <View style={styles.section}>
              <SectionHeader
                title="নিষ্পন্ন সেটেলমেন্টের ইতিহাস"
                count={settlements.length}
              />

              {settlements.length === 0 ? (
                <EmptyState
                  icon="checkmark-done-circle-outline"
                  title="কোনো সেটেলমেন্ট রেকর্ড নেই"
                  description="এখনও কোনো পারস্পরিক ঋণ নিষ্পত্তি এন্ট্রি করা হয়নি।"
                  actionTitle="সেটেলমেন্ট রেকর্ড করুন"
                  onActionPress={() => setModalVisible(true)}
                />
              ) : (
                settlements.map((item) => (
                  <View
                    key={item._id || item.clientUuid}
                    style={[
                      styles.settleHistoryCard,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surface,
                        borderColor: isDark ? colors.borderStrong : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <BengaliText variant="bodyBold" color={colors.text}>
                        {item.note || 'হিসাব নিষ্পত্তি'}
                      </BengaliText>
                      <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                        তারিখ: {MoneyUtil.toBengaliNumber(item.date.split('T')[0])} • মাধ্যম: {item.paymentMethod}
                      </BengaliText>
                    </View>

                    <BengaliText variant="h3" color={colors.accent} weight="700">
                      {MoneyUtil.formatBengaliCurrency(item.amountPaisa)}
                    </BengaliText>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Record Settlement Modal */}
      <BottomSheet
        visible={modalVisible}
        title="সেটেলমেন্ট রেকর্ড করুন"
        subtitle={toUserName ? `${toUserName}-কে টাকা পরিশোধ` : 'সদস্যদের মধ্যে দেনা-পাওনা নিষ্পত্তি'}
        onClose={() => setModalVisible(false)}
      >
        <AmountInput
          label="পরিশোধিত টাকার পরিমাণ"
          value={settleTaka}
          onChangeTaka={setSettleTaka}
          required
        />

        <TextInput
          label="মন্তব্য বা রেফারেন্স"
          placeholder="যেমন: নগদ পরিশোধ, বিকাশ ট্রান্সফার..."
          value={settleNote}
          onChangeText={setSettleNote}
        />

        <PrimaryButton
          title="সেটেলমেন্ট সংরক্ষণ করুন"
          onPress={handleRecordSettlement}
          loading={isSubmitting}
          icon="checkmark-circle-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Close Month Modal */}
      <BottomSheet
        visible={closeMonthModal}
        title="মাসিক হিসাব ক্লোজ করুন"
        subtitle="নির্বাচিত মাসের হিসাব সমাপ্ত করে ফান্ড ক্যারি-ফরওয়ার্ড করুন"
        onClose={() => setCloseMonthModal(false)}
      >
        <TextInput
          label="সাল (Year)"
          value={closingYear}
          onChangeText={setClosingYear}
          keyboardType="numeric"
          required
        />

        <TextInput
          label="মাস (১-১২)"
          value={closingMonth}
          onChangeText={setClosingMonth}
          keyboardType="numeric"
          required
          helperText="উদাহরণস্বরূপ: চলতি মাসের জন্য 11 লিখুন।"
        />

        <View
          style={[
            styles.warningCallout,
            {
              backgroundColor: isDark ? '#422006' : '#FEF3C7',
              borderColor: isDark ? '#D97706' : '#FDE68A',
            },
          ]}
        >
          <Ionicons name="warning" size={18} color="#D97706" style={{ marginRight: 8 }} />
          <BengaliText variant="caption" color={isDark ? '#FDE68A' : '#92400E'} style={{ flex: 1, lineHeight: 18 }}>
            সতর্কতা: একবার মাস ক্লোজ করা হলে সেই মাসের কোনো খরচ, আয় বা চাঁদা পরিবর্তন বা ডিলিট করা যাবে না।
          </BengaliText>
        </View>

        <PrimaryButton
          title="হিসাব সমাপ্ত ও ক্লোজ করুন"
          onPress={handleCloseMonth}
          loading={isClosingMonth}
          variant="danger"
          icon="lock-closed-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  section: {
    marginTop: 6,
  },
  settlementItemCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  settleFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partyBox: {
    alignItems: 'center',
    flex: 1,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  prefillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  memberCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  memberDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  memberStatCol: {
    flex: 1,
  },
  closeMonthSectionCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  closeMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 41, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  closedList: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  closedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  settleHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 8,
  },
  warningCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 10,
  },
  familyStatementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
  },
  bannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
