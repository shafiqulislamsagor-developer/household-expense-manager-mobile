import NetInfo from '@react-native-community/netinfo';
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch } from '../src/store';
import { setAuth } from '../src/store/authSlice';
import { ApiClient } from '../src/services/apiClient';
import { AuthStorage } from '../src/services/authStorage';
import { SyncEngine } from '../src/sync/syncEngine';
import { BengaliText } from '../src/components/BengaliText';
import { TextInput } from '../src/components/ui/TextInput';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const androidBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0;
  const safeTop = Math.max(insets.top, androidBar, Platform.OS === 'ios' ? 44 : 20);
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 16);

  const [phone, setPhone] = useState('01711000000');
  const [password, setPassword] = useState('Super@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError('ফোন নম্বর এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }

    setIsLoading(true);
    setError(null);

    const trimmedPhone = phone.trim();

    try {
      const netState = await NetInfo.fetch();
      const isOnline = !!(netState.isConnected && netState.isInternetReachable !== false);

      if (!isOnline) {
        // Offline: Check 365-day offline session
        const offlineSession = await AuthStorage.getOfflineSession();
        if (offlineSession && offlineSession.phone === trimmedPhone) {
          await AuthStorage.setTokens(offlineSession.token);
          await AuthStorage.setUserInfo(offlineSession.user);

          dispatch(
            setAuth({
              user: offlineSession.user,
              token: offlineSession.token,
            })
          );

          showToast({
            type: 'success',
            message: `স্বাগতম, ${offlineSession.user.name}! অফলাইন মোডে প্রবেশ করেছেন।`,
          });

          if (offlineSession.user.role === 'SUPER_ADMIN') {
            router.replace('/super-admin');
          } else {
            router.replace('/(tabs)');
          }
          return;
        } else {
          const offlineMsg =
            'প্রথমবার লগইনের জন্য ইন্টারনেট সংযোগ প্রয়োজন। অনুগ্রহ করে ইন্টারনেট সংযোগ চালু করে চেষ্টা করুন।';
          setError(offlineMsg);
          showToast({ type: 'error', message: offlineMsg });
          return;
        }
      }

      const response = await ApiClient.login(trimmedPhone, password);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        await AuthStorage.setTokens(accessToken, refreshToken);
        await AuthStorage.setUserInfo(user);
        await AuthStorage.saveOfflineSession(user, accessToken);

        dispatch(
          setAuth({
            user,
            token: accessToken,
          })
        );

        showToast({
          type: 'success',
          message: `স্বাগতম, ${user.name}! লগইন সফল হয়েছে।`,
        });

        // Run sync in background
        SyncEngine.syncNow().catch(() => {});

        if (user.role === 'SUPER_ADMIN') {
          router.replace('/super-admin');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      // If network failed during login call, check for offline session fallback
      if (
        err.message?.includes('ইন্টারনেট') ||
        err.message?.includes('Network request failed') ||
        err.name === 'TypeError'
      ) {
        const offlineSession = await AuthStorage.getOfflineSession();
        if (offlineSession && offlineSession.phone === trimmedPhone) {
          await AuthStorage.setTokens(offlineSession.token);
          await AuthStorage.setUserInfo(offlineSession.user);

          dispatch(
            setAuth({
              user: offlineSession.user,
              token: offlineSession.token,
            })
          );

          showToast({
            type: 'success',
            message: `স্বাগতম, ${offlineSession.user.name}! অফলাইন মোডে প্রবেশ করেছেন।`,
          });

          if (offlineSession.user.role === 'SUPER_ADMIN') {
            router.replace('/super-admin');
          } else {
            router.replace('/(tabs)');
          }
          return;
        }

        const offlineMsg =
          'প্রথমবার লগইনের জন্য ইন্টারনেট সংযোগ প্রয়োজন। অনুগ্রহ করে ইন্টারনেট সংযোগ চালু করে চেষ্টা করুন।';
        setError(offlineMsg);
        showToast({ type: 'error', message: offlineMsg });
        return;
      }

      const errMsg = err.message || 'লগইন করতে ব্যর্থ হয়েছে। তথ্যের সঠিকতা যাচাই করুন।';
      setError(errMsg);
      showToast({ type: 'error', message: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Account Auto-Fill for instant pair-programming & QA evaluation
  const setDemoAccount = (role: 'SUPER' | 'ADMIN' | 'MEMBER') => {
    if (role === 'SUPER') {
      setPhone('01711000000');
      setPassword('Super@123');
    } else if (role === 'ADMIN') {
      setPhone('01711111111');
      setPassword('Admin@123');
    } else {
      setPhone('01711222222');
      setPassword('Member@123');
    }
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: safeTop + 16, paddingBottom: safeBottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Controls */}
        <View style={styles.topBar}>
          <View style={styles.brandBadge}>
            <Ionicons name="wallet" size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <BengaliText variant="caption" color={colors.accent} weight="700">
              ১০০% জিরো-পয়সা ড্রিফট
            </BengaliText>
          </View>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeToggle,
              {
                backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? '#FBBF24' : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Hero Brand Identity */}
        <View style={styles.brandHero}>
          <View
            style={[
              styles.logoIconCircle,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="home" size={36} color={colors.primary} />
          </View>

          <BengaliText
            variant="display"
            color={colors.text}
            align="center"
            weight="800"
            style={styles.appName}
          >
            পারিবারিক ব্যয় ও হিসাব
          </BengaliText>

          <BengaliText
            variant="body"
            color={colors.textMuted}
            align="center"
            style={styles.appTagline}
          >
            মেস ও যৌথ পরিবারের স্বচ্ছ আর্থিক ব্যবস্থাপনা
          </BengaliText>
        </View>

        {/* Main Login Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <BengaliText
            variant="h2"
            color={colors.text}
            weight="700"
            style={styles.formTitle}
          >
            অ্যাকাউন্টে প্রবেশ করুন
          </BengaliText>

          <TextInput
            label="ফোন নম্বর"
            placeholder="০১৭১১XXXXXX"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setError(null);
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            icon="call-outline"
            clearable
            required
          />

          <TextInput
            label="পাসওয়ার্ড"
            placeholder="আপনার পাসওয়ার্ড দিন"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
            icon="lock-closed-outline"
            required
            error={error}
          />

          <View style={styles.forgotRow}>
            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <BengaliText variant="caption" color={colors.primary} weight="700">
                পাসওয়ার্ড ভুলে গেছেন?
              </BengaliText>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title="লগইন করুন"
            onPress={handleLogin}
            loading={isLoading}
            icon="log-in-outline"
            size="lg"
            style={{ marginTop: 8 }}
          />

          {/* Quick Demo Credentials Switcher */}
          <View style={styles.demoSection}>
            <BengaliText
              variant="caption"
              color={colors.textLight}
              align="center"
              style={styles.demoLabel}
            >
              দ্রুত টেস্ট করতে রোল নির্বাচন করুন:
            </BengaliText>
            <View style={styles.demoRow}>
              <TouchableOpacity
                onPress={() => setDemoAccount('SUPER')}
                style={[
                  styles.demoChip,
                  {
                    backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <BengaliText variant="caption" color={colors.primary} weight="700">
                  👑 সুপার অ্যাডমিন
                </BengaliText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDemoAccount('ADMIN')}
                style={[
                  styles.demoChip,
                  {
                    backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <BengaliText variant="caption" color={colors.accent} weight="700">
                  ⭐ পরিবার প্রধান
                </BengaliText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDemoAccount('MEMBER')}
                style={[
                  styles.demoChip,
                  {
                    backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <BengaliText variant="caption" color={colors.textSecondary} weight="700">
                  👤 সাধারণ সদস্য
                </BengaliText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security & Offline Guarantee Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
          <BengaliText variant="caption" color={colors.textMuted} align="center">
            অফলাইন-ফার্স্ট এনক্রিপ্টেড ডাটাবেজ দ্বারা সুরক্ষিত
          </BengaliText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 13.5,
    maxWidth: 280,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    marginBottom: 18,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  demoLabel: {
    marginBottom: 10,
    fontSize: 11.5,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  demoChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
});
