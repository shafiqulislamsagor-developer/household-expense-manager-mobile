import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { useTheme } from '../src/theme/ThemeContext';
import { ThemeMode } from '../src/theme/themeTypes';
import { MoneyUtil } from '../src/utils/money';

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();

  const THEME_OPTIONS: Array<{
    id: ThemeMode;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    badgeText: string;
  }> = [
    {
      id: 'light',
      title: 'লাইট মোড (Light Mode)',
      description: 'উজ্জ্বল এবং স্পষ্ট ফিনটেক থিম। দিনের আলোতে ব্যবহারের জন্য উপযোগী।',
      icon: 'sunny-outline',
      badgeText: 'সুপারিশকৃত',
    },
    {
      id: 'dark',
      title: 'ডার্ক মোড (Dark Mode)',
      description: 'চোখের জন্য আরামদায়ক মিডনাইট নেভি থিম। রাতে ও স্বল্প আলোতে ব্যবহারের জন্য উপযুক্ত।',
      icon: 'moon-outline',
      badgeText: 'আরামদায়ক',
    },
    {
      id: 'system',
      title: 'ডিভাইস ডিফল্ট (System Default)',
      description: 'আপনার মোবাইল সিস্টেমের থিম অনুযায়ী স্বয়ংক্রিয়ভাবে লাইট বা ডার্ক মোডে পরিবর্তিত হবে।',
      icon: 'phone-portrait-outline',
      badgeText: 'অটোমেটিক',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <Header
        title="অ্যাপিয়ারেন্স সেটিংস"
        subtitle="থিম, রঙ ও ডিসপ্লে নির্বাচন"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Interactive Theme Preview */}
        <BengaliText variant="caption" color={colors.textSecondary} weight="700" style={styles.sectionHeader}>
          লাইভ প্রিভিউ (THEME PREVIEW)
        </BengaliText>

        <View style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Mock Header Row */}
          <View style={styles.mockHeaderRow}>
            <View>
              <BengaliText variant="caption" color={colors.textMuted}>
                মোট ক্যাশ ও ব্যাংক
              </BengaliText>
              <BengaliText variant="h2" color={colors.primary} weight="800">
                {MoneyUtil.formatBengaliCurrency(4500000)}
              </BengaliText>
            </View>
            <View style={[styles.mockModeBadge, { backgroundColor: colors.secondaryLight, borderColor: colors.secondary }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={12} color={colors.secondary} style={{ marginRight: 4 }} />
              <BengaliText variant="caption" color={colors.secondary} weight="700">
                {isDark ? 'ডার্ক সক্রিয়' : 'লাইট সক্রিয়'}
              </BengaliText>
            </View>
          </View>

          {/* Mock Financial Metric Cards */}
          <View style={styles.mockMetricsRow}>
            <View style={[styles.mockMetricBox, { backgroundColor: isDark ? colors.surfaceElevated : '#F0FDF4', borderColor: colors.borderLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Ionicons name="arrow-down-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.success} weight="700">
                  চলতি আয়
                </BengaliText>
              </View>
              <BengaliText variant="bodyBold" color={colors.success}>
                {MoneyUtil.formatBengaliCurrency(6000000)}
              </BengaliText>
            </View>

            <View style={[styles.mockMetricBox, { backgroundColor: isDark ? colors.surfaceElevated : '#FEF2F2', borderColor: colors.borderLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Ionicons name="arrow-up-circle" size={14} color={colors.error} style={{ marginRight: 4 }} />
                <BengaliText variant="caption" color={colors.error} weight="700">
                  চলতি ব্যয়
                </BengaliText>
              </View>
              <BengaliText variant="bodyBold" color={colors.error}>
                {MoneyUtil.formatBengaliCurrency(1500000)}
              </BengaliText>
            </View>
          </View>

          {/* Mock Quick Action Pill */}
          <View style={[styles.mockActionRow, { borderTopColor: colors.divider }]}>
            <View style={[styles.mockActionBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="wallet-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <BengaliText variant="caption" color="#FFFFFF" weight="700">
                টাকা প্রদান
              </BengaliText>
            </View>

            <View style={[styles.mockActionBtn, { backgroundColor: colors.secondary }]}>
              <Ionicons name="cash-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <BengaliText variant="caption" color="#FFFFFF" weight="700">
                টাকা গ্রহণ
              </BengaliText>
            </View>
          </View>
        </View>

        {/* Section 2: Mode Selector */}
        <BengaliText variant="caption" color={colors.textSecondary} weight="700" style={styles.sectionHeader}>
          থিম মোড নির্বাচন করুন
        </BengaliText>

        <View style={styles.optionsList}>
          {THEME_OPTIONS.map((opt) => {
            const isSelected = themeMode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1.2,
                  },
                ]}
                onPress={() => setThemeMode(opt.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected
                          ? colors.primaryLight
                          : isDark
                          ? colors.surfaceSubdued
                          : colors.secondaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>

                  <View style={styles.optionTextContainer}>
                    <View style={styles.optionTitleRow}>
                      <BengaliText variant="bodyBold" color={colors.text}>
                        {opt.title}
                      </BengaliText>
                      {opt.badgeText && (
                        <View style={[styles.badge, { backgroundColor: isDark ? colors.surfaceSubdued : colors.primaryLight }]}>
                          <BengaliText variant="caption" color={colors.primary} weight="700" style={{ fontSize: 10 }}>
                            {opt.badgeText}
                          </BengaliText>
                        </View>
                      )}
                    </View>
                    <BengaliText variant="caption" color={colors.textMuted} style={styles.optionDesc}>
                      {opt.description}
                    </BengaliText>
                  </View>
                </View>

                {/* Radio Circle */}
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.borderStrong,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Information Callout */}
        <View style={[styles.infoCallout, { backgroundColor: isDark ? '#1E293B' : '#EBF3FA', borderColor: colors.borderLight }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
          <BengaliText variant="caption" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
            আপনার থিম পছন্দটি ডিভাইসের মেমোরিতে নিরাপদে সংরক্ষিত হয়। অ্যাপ রিস্টার্ট করলেও এটি স্বয়ংক্রিয়ভাবে বহাল থাকবে।
          </BengaliText>
        </View>
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
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  previewContainer: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  mockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mockModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  mockMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  mockMetricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  mockActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  mockActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionDesc: {
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
});
