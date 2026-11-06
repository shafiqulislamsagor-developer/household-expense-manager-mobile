import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { SyncEngine } from '../../sync/syncEngine';
import { useTheme } from '../../theme/ThemeContext';

export const OfflineBanner: React.FC = () => {
  const { isDark } = useTheme();
  const { status, pendingCount } = useSelector((state: RootState) => state.sync);
  const isOnline = status !== 'OFFLINE';

  if (isOnline && pendingCount === 0 && status !== 'SYNCING') {
    return null;
  }

  const handleSyncNow = () => {
    SyncEngine.syncNow().catch(() => {});
  };

  const isSyncing = status === 'SYNCING';
  const isOffline = !isOnline;

  const getBannerConfig = () => {
    if (isOffline) {
      return {
        bg: isDark ? '#422006' : '#FEF3C7',
        border: isDark ? '#D97706' : '#FDE68A',
        text: isDark ? '#FDE68A' : '#92400E',
        icon: 'cloud-offline-outline' as const,
        label: 'অফলাইন মোড',
        subtext: pendingCount > 0 ? `(${MoneyUtil.toBengaliNumber(pendingCount)} টি সিঙ্কের অপেক্ষায়)` : '(ইন্টারনেট নেই)',
      };
    }
    if (isSyncing) {
      return {
        bg: isDark ? '#0C4A6E' : '#E0F2FE',
        border: isDark ? '#0284C7' : '#BAE6FD',
        text: isDark ? '#BAE6FD' : '#0369A1',
        icon: 'sync-outline' as const,
        label: 'সিঙ্ক হচ্ছে...',
        subtext: pendingCount > 0 ? `${MoneyUtil.toBengaliNumber(pendingCount)} টি বাকি` : '',
      };
    }
    return {
      bg: isDark ? '#312E81' : '#EEF2FF',
      border: isDark ? '#6366F1' : '#C7D2FE',
      text: isDark ? '#C7D2FE' : '#4338CA',
      icon: 'cloud-upload-outline' as const,
      label: 'সিঙ্কের অপেক্ষায়',
      subtext: `${MoneyUtil.toBengaliNumber(pendingCount)} টি নতুন এন্ট্রি`,
    };
  };

  const cfg = getBannerConfig();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={cfg.text} style={{ marginRight: 8 }} />
        ) : (
          <Ionicons name={cfg.icon} size={18} color={cfg.text} style={{ marginRight: 8 }} />
        )}
        <BengaliText variant="caption" color={cfg.text} weight="700">
          {cfg.label}
        </BengaliText>
        {cfg.subtext ? (
          <BengaliText
            variant="caption"
            color={cfg.text}
            style={{ marginLeft: 6 }}
          >
            {cfg.subtext}
          </BengaliText>
        ) : null}
      </View>

      {!isOffline && !isSyncing && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSyncNow}
          style={[styles.syncBtn, { backgroundColor: cfg.text }]}
        >
          <BengaliText variant="caption" color="#FFFFFF" weight="700" style={{ fontSize: 11 }}>
            এখনই সিঙ্ক
          </BengaliText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
});
