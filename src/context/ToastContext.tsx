import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../components/BengaliText';
import { useTheme } from '../theme/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useTheme();
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (options: ToastOptions | string, fallbackType: ToastType = 'info') => {
      const parsedOptions: ToastOptions =
        typeof options === 'string'
          ? { message: options, type: fallbackType, duration: 3200 }
          : { duration: 3200, ...options };

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast(parsedOptions);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, parsedOptions.duration || 3200);
    },
    [translateY, opacity, hideToast]
  );

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: isDark ? '#064E3B' : '#ECFDF5',
          border: isDark ? '#059669' : '#A7F3D0',
          text: isDark ? '#A7F3D0' : '#065F46',
          icon: isDark ? '#34D399' : '#059669',
          iconName: 'checkmark-circle' as const,
        };
      case 'error':
        return {
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
          border: isDark ? '#DC2626' : '#FECACA',
          text: isDark ? '#FECACA' : '#991B1B',
          icon: isDark ? '#F87171' : '#DC2626',
          iconName: 'alert-circle' as const,
        };
      case 'warning':
        return {
          bg: isDark ? '#78350F' : '#FFFBEB',
          border: isDark ? '#D97706' : '#FDE68A',
          text: isDark ? '#FDE68A' : '#92400E',
          icon: isDark ? '#FBBF24' : '#D97706',
          iconName: 'warning' as const,
        };
      case 'info':
      default:
        return {
          bg: isDark ? '#0C4A6E' : '#F0F9FF',
          border: isDark ? '#0284C7' : '#BAE6FD',
          text: isDark ? '#BAE6FD' : '#075985',
          icon: isDark ? '#38BDF8' : '#0284C7',
          iconName: 'information-circle' as const,
        };
    }
  };

  const toastStyle = toast ? getToastColors(toast.type) : null;
  const topPadding = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) + 12 : 52;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && toastStyle && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            {
              top: topPadding,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toastCard,
              {
                backgroundColor: toastStyle.bg,
                borderColor: toastStyle.border,
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={toastStyle.iconName} size={22} color={toastStyle.icon} />
            </View>
            <View style={styles.content}>
              <BengaliText
                variant="body"
                color={toastStyle.text}
                style={styles.messageText}
                numberOfLines={3}
              >
                {toast.message}
              </BengaliText>
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={toastStyle.text} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      hideToast: () => {},
    };
  }
  return context;
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  messageText: {
    fontWeight: '600',
    fontSize: 13.5,
    lineHeight: 19,
  },
  closeBtn: {
    marginLeft: 8,
    padding: 2,
  },
});
