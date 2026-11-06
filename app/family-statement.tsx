import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { FinancialSummaryCard } from '../src/components/ui/FinancialSummaryCard';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ApiClient } from '../src/services/apiClient';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';

interface MemberStatement {
  userId: string;
  userName: string;
  relationship: string;
  incomeStatus: string;
  occupation?: string;
  financialResponsibility: string;
  totalIncomePaisa: number;
  totalFamilyContributionPaisa: number;
  totalExpensesPaidOutOfPocketPaisa: number;
  assignedExpenseSharePaisa: number;
  sponsoredAmountReceivedPaisa: number;
  sponsorshipGivenPaisa: number;
  amountAlreadyPaidPaisa: number;
  outstandingPayablePaisa: number;
  outstandingReceivablePaisa: number;
  remainingCustodyWalletBalancePaisa: number;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'CREDIT' | 'SPONSORED' | 'EXEMPT';
}

interface SettlementReport {
  householdId: string;
  month: string;
  totalIncomePaisa: number;
  totalContributionsPaisa: number;
  totalHouseholdExpensesPaisa: number;
  totalSponsoredExpensesPaisa: number;
  totalFundCashBalancePaisa: number;
  totalMemberCustodyWalletsPaisa: number;
  totalMemberPayablesPaisa: number;
  totalMemberReceivablesPaisa: number;
  memberStatements: MemberStatement[];
  suggestedSettlements: Array<{
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amountPaisa: number;
    reason: string;
  }>;
}

export default function FamilyStatementScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<SettlementReport | null>(null);

  // Month navigation
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getComprehensiveStatement(monthStr);
      if (res?.success && res.data) {
        setReport(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'বিবরণী লোড করা সম্ভব হয়নি', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthStr, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const getStatusBadge = (status: MemberStatement['status']) => {
    switch (status) {
      case 'PAID':
        return { label: 'পরিশোধিত', bg: '#10B98118', color: '#059669' };
      case 'SPONSORED':
        return { label: 'স্পনসরড', bg: '#8B5CF618', color: '#7C3AED' };
      case 'CREDIT':
        return { label: 'অগ্রিম জমা (ক্রেডিট)', bg: '#3B82F618', color: '#2563EB' };
      case 'EXEMPT':
        return { label: 'অব্যাহতিপ্রাপ্ত', bg: '#6B728018', color: '#4B5563' };
      case 'PARTIAL':
        return { label: 'আংশিক বকেয়া', bg: '#F59E0B18', color: '#D97706' };
      case 'UNPAID':
      case 'OVERDUE':
      default:
        return { label: 'বকেয়া অপরিশোধিত', bg: '#EF444418', color: '#DC2626' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="পারিবারিক আর্থিক বিবরণী"
        subtitle="মাসভিত্তিক পূর্ণাঙ্গ লেনদেন, দেনা-পাওনা ও সেটেলমেন্ট"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Month Selector Bar */}
        <View style={[styles.monthBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <BengaliText style={[styles.monthTitle, { color: colors.text }]}>
              {MoneyUtil.toBengaliNumber(year)} সালের {MoneyUtil.toBengaliNumber(month)} মাস
            </BengaliText>
            <BengaliText style={[styles.monthSubtitle, { color: colors.textMuted }]}>
              {monthStr}
            </BengaliText>
          </View>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Overview Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryGridItem}>
            <FinancialSummaryCard
              title="মোট পারিবারিক ব্যয়"
              amountPaisa={report?.totalHouseholdExpensesPaisa || 0}
              icon="cart-outline"
              variant="expense"
            />
          </View>
          <View style={styles.summaryGridItem}>
            <FinancialSummaryCard
              title="কাস্টডি ওয়ালেট ব্যালেন্স"
              amountPaisa={report?.totalMemberCustodyWalletsPaisa || 0}
              icon="wallet-outline"
              variant="balance"
            />
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryGridItem}>
            <FinancialSummaryCard
              title="ফান্ড ক্যাশ ব্যালেন্স"
              amountPaisa={report?.totalFundCashBalancePaisa || 0}
              icon="cash-outline"
              variant="income"
            />
          </View>
          <View style={styles.summaryGridItem}>
            <FinancialSummaryCard
              title="স্পনসরড ব্যয়সমূহ"
              amountPaisa={report?.totalSponsoredExpensesPaisa || 0}
              icon="shield-checkmark-outline"
              variant="default"
            />
          </View>
        </View>

        {/* Section: Suggested Settlements */}
        {report?.suggestedSettlements && report.suggestedSettlements.length > 0 && (
          <>
            <SectionHeader
              title="প্রস্তাবিত সেটেলমেন্ট (ঋণ নিষ্পত্তি)"
              count={report.suggestedSettlements.length}
            />
            {report.suggestedSettlements.map((s, idx) => (
              <View
                key={idx}
                style={[styles.settlementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.settlementRow}>
                  <View style={[styles.settlementIcon, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <BengaliText style={[styles.settlementTitle, { color: colors.text }]}>
                      {s.fromUserName} ➔ {s.toUserName}
                    </BengaliText>
                    <BengaliText style={[styles.settlementReason, { color: colors.textMuted }]}>
                      {s.reason}
                    </BengaliText>
                  </View>
                  <BengaliText style={[styles.settlementAmount, { color: colors.primary }]}>
                    {MoneyUtil.formatBengaliCurrency(s.amountPaisa)}
                  </BengaliText>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Section: Member-wise Comprehensive Statements */}
        <SectionHeader
          title="সদস্যভিত্তিক পূর্ণাঙ্গ আর্থিক বিবরণী"
          count={report?.memberStatements?.length || 0}
        />

        {!report?.memberStatements || report.memberStatements.length === 0 ? (
          <EmptyState
            title="কোনো বিবরণী পাওয়া যায়নি"
            description="এই মাসের জন্য এখনও কোনো ব্যয় বা লেনদেন রেকর্ড করা হয়নি।"
            icon="document-text-outline"
          />
        ) : (
          report.memberStatements.map((ms) => {
            const badge = getStatusBadge(ms.status);
            return (
              <View
                key={ms.userId}
                style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Header */}
                <View style={styles.memberCardHeader}>
                  <View>
                    <BengaliText style={[styles.memberName, { color: colors.text }]}>
                      {ms.userName}
                    </BengaliText>
                    <BengaliText style={[styles.memberSubtitle, { color: colors.textMuted }]}>
                      সম্পর্ক: {ms.relationship} • দায়িত্ব: {ms.financialResponsibility}
                    </BengaliText>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <BengaliText style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </BengaliText>
                  </View>
                </View>

                {/* Metrics Breakdown Table */}
                <View style={styles.metricsContainer}>
                  {ms.totalIncomePaisa > 0 && (
                    <View style={styles.metricRow}>
                      <BengaliText style={[styles.metricLabel, { color: colors.textMuted }]}>
                        ব্যক্তিগত আয়:
                      </BengaliText>
                      <BengaliText style={[styles.metricValue, { color: colors.text }]}>
                        {MoneyUtil.formatBengaliCurrency(ms.totalIncomePaisa)}
                      </BengaliText>
                    </View>
                  )}

                  {ms.totalFamilyContributionPaisa > 0 && (
                    <View style={styles.metricRow}>
                      <BengaliText style={[styles.metricLabel, { color: colors.textMuted }]}>
                        ফান্ডে অনুদান প্রদান:
                      </BengaliText>
                      <BengaliText style={[styles.metricValue, { color: '#059669' }]}>
                        {MoneyUtil.formatBengaliCurrency(ms.totalFamilyContributionPaisa)}
                      </BengaliText>
                    </View>
                  )}

                  {ms.totalExpensesPaidOutOfPocketPaisa > 0 && (
                    <View style={styles.metricRow}>
                      <BengaliText style={[styles.metricLabel, { color: colors.textMuted }]}>
                        পকেট থেকে পরিশোধিত পারিবারিক ব্যয়:
                      </BengaliText>
                      <BengaliText style={[styles.metricValue, { color: '#2563EB' }]}>
                        {MoneyUtil.formatBengaliCurrency(ms.totalExpensesPaidOutOfPocketPaisa)}
                      </BengaliText>
                    </View>
                  )}

                  <View style={styles.metricRow}>
                    <BengaliText style={[styles.metricLabel, { color: colors.textMuted }]}>
                      বরাদ্দকৃত ব্যয়ের অংশ (Assigned Share):
                    </BengaliText>
                    <BengaliText style={[styles.metricValue, { color: colors.text }]}>
                      {MoneyUtil.formatBengaliCurrency(ms.assignedExpenseSharePaisa)}
                    </BengaliText>
                  </View>

                  {ms.sponsoredAmountReceivedPaisa > 0 && (
                    <View style={styles.metricRow}>
                      <BengaliText style={[styles.metricLabel, { color: '#7C3AED' }]}>
                        স্পনসরড ছাড় (অন্যের দ্বারা পরিশোধিত):
                      </BengaliText>
                      <BengaliText style={[styles.metricValue, { color: '#7C3AED' }]}>
                        -{MoneyUtil.formatBengaliCurrency(ms.sponsoredAmountReceivedPaisa)}
                      </BengaliText>
                    </View>
                  )}

                  {ms.sponsorshipGivenPaisa > 0 && (
                    <View style={styles.metricRow}>
                      <BengaliText style={[styles.metricLabel, { color: '#D97706' }]}>
                        অন্যকে প্রদত্ত স্পনসরশিপ দায়:
                      </BengaliText>
                      <BengaliText style={[styles.metricValue, { color: '#D97706' }]}>
                        +{MoneyUtil.formatBengaliCurrency(ms.sponsorshipGivenPaisa)}
                      </BengaliText>
                    </View>
                  )}

                  {ms.remainingCustodyWalletBalancePaisa > 0 && (
                    <View style={styles.metricRow}>
                      <BengaliText style={[styles.metricLabel, { color: colors.primary }]}>
                        কাস্টডি ওয়ালেটে অবশিষ্ট জমা:
                      </BengaliText>
                      <BengaliText style={[styles.metricValue, { color: colors.primary, fontWeight: '700' }]}>
                        {MoneyUtil.formatBengaliCurrency(ms.remainingCustodyWalletBalancePaisa)}
                      </BengaliText>
                    </View>
                  )}

                  {/* Net Outcome */}
                  <View style={[styles.metricRow, styles.netRow]}>
                    <BengaliText style={[styles.netLabel, { color: colors.text }]}>
                      নিট ফলাফল (Net Balance):
                    </BengaliText>
                    <BengaliText
                      style={[
                        styles.netValue,
                        {
                          color:
                            ms.outstandingPayablePaisa > 0
                              ? '#DC2626'
                              : ms.outstandingReceivablePaisa > 0
                              ? '#059669'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {ms.outstandingPayablePaisa > 0
                        ? `বকেয়া দেনা: ${MoneyUtil.formatBengaliCurrency(ms.outstandingPayablePaisa)}`
                        : ms.outstandingReceivablePaisa > 0
                        ? `পাওনা/ক্রেডিট: ${MoneyUtil.formatBengaliCurrency(ms.outstandingReceivablePaisa)}`
                        : 'সম্পূর্ণ শূন্য (ক্লিয়ার)'}
                    </BengaliText>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  monthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryGridItem: {
    flex: 1,
  },
  settlementCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settlementReason: {
    fontSize: 11,
    marginTop: 2,
  },
  settlementAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsContainer: {
    gap: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  netRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  netValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
