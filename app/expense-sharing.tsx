import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../src/store';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { AmountInput } from '../src/components/ui/AmountInput';
import { TextInput } from '../src/components/ui/TextInput';
import { ApiClient } from '../src/services/apiClient';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';
import {
  FamilyFundingSource,
  FamilyExpenseSharingMethod,
} from '../src/types';

const STANDARD_CATEGORIES = [
  'বাসা ভাড়া',
  'বাজার খরচ',
  'খাবার খরচ',
  'বিদ্যুৎ বিল',
  'গ্যাস বিল',
  'পানির বিল',
  'ইন্টারনেট বিল',
  'চিকিৎসা খরচ',
  'যাতায়াত',
  'বাসা মেরামত',
  'অন্যান্য',
];

export default function ExpenseSharingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('বাজার খরচ');
  const [customCategory, setCustomCategory] = useState('');
  const [amountTaka, setAmountTaka] = useState('');
  const [description, setDescription] = useState('');

  // Funding Source
  const [fundingSource, setFundingSource] = useState<FamilyFundingSource>('HOUSEHOLD_FUND');
  const [paidByUserId, setPaidByUserId] = useState<string>('');

  // Sharing Method
  const [sharingMethod, setSharingMethod] = useState<FamilyExpenseSharingMethod>('EQUAL_SPLIT');

  // Members list & selection
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Split values per member
  const [percentageMap, setPercentageMap] = useState<Record<string, string>>({});
  const [customAmountMap, setCustomAmountMap] = useState<Record<string, string>>({});

  // Recurring bill toggle
  const [isRecurring, setIsRecurring] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await ApiClient.getHouseholdMembers();
        if (res?.success && Array.isArray(res.data)) {
          setMembers(res.data);
          const allIds = res.data.map((m: any) => m._id);
          setSelectedMemberIds(allIds);
          if (user?.id) setPaidByUserId(user.id);
        }
      } catch {}
    }
    loadMembers();
  }, [user]);

  const toggleMemberSelection = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length === 1) {
        showToast({ type: 'warning', message: 'অন্তত একজন সদস্য থাকতে হবে।' });
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((x) => x !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const totalAmountPaisa = MoneyUtil.takaToPaisa(parseFloat(amountTaka) || 0);

  // Live split calculations
  const calculateLiveShares = () => {
    if (totalAmountPaisa <= 0 || selectedMemberIds.length === 0) return [];

    if (sharingMethod === 'EQUAL_SPLIT') {
      return MoneyUtil.calculateEqualSplits(totalAmountPaisa, selectedMemberIds);
    }

    if (sharingMethod === 'PERCENTAGE_SPLIT') {
      const bpList = selectedMemberIds.map((uid) => {
        const pct = parseFloat(percentageMap[uid]) || 0;
        return { userId: uid, basisPoints: Math.round(pct * 100) };
      });
      const totalBp = bpList.reduce((sum, x) => sum + x.basisPoints, 0);
      if (totalBp !== 10000) return [];
      return MoneyUtil.calculatePercentageSplits(totalAmountPaisa, bpList);
    }

    if (sharingMethod === 'CUSTOM_AMOUNT_SPLIT') {
      return selectedMemberIds.map((uid) => {
        const t = parseFloat(customAmountMap[uid]) || 0;
        return { userId: uid, sharePaisa: MoneyUtil.takaToPaisa(t) };
      });
    }

    return [];
  };

  const liveSplits = calculateLiveShares();

  // Percentage sum check
  const currentTotalPercentage = selectedMemberIds.reduce(
    (sum, uid) => sum + (parseFloat(percentageMap[uid]) || 0),
    0
  );

  // Custom amounts sum check
  const currentTotalCustomTaka = selectedMemberIds.reduce(
    (sum, uid) => sum + (parseFloat(customAmountMap[uid]) || 0),
    0
  );

  const handleSubmit = async () => {
    const num = parseFloat(amountTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: 'error', message: 'সঠিক টাকার পরিমাণ দিন।' });
      return;
    }
    const finalTitle = title.trim() || category;
    if (!finalTitle) {
      showToast({ type: 'error', message: 'খরচের নাম লিখুন।' });
      return;
    }

    if (selectedMemberIds.length === 0) {
      showToast({ type: 'error', message: 'অন্তত একজন সদস্য নির্বাচন করুন।' });
      return;
    }

    // Percentage split validation
    let percentageBasisPoints: Record<string, number> | undefined;
    if (sharingMethod === 'PERCENTAGE_SPLIT') {
      if (Math.round(currentTotalPercentage) !== 100) {
        showToast({
          type: 'error',
          message: `শতকরা হারের যোগফল ১০০% হতে হবে (বর্তমান: ${currentTotalPercentage}%)`,
        });
        return;
      }
      percentageBasisPoints = {};
      selectedMemberIds.forEach((uid) => {
        const pct = parseFloat(percentageMap[uid]) || 0;
        percentageBasisPoints![uid] = Math.round(pct * 100);
      });
    }

    // Custom amount split validation
    let customAmountsPaisa: Record<string, number> | undefined;
    if (sharingMethod === 'CUSTOM_AMOUNT_SPLIT') {
      if (Math.abs(currentTotalCustomTaka - num) > 0.01) {
        showToast({
          type: 'error',
          message: `সদস্যদের টাকার যোগফল (${currentTotalCustomTaka} ৳) মোট ব্যয়ের (${num} ৳) সমান হতে হবে।`,
        });
        return;
      }
      customAmountsPaisa = {};
      selectedMemberIds.forEach((uid) => {
        const t = parseFloat(customAmountMap[uid]) || 0;
        customAmountsPaisa![uid] = MoneyUtil.takaToPaisa(t);
      });
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createFamilyFundExpense({
        title: finalTitle,
        categoryId: category === 'অন্যান্য' && customCategory ? customCategory : category,
        amountPaisa: MoneyUtil.takaToPaisa(num),
        fundingSource,
        paidByUserId: fundingSource === 'MEMBER_PERSONAL_ACCOUNT' ? paidByUserId : null,
        sharingMethod,
        eligibleMemberIds: selectedMemberIds,
        percentageBasisPoints,
        customAmountsPaisa,
        description: description.trim(),
        isRecurring,
        recurringPeriod: 'MONTHLY',
      });

      if (res?.success) {
        showToast({
          type: 'success',
          message: `'${finalTitle}' পারিবারিক খরচে সফলভাবে যুক্ত এবং সদস্যদের মধ্যে বণ্টিত হয়েছে!`,
        });
        router.back();
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'খরচ যুক্ত করা যায়নি।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="পারিবারিক খরচ বিভাজন"
        subtitle="খাতভিত্তিক ব্যয় ও সদস্যদের মধ্যে সুনির্দিষ্ট বণ্টন"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. TITLE & CATEGORY */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.borderStrong : colors.border },
          ]}
        >
          <BengaliText variant="bodyBold" color={colors.text} style={styles.cardTitle}>
            ১. ব্যয়ের তথ্য ও ক্যাটাগরি
          </BengaliText>

          <AmountInput
            label="মোট ব্যয়ের পরিমাণ (৳)"
            value={amountTaka}
            onChangeTaka={setAmountTaka}
            placeholder="০.০০"
          />

          <TextInput
            label="খরচের শিরোনাম / বিবরণ"
            value={title}
            onChangeText={setTitle}
            placeholder="যেমন: নভেম্বর মাসের বাসা ভাড়া"
            style={{ marginTop: 10 }}
          />

          <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 10, marginBottom: 6 }}>
            ক্যাটাগরি নির্বাচন করুন:
          </BengaliText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STANDARD_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSubdued,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <BengaliText variant="caption" color={isSelected ? '#FFFFFF' : colors.text} weight="700">
                    {cat}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {category === 'অন্যান্য' && (
            <TextInput
              label="কাস্টম ক্যাটাগরির নাম"
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="ক্যাটাগরির নাম লিখুন"
              style={{ marginTop: 10 }}
            />
          )}
        </View>

        {/* 2. PAYMENT SOURCE */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.borderStrong : colors.border },
          ]}
        >
          <BengaliText variant="bodyBold" color={colors.text} style={styles.cardTitle}>
            ২. পেমেন্টের উৎস (Payment Source)
          </BengaliText>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.sourceOption,
                {
                  backgroundColor: fundingSource === 'HOUSEHOLD_FUND' ? colors.primary : colors.surfaceSubdued,
                  borderColor: fundingSource === 'HOUSEHOLD_FUND' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFundingSource('HOUSEHOLD_FUND')}
            >
              <Ionicons
                name="wallet-outline"
                size={18}
                color={fundingSource === 'HOUSEHOLD_FUND' ? '#FFFFFF' : colors.text}
              />
              <BengaliText
                variant="caption"
                color={fundingSource === 'HOUSEHOLD_FUND' ? '#FFFFFF' : colors.text}
                weight="700"
                style={{ marginLeft: 6 }}
              >
                কমন ফান্ড থেকে
              </BengaliText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sourceOption,
                {
                  backgroundColor: fundingSource === 'MEMBER_PERSONAL_ACCOUNT' ? colors.primary : colors.surfaceSubdued,
                  borderColor: fundingSource === 'MEMBER_PERSONAL_ACCOUNT' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFundingSource('MEMBER_PERSONAL_ACCOUNT')}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={fundingSource === 'MEMBER_PERSONAL_ACCOUNT' ? '#FFFFFF' : colors.text}
              />
              <BengaliText
                variant="caption"
                color={fundingSource === 'MEMBER_PERSONAL_ACCOUNT' ? '#FFFFFF' : colors.text}
                weight="700"
                style={{ marginLeft: 6 }}
              >
                ব্যক্তিগত পকেট থেকে
              </BengaliText>
            </TouchableOpacity>
          </View>

          {fundingSource === 'MEMBER_PERSONAL_ACCOUNT' && (
            <View style={{ marginTop: 12 }}>
              <BengaliText variant="caption" color={colors.textMuted} style={{ marginBottom: 6 }}>
                কার পকেট থেকে ভেন্ডরকে পরিশোধ করা হয়েছে:
              </BengaliText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {members.map((m) => {
                  const isSelected = paidByUserId === m._id;
                  return (
                    <TouchableOpacity
                      key={m._id}
                      onPress={() => setPaidByUserId(m._id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.surfaceSubdued,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <BengaliText variant="caption" color={isSelected ? '#FFFFFF' : colors.text} weight="700">
                        {m.name}
                      </BengaliText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <BengaliText variant="caption" color={colors.accent} style={{ marginTop: 6, fontSize: 11 }}>
                * যিনি ব্যক্তিগত পকেট থেকে দিয়েছেন, তিনি এই ব্যয়ের সমপরিমাণ ক্রেডিট বা রিইমবার্সমেন্ট পাবেন।
              </BengaliText>
            </View>
          )}
        </View>

        {/* 3. EXPENSE SHARING METHOD */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.borderStrong : colors.border },
          ]}
        >
          <BengaliText variant="bodyBold" color={colors.text} style={styles.cardTitle}>
            ৩. খরচ বিভাজন পদ্ধতি (Sharing Method)
          </BengaliText>

          <View style={styles.toggleRow}>
            {[
              { key: 'EQUAL_SPLIT', label: 'সমান ভাগ' },
              { key: 'PERCENTAGE_SPLIT', label: 'শতকরা (%)' },
              { key: 'CUSTOM_AMOUNT_SPLIT', label: 'নির্দিষ্ট টাকা' },
            ].map((m) => {
              const isSelected = sharingMethod === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setSharingMethod(m.key as FamilyExpenseSharingMethod)}
                  style={[
                    styles.methodTab,
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
                    {m.label}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Eligible Members Selection */}
          <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 12, marginBottom: 6 }}>
            ব্যয়ের অংশীদার সদস্যবৃন্দ:
          </BengaliText>
          <View style={{ gap: 8 }}>
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m._id);
              return (
                <View
                  key={m._id}
                  style={[
                    styles.memberRowItem,
                    {
                      backgroundColor: isSelected ? (isDark ? '#1E293B' : '#F1F5F9') : colors.surfaceSubdued,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.memberCheckArea}
                    onPress={() => toggleMemberSelection(m._id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <BengaliText variant="bodyBold" color={colors.text} style={{ marginLeft: 8 }}>
                      {m.name}
                    </BengaliText>
                  </TouchableOpacity>

                  {/* Percentage Input */}
                  {sharingMethod === 'PERCENTAGE_SPLIT' && isSelected && (
                    <View style={styles.inputWrapInline}>
                      <TextInput
                        value={percentageMap[m._id] || ''}
                        onChangeText={(txt) => setPercentageMap({ ...percentageMap, [m._id]: txt })}
                        placeholder="%"
                        keyboardType="numeric"
                        style={styles.inlineInput}
                      />
                      <BengaliText variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                        %
                      </BengaliText>
                    </View>
                  )}

                  {/* Custom Amount Input */}
                  {sharingMethod === 'CUSTOM_AMOUNT_SPLIT' && isSelected && (
                    <View style={styles.inputWrapInline}>
                      <TextInput
                        value={customAmountMap[m._id] || ''}
                        onChangeText={(txt) => setCustomAmountMap({ ...customAmountMap, [m._id]: txt })}
                        placeholder="টাকা"
                        keyboardType="numeric"
                        style={styles.inlineInput}
                      />
                      <BengaliText variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
                        ৳
                      </BengaliText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Validation Helpers */}
          {sharingMethod === 'PERCENTAGE_SPLIT' && (
            <View style={styles.validationHelp}>
              <BengaliText
                variant="caption"
                color={Math.round(currentTotalPercentage) === 100 ? colors.success : colors.danger}
                weight="700"
              >
                মোট শতকরা হার: {currentTotalPercentage}% (প্রয়োজন: ১০০%)
              </BengaliText>
            </View>
          )}

          {sharingMethod === 'CUSTOM_AMOUNT_SPLIT' && (
            <View style={styles.validationHelp}>
              <BengaliText
                variant="caption"
                color={
                  Math.abs(currentTotalCustomTaka - (parseFloat(amountTaka) || 0)) < 0.01
                    ? colors.success
                    : colors.danger
                }
                weight="700"
              >
                সদস্যদের টাকার যোগফল: {currentTotalCustomTaka} ৳ (মোট বিল: {amountTaka || '০'} ৳)
              </BengaliText>
            </View>
          )}
        </View>

        {/* 4. LIVE CALCULATION PREVIEW */}
        {liveSplits.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? colors.surfaceSubdued : '#F0FDF4', borderColor: colors.accent },
            ]}
          >
            <BengaliText variant="bodyBold" color={colors.accent} style={{ marginBottom: 8 }}>
              বণ্টনের লাইভ প্রিভিউ (সঠিক পাইসা হিসাব):
            </BengaliText>
            {liveSplits.map((s: any) => {
              const mem = members.find((x) => x._id === s.userId);
              return (
                <View key={s.userId} style={styles.liveSplitRow}>
                  <BengaliText variant="caption" color={colors.text}>
                    {mem?.name || 'সদস্য'}
                  </BengaliText>
                  <BengaliText variant="bodyBold" color={colors.accent} weight="700">
                    {MoneyUtil.formatBengaliCurrency(s.sharePaisa)}
                  </BengaliText>
                </View>
              );
            })}
          </View>
        )}

        {/* 5. RECURRING TOGGLE */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}
        >
          <View style={{ flex: 1, marginRight: 10 }}>
            <BengaliText variant="bodyBold" color={colors.text}>
              প্রতি মাসে নিয়মিত বিল (Recurring)
            </BengaliText>
            <BengaliText variant="caption" color={colors.textMuted}>
              একই মাসে দুইবার এন্ট্রি রোধ করবে
            </BengaliText>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
          />
        </View>

        {/* SUBMIT BUTTON */}
        <PrimaryButton
          title="পারিবারিক খরচ চূড়ান্ত করুন"
          onPress={handleSubmit}
          loading={isSubmitting}
          variant="primary"
          icon="checkmark-circle-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
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
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14.5,
    marginBottom: 12,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  memberRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberCheckArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inputWrapInline: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  inlineInput: {
    flex: 1,
    height: 38,
  },
  validationHelp: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  liveSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
