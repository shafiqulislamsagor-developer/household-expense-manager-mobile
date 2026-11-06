import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch } from '../src/store';
import { setLocked, logout } from '../src/store/authSlice';
import { AuthStorage } from '../src/services/authStorage';
import { BengaliText } from '../src/components/BengaliText';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const androidBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0;
  const safeTop = Math.max(insets.top, androidBar, Platform.OS === 'ios' ? 44 : 20);
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 16);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handlePressDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const storedPin = await AuthStorage.getAppPin();
      if (newPin === storedPin) {
        dispatch(setLocked(false));
        showToast({ type: 'success', message: 'অ্যাপ আনলক সম্পন্ন হয়েছে।' });
        router.replace('/(tabs)');
      } else {
        setError(true);
        triggerShake();
        setTimeout(() => setPin(''), 550);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleLogout = async () => {
    await AuthStorage.clearTokens();
    dispatch(logout());
    router.replace('/login');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop + 20,
          paddingBottom: safeBottom + 20,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
              borderColor: colors.primary,
            },
          ]}
        >
          <Ionicons name="lock-closed" size={34} color={colors.primary} />
        </View>

        <BengaliText variant="h1" color={colors.text} align="center" weight="700">
          নিরাপত্তা পিন
        </BengaliText>

        <BengaliText
          variant="body"
          color={error ? colors.danger : colors.textMuted}
          align="center"
          style={styles.subtitle}
        >
          {error ? 'ভুল পিন কোড! পুনরায় চেষ্টা করুন।' : 'অ্যাপ আনলক করতে ৪ সংখ্যার পিন প্রদান করুন'}
        </BengaliText>
      </View>

      {/* PIN Dots with Shake Animation */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((idx) => {
          const filled = pin.length > idx;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: error
                    ? colors.danger
                    : filled
                    ? colors.primary
                    : isDark ? colors.surfaceSubdued : colors.border,
                  borderColor: error
                    ? colors.danger
                    : filled
                    ? colors.primary
                    : colors.borderStrong,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['biometric', '0', 'delete'],
        ].map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keypadRow}>
            {row.map((item) => {
              if (item === 'delete') {
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.keyButton}
                    onPress={handleDelete}
                    disabled={pin.length === 0}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={26}
                      color={pin.length > 0 ? colors.text : colors.textLight}
                    />
                  </TouchableOpacity>
                );
              }

              if (item === 'biometric') {
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.keyButton}
                    onPress={() => {
                      showToast({ type: 'info', message: 'বায়োমেট্রিক ফিঙ্গারপ্রিন্ট সেন্সরে স্পর্শ করুন।' });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="finger-print" size={28} color={colors.primary} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.keyButton,
                    styles.digitButton,
                    {
                      backgroundColor: isDark ? colors.surface : colors.surface,
                      borderColor: isDark ? colors.borderStrong : colors.border,
                    },
                  ]}
                  onPress={() => handlePressDigit(item)}
                  activeOpacity={0.7}
                >
                  <BengaliText
                    variant="h2"
                    color={colors.text}
                    align="center"
                    weight="700"
                    style={styles.digitText}
                  >
                    {MoneyUtil.toBengaliNumber(item)}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer logout shortcut */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleLogout} style={styles.switchAccountBtn}>
          <Ionicons name="log-out-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
          <BengaliText variant="caption" color={colors.danger} weight="700">
            ভিন্ন অ্যাকাউন্টে লগইন করুন
          </BengaliText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keyButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
  },
  digitButton: {
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  digitText: {
    fontSize: 22,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
