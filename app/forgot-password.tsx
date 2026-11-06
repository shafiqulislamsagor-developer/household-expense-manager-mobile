import React from 'react';
import { View, StyleSheet, ScrollView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../src/components/BengaliText';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { useTheme } from '../src/theme/ThemeContext';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const androidBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0;
  const safeTop = Math.max(insets.top, androidBar, Platform.OS === 'ios' ? 44 : 20);
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 16);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop + 16,
          paddingBottom: safeBottom + 20,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderColor: isDark ? colors.borderStrong : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
              borderColor: colors.primary,
            },
          ]}
        >
          <Ionicons name="key-outline" size={36} color={colors.primary} />
        </View>

        <BengaliText variant="h1" color={colors.text} align="center" weight="700" style={styles.title}>
          পাসওয়ার্ড উদ্ধার নির্দেশিকা
        </BengaliText>

        <BengaliText variant="body" color={colors.textMuted} align="center" style={styles.desc}>
          পরিবারের আর্থিক তথ্যের সর্বোচ্চ নিরাপত্তার স্বার্থে এই অ্যাপে সরাসরি কোনো পাবলিক সেলফ-রিসেট লিংক রাখা হয়নি।
        </BengaliText>

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: isDark ? `${colors.primary}20` : colors.primaryLight,
              borderColor: `${colors.primary}30`,
            },
          ]}
        >
          <Ionicons name="information-circle" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <BengaliText variant="body" color={colors.text} style={{ flex: 1, fontSize: 13.5, lineHeight: 20 }}>
            আপনি যদি আপনার পাসওয়ার্ড ভুলে যান, তবে অনুগ্রহ করে আপনার পরিবারের অ্যাডমিন বা সুপার অ্যাডমিনের সাথে যোগাযোগ করুন। অ্যাডমিন তাঁর কন্ট্রোল প্যানেল থেকে আপনার পাসওয়ার্ড রিসেট করে দিতে পারবেন।
          </BengaliText>
        </View>

        <PrimaryButton
          title="লগইন স্ক্রিনে ফিরে যান"
          onPress={() => router.back()}
          icon="arrow-back"
          style={styles.backBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontSize: 20,
  },
  desc: {
    marginBottom: 20,
    lineHeight: 22,
    fontSize: 13.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  backBtn: {
    marginTop: 8,
  },
});
