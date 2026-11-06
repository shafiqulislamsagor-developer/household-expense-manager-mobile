import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.surfaceSubdued : colors.border,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.skeletonRow}>
        <LoadingSkeleton width={90} height={14} />
        <LoadingSkeleton width={32} height={32} borderRadius={16} />
      </View>
      <LoadingSkeleton width={140} height={26} style={{ marginVertical: 10 }} />
      <LoadingSkeleton width={110} height={12} />
    </View>
  );
};

export const TransactionSkeleton: React.FC = () => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.txContainer,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
      ]}
    >
      <LoadingSkeleton width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <LoadingSkeleton width="70%" height={15} style={{ marginBottom: 6 }} />
        <LoadingSkeleton width="40%" height={12} />
      </View>
      <LoadingSkeleton width={70} height={18} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {},
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginVertical: 6,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
});
