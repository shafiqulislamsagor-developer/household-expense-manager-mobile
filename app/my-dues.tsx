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

export default function MyDuesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myDueInfo, setMyDueInfo] = useState<MemberDueDetail | null>(null);
  const [myContributions, setMyContributions] = useState<any[]>([]);

  // Payment Submission Modal
  const [payModal, setPayModal] = useState(false);
  const [payAmountTaka, setPayAmountTaka] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK'>('BKASH');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [duesRes, contribRes] = await Promise.all([
        ApiClient.getMemberDues(),
        ApiClient.listContributions(),
      ]);

      if (duesRes?.success && Array.isArray(duesRes.data) && user?.id) {
        const found = duesRes.data.find((d: MemberDueDetail) => d.userId === user.id);
        if (found) {
          setMyDueInfo(found);
          if (found.netDuePaisa > 0) {
            setPayAmountTaka((found.netDuePaisa / 100).toString());
          }
        }
      }

      if (contribRes?.success && Array.isArray(contribRes.data) && user?.id) {
        const myItems = contribRes.data.filter((c: any) => c.userId?._id === user.id || c.userId === user.id);
        setMyContributions(myItems);
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'বকেয়ার তথ্য পাওয়া যায়নি।' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePaySubmit = async () => {
    const num = parseFloat(payAmountTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.recordContribution({
        amountPaisa: MoneyUtil.takaToPaisa(num),
        paymentMethod,
        reference: payRef.trim(),
        note: payNote.trim(),
        status: 'PENDING',
      });

      if (res?.success) {
        showToast({
          type: 'success',
          message: `৳${num} পরিশোধের তথ্য সফলভাবে জমা হয়েছে! অ্যাডমিন অনুমোদনের পর ব্যালেন্স আপডেট হবে।`,
        });
        setPayModal(false);
        setPayRef('');
        setPayNote('');
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'জমা দেওয়া যায়নি।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDue = (myDueInfo?.netDuePaisa || 0) > 0;
  const isCredit = (myDueInfo?.netDuePaisa || 0) < 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="আমার মাসিক চাঁদা ও বকেয়া"
        subtitle="আপনার অংশের বরাদ্দকৃত খরচ ও পরিশোধের স্থিতি"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HERO STATUS CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDue
                ? isDark ? '#3B1515' : '#FEF2F2'
                : isCredit
                ? isDark ? '#1E3A5F' : '#E0F2FE'
                : isDark ? '#064E3B' : '#ECFDF5',
              borderColor: isDue
                ? colors.danger
                : isCredit ? colors.primary : colors.accent,
            },
          ]}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <BengaliText
                variant="caption"
                color={isDue ? colors.danger : isCredit ? colors.primary : colors.accent}
                weight="700"
              >
                {isDue
                  ? 'এই মাসে আপনার বকেয়া চাঁদা রয়েছে'
                  : isCredit
                  ? 'আপনার অ্যাকাউন্টে অগ্রিম ক্রেডিট জমা আছে'
                  : 'এই মাসের সকল চাঁদা সম্পূর্ণ পরিশোধিত!'}
              </BengaliText>

              <BengaliText
                variant="display"
                color={isDue ? colors.danger : isCredit ? colors.primary : colors.accent}
                weight="800"
                style={{ marginVertical: 6 }}
              >
                {isCredit
                  ? MoneyUtil.formatBengaliCurrency(myDueInfo?.creditBalancePaisa || 0)
                  : MoneyUtil.formatBengaliCurrency(myDueInfo?.netDuePaisa || 0)}
              </BengaliText>

              <BengaliText variant="caption" color={colors.textSecondary}>
                বরাদ্দকৃত খরচ: {MoneyUtil.formatBengaliCurrency(myDueInfo?.assignedExpenseSharesPaisa || 0)} • পরিশোধিত: {MoneyUtil.formatBengaliCurrency(myDueInfo?.confirmedPaymentsPaisa || 0)}
              </BengaliText>
            </View>

            <View
              style={[
                styles.heroIconCircle,
                {
                  backgroundColor: isDue
                    ? colors.danger
                    : isCredit ? colors.primary : colors.accent,
                },
              ]}
            >
              <Ionicons
                name={isDue ? 'alert-circle' : isCredit ? 'wallet' : 'checkmark-circle'}
                size={28}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Pay Button */}
          {isDue && (
            <TouchableOpacity
              style={[styles.payActionBtn, { backgroundColor: colors.danger }]}
              onPress={() => setPayModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <BengaliText variant="bodyBold" color="#FFFFFF">
                এখনই চাঁদা পরিশোধ করুন
              </BengaliText>
            </TouchableOpacity>
          )}
        </View>

        {/* CALCULATION DETAILS */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.borderStrong : colors.border },
          ]}
        >
          <BengaliText variant="bodyBold" color={colors.text} style={{ marginBottom: 12 }}>
            হিসাবের বিস্তারিত বিবরণ
          </BengaliText>

          <View style={styles.detailRow}>
            <BengaliText variant="caption" color={colors.textMuted}>
              পূর্বের মাসের বকেয়া:
            </BengaliText>
            <BengaliText variant="caption" color={colors.text} weight="700">
              {MoneyUtil.formatBengaliCurrency(myDueInfo?.openingDuePaisa || 0)}
            </BengaliText>
          </View>

          <View style={styles.detailRow}>
            <BengaliText variant="caption" color={colors.textMuted}>
              চলতি মাসের ব্যয়ের ভাগ:
            </BengaliText>
            <BengaliText variant="caption" color={colors.text} weight="700">
              + {MoneyUtil.formatBengaliCurrency(myDueInfo?.assignedExpenseSharesPaisa || 0)}
            </BengaliText>
          </View>

          <View style={styles.detailRow}>
            <BengaliText variant="caption" color={colors.textMuted}>
              নিশ্চিত পরিশোধিত চাঁদা:
            </BengaliText>
            <BengaliText variant="caption" color={colors.success} weight="700">
              - {MoneyUtil.formatBengaliCurrency(myDueInfo?.confirmedPaymentsPaisa || 0)}
            </BengaliText>
          </View>

          {(myDueInfo?.validCreditsPaisa || 0) > 0 && (
            <View style={styles.detailRow}>
              <BengaliText variant="caption" color={colors.textMuted}>
                ব্যক্তিগত পকেট থেকে ব্যয় / ক্রেডিট:
              </BengaliText>
              <BengaliText variant="caption" color={colors.primary} weight="700">
                - {MoneyUtil.formatBengaliCurrency(myDueInfo?.validCreditsPaisa || 0)}
              </BengaliText>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.detailRow}>
            <BengaliText variant="bodyBold" color={colors.text}>
              {isCredit ? 'মোট অগ্রিম ক্রেডিট:' : 'নিট অবশিষ্ট বকেয়া:'}
            </BengaliText>
            <BengaliText
              variant="bodyBold"
              color={isCredit ? colors.primary : isDue ? colors.danger : colors.accent}
              weight="800"
            >
              {isCredit
                ? MoneyUtil.formatBengaliCurrency(myDueInfo?.creditBalancePaisa || 0)
                : MoneyUtil.formatBengaliCurrency(myDueInfo?.netDuePaisa || 0)}
            </BengaliText>
          </View>
        </View>

        {/* PAYMENT HISTORY */}
        <SectionHeader
          title="আমার পরিশোধের ইতিহাস"
          subtitle="অনুমোদিত ও পেন্ডিং চাঁদার রেকর্ড"
          count={myContributions.length}
        />

        {myContributions.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="কোনো পরিশোধের রেকর্ড নেই"
            description="আপনি এই পরিবারে এখনো কোনো চাঁদা জমা দেননি।"
            actionTitle="চাঁদা পরিশোধ করুন"
            onActionPress={() => setPayModal(true)}
          />
        ) : (
          myContributions.map((c) => {
            const isVerified = c.status === 'VERIFIED';
            return (
              <View
                key={c._id || c.clientUuid}
                style={[
                  styles.contribCard,
                  { backgroundColor: colors.surface, borderColor: isDark ? colors.borderStrong : colors.border },
                ]}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    {c.paymentMethod} {c.reference ? `• ${c.reference}` : ''}
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    {new Date(c.date).toLocaleDateString('bn-BD')} {c.note ? `• ${c.note}` : ''}
                  </BengaliText>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <BengaliText variant="bodyBold" color={isVerified ? colors.accent : colors.warning} weight="800">
                    {MoneyUtil.formatBengaliCurrency(c.amountPaisa)}
                  </BengaliText>
                  <View
                    style={[
                      styles.tinyBadge,
                      {
                        backgroundColor: isVerified
                          ? isDark ? '#064E3B' : '#ECFDF5'
                          : isDark ? '#362F1E' : '#FFFBEB',
                      },
                    ]}
                  >
                    <BengaliText
                      variant="caption"
                      color={isVerified ? colors.accent : colors.warning}
                      weight="700"
                      style={{ fontSize: 10 }}
                    >
                      {isVerified ? 'অনুমোদিত' : 'পেন্ডিং'}
                    </BengaliText>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* SUBMIT PAYMENT MODAL */}
      <BottomSheet
        visible={payModal}
        title="চাঁদা পরিশোধ করুন"
        subtitle="ফান্ডে আপনার চাঁদার টাকা পাঠান"
        onClose={() => setPayModal(false)}
      >
        <View style={{ gap: 12 }}>
          <AmountInput
            label="পরিশোধের পরিমাণ (৳)"
            value={payAmountTaka}
            onChangeTaka={setPayAmountTaka}
            placeholder="০.০০"
          />

          <BengaliText variant="caption" color={colors.textMuted}>
            পেমেন্টের মাধ্যম:
          </BengaliText>
          <View style={styles.methodRow}>
            {(['BKASH', 'NAGAD', 'BANK', 'CASH'] as const).map((m) => {
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
                    {m === 'BKASH' ? 'বিকাশ' : m === 'NAGAD' ? 'নগদ' : m === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label="ট্রানজেকশন আইডি (TrxID) / রেফারেন্স"
            value={payRef}
            onChangeText={setPayRef}
            placeholder="যেমন: 8N7A6B5C"
          />

          <TextInput
            label="মন্তব্য / নোট (ঐচ্ছিক)"
            value={payNote}
            onChangeText={setPayNote}
            placeholder="যেমন: নভেম্বর মাসের চাঁদা"
          />

          <PrimaryButton
            title="পরিশোধের তথ্য জমা দিন"
            onPress={handlePaySubmit}
            loading={isSubmitting}
            variant="primary"
            icon="send-outline"
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
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  contribCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tinyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
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
});
