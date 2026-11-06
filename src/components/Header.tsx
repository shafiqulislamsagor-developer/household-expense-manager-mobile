import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { BengaliText } from './BengaliText';
import { SyncEngine } from '../sync/syncEngine';
import { MoneyUtil } from '../utils/money';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSync?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showSync = true,
  showBack = false,
  onBackPress,
  onNotificationPress,
  unreadNotificationsCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const { status, pendingCount } = useSelector((state: RootState) => state.sync);
  const isOnline = status !== 'OFFLINE';

  const androidBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0;
  const safeTop = Math.max(insets.top, androidBar, Platform.OS === 'ios' ? 44 : 20);

  const handleSyncPress = () => {
    SyncEngine.syncNow().catch(() => {});
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'ব্যবহারকারী';
  const displayTitle = title || `স্বাগতম, ${displayName} 👋`;
  const displaySubtitle = subtitle || 'পারিবারিক খরচের হিসাব';

  const renderSyncWidget = () => {
    if (!showSync) return null;

    if (status === 'SYNCING') {
      return (
        <View style={[styles.syncPill, { backgroundColor: isDark ? '#78350F' : '#FEF3C7', borderColor: isDark ? '#D97706' : '#FDE68A' }]}>
          <ActivityIndicator size="small" color={isDark ? '#FDE68A' : '#D97706'} style={{ marginRight: 5 }} />
          <BengaliText variant="caption" color={isDark ? '#FDE68A' : '#92400E'} style={styles.syncText}>
            সিঙ্ক হচ্ছে
          </BengaliText>
        </View>
      );
    }

    if (!isOnline || pendingCount > 0 || status === 'ERROR') {
      return (
        <TouchableOpacity
          style={[
            styles.syncPill,
            {
              backgroundColor: isDark ? '#422006' : '#FEF3C7',
              borderColor: isDark ? '#D97706' : '#FDE68A',
            },
          ]}
          onPress={handleSyncPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={!isOnline ? 'cloud-offline' : 'reload'}
            size={13}
            color={isDark ? '#FDE68A' : '#D97706'}
            style={{ marginRight: 4 }}
          />
          <BengaliText variant="caption" color={isDark ? '#FDE68A' : '#92400E'} style={styles.syncText}>
            {pendingCount > 0 ? `${MoneyUtil.toBengaliNumber(pendingCount)} টি বাকি` : 'অফলাইন'}
          </BengaliText>
        </TouchableOpacity>
      );
    }

    // Fully synced & idle
    return (
      <View
        style={[
          styles.syncPill,
          {
            backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
            borderColor: isDark ? '#059669' : '#A7F3D0',
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={14} color={isDark ? '#34D399' : '#059669'} style={{ marginRight: 4 }} />
        <BengaliText variant="caption" color={isDark ? '#34D399' : '#047857'} style={styles.syncText}>
          সিঙ্কড
        </BengaliText>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeTop + 10,
          backgroundColor: isDark ? colors.background : colors.surface,
          borderBottomColor: isDark ? colors.borderStrong : colors.border,
        },
      ]}
    >
      {showBack && (
        <TouchableOpacity
          onPress={onBackPress}
          style={[
            styles.headerIconBtn,
            {
              marginRight: 10,
              backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
      )}

      <View style={styles.titleContainer}>
        <BengaliText
          variant="h2"
          color={colors.text}
          numberOfLines={1}
          weight="700"
          style={styles.headerTitle}
        >
          {displayTitle}
        </BengaliText>
        {displaySubtitle ? (
          <BengaliText
            variant="caption"
            color={colors.textMuted}
            style={styles.subtitle}
            numberOfLines={1}
          >
            {displaySubtitle}
          </BengaliText>
        ) : null}
      </View>

      <View style={styles.rightContainer}>
        {renderSyncWidget()}

        {/* Dark/Light mode toggle shortcut */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.headerIconBtn,
            {
              backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={18}
            color={isDark ? '#FBBF24' : colors.primary}
          />
        </TouchableOpacity>

        {onNotificationPress && (
          <TouchableOpacity
            onPress={onNotificationPress}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
              },
            ]}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
            {unreadNotificationsCount > 0 && (
              <View style={[styles.notifDot, { backgroundColor: colors.danger }]}>
                <BengaliText variant="caption" color="#FFFFFF" style={styles.notifDotText}>
                  {unreadNotificationsCount}
                </BengaliText>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 19,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifDotText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
