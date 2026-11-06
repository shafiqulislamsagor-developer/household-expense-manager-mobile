import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { SyncEngine } from '../../sync/syncEngine';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../context/ToastContext';

export interface SyncStatusIndicatorProps {
  style?: ViewStyle;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ style }) => {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { status, pendingCount } = useSelector((state: RootState) => state.sync);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'SYNCING') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [status, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSyncPress = async () => {
    if (status === 'SYNCING') return;

    try {
      showToast({ type: 'info', message: 'সার্ভারের সাথে সিঙ্ক শুরু হয়েছে...' });
      await SyncEngine.syncNow();
      showToast({ type: 'success', message: 'ডেটা সফলভাবে সিঙ্ক হয়েছে।' });
    } catch {
      showToast({ type: 'error', message: 'সিঙ্ক সম্পন্ন করা যায়নি। নেটওয়ার্ক পরীক্ষা করুন।' });
    }
  };

  const isOnline = status !== 'OFFLINE';
  const isSyncing = status === 'SYNCING';
  const hasPending = pendingCount > 0;

  const bg = !isOnline
    ? isDark ? '#DC262625' : '#FEF2F2'
    : isSyncing
    ? isDark ? '#0284C725' : '#E0F2FE'
    : hasPending
    ? isDark ? '#D9770625' : '#FEF3C7'
    : isDark ? '#05966925' : '#ECFDF5';

  const borderColor = !isOnline
    ? colors.danger
    : isSyncing
    ? '#0284C7'
    : hasPending
    ? colors.warning
    : colors.success;

  const textColor = !isOnline
    ? colors.danger
    : isSyncing
    ? '#0284C7'
    : hasPending
    ? colors.warning
    : colors.success;

  const iconName: any = !isOnline
    ? 'cloud-offline-outline'
    : isSyncing
    ? 'sync'
    : hasPending
    ? 'cloud-upload-outline'
    : 'cloud-done-outline';

  const statusText = !isOnline
    ? 'অফলাইন'
    : isSyncing
    ? 'সিঙ্ক হচ্ছে...'
    : hasPending
    ? `${pendingCount}টি বাকি`
    : 'সিঙ্কড';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleSyncPress}
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: borderColor,
        },
        style,
      ]}
    >
      {isSyncing ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name={iconName} size={14} color={textColor} />
        </Animated.View>
      ) : (
        <Ionicons name={iconName} size={14} color={textColor} />
      )}

      <BengaliText
        variant="caption"
        color={textColor}
        weight="600"
        style={styles.label}
      >
        {statusText}
      </BengaliText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    marginLeft: 5,
    fontSize: 12,
  },
});
